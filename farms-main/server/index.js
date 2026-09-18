import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';
import { createAssignment, nextCandidate, rankPartners } from './assignment.js';
import { authConfigured, getAuthenticatedUser, getDeliveryPartnerApplication, getProfile, inviteCustomerCare, listDeliveryPartnerApplications, listEligibleDeliveryPartners, listStaffProfiles, requireDeliveryApplicationAccess, requireProfile, submitDeliveryPartnerApplication, updateDeliveryPartnerState, updateStaffProfile } from './auth.js';
import { analyzeDemand } from './demand-radar.js';
import { createMongoStore } from './mongo-store.js';
import { createPaymentOrder, markDevelopmentPayment, paymentConfigured, verifyPayment } from './payment.js';
import { createSupabaseStore } from './supabase-store.js';

const app = express();
const server = http.createServer(app);
const websocketServer = new WebSocketServer({ server, path: '/ws' });
const port = Number(process.env.PORT || process.env.DELIVERY_PORT || 8787);
const radiusKm = Number(process.env.DELIVERY_RADIUS_KM || 15);
const responseTimeoutMs = Number(process.env.PARTNER_RESPONSE_TIMEOUT_MS || 60000);
const assignments = new Map();
const orders = new Map();
const timers = new Map();
const uploadChallenges = new Map();
const uploadTokens = new Map();
const dataStore = createSupabaseStore() || await createMongoStore();

const partners = [
  { id: 'anil-kumar', name: 'Anil Kumar', vehicle: 'Bike', capacityKg: 20, rating: 4.8, activeOrders: 1, available: true, averageSpeedKph: 28, location: { lat: 17.385, lng: 78.4867 } },
  { id: 'meena-logistics', name: 'Meena Logistics', vehicle: 'Auto', capacityKg: 300, rating: 4.6, activeOrders: 2, available: true, averageSpeedKph: 24, location: { lat: 17.42, lng: 78.45 } },
  { id: 'greenroute-partner', name: 'GreenRoute Partner', vehicle: 'Mini Truck', capacityKg: 1500, rating: 4.9, activeOrders: 0, available: true, averageSpeedKph: 30, location: { lat: 17.31, lng: 78.52 } },
  { id: 'deccan-truck', name: 'Deccan Farm Truck', vehicle: 'Truck', capacityKg: 5000, rating: 4.5, activeOrders: 4, available: true, averageSpeedKph: 32, location: { lat: 17.48, lng: 78.39 } }
];

app.use(express.json({ limit: '8mb' }));
const publicDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const uploadDirectory = path.join(publicDirectory, 'uploads');
app.use(express.static(publicDirectory));
app.use('/uploads', express.static(uploadDirectory));
app.use((request, response, next) => {
  const origin = request.headers.origin;
  const localDevelopmentOrigin = process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost:\d+$/.test(origin || '');
  response.setHeader('Access-Control-Allow-Origin', localDevelopmentOrigin ? origin : (process.env.FRONTEND_ORIGIN || '*'));
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (request.method === 'OPTIONS') return response.sendStatus(204);
  next();
});

function broadcast(message) {
  const payload = JSON.stringify(message);
  websocketServer.clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
}

async function notifyPartner(partner, assignment) {
  broadcast({ type: 'partner_notification', partnerId: partner.id, assignmentId: assignment.id, vehicleRecommendation: assignment.vehicleRecommendation });
  if (!process.env.FIREBASE_PROJECT_ID) return { provider: 'websocket', delivered: true };
  try {
    const firebase = await import('firebase-admin');
    if (!firebase.default.apps.length) firebase.default.initializeApp();
    return { provider: 'firebase', delivered: Boolean(partner.pushToken && await firebase.default.messaging().send({ token: partner.pushToken, data: { assignmentId: assignment.id, type: 'delivery_assignment' } })) };
  } catch (error) {
    return { provider: 'websocket', delivered: false, error: error.message };
  }
}

async function getGoogleTravelTime(origin, destination) {
  if (!process.env.GOOGLE_MAPS_API_KEY) return null;
  const params = new URLSearchParams({ origins: `${origin.lat},${origin.lng}`, destinations: `${destination.lat},${destination.lng}`, key: process.env.GOOGLE_MAPS_API_KEY });
  const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params}`);
  if (!response.ok) return null;
  const payload = await response.json();
  const seconds = payload.rows?.[0]?.elements?.[0]?.duration?.value;
  return Number.isFinite(seconds) ? Math.ceil(seconds / 60) : null;
}

function clearAssignmentTimer(assignmentId) {
  const timer = timers.get(assignmentId);
  if (timer) clearTimeout(timer);
  timers.delete(assignmentId);
}

async function assignCandidate(assignment) {
  const candidate = assignment.candidates[assignment.currentCandidateIndex];
  if (!candidate) {
    assignment.status = 'unassigned';
    broadcast({ type: 'assignment_unassigned', assignment });
    return assignment;
  }
  assignment.assignedPartnerId = candidate.partner.id;
  assignment.status = 'partner_notified';
  assignment.notifiedAt = new Date().toISOString();
  clearAssignmentTimer(assignment.id);
  await notifyPartner(candidate.partner, assignment);
  broadcast({ type: 'assignment_updated', assignment });
  timers.set(assignment.id, setTimeout(async () => {
    const current = assignments.get(assignment.id);
    if (!current || current.status !== 'partner_notified') return;
    const fallback = nextCandidate(current);
    if (!fallback) {
      current.status = 'unassigned';
      broadcast({ type: 'assignment_unassigned', assignment: current, reason: 'response_timeout' });
      return;
    }
    assignments.set(assignment.id, fallback);
    await assignCandidate(fallback);
  }, responseTimeoutMs));
  return assignment;
}

app.get('/health', (request, response) => response.json({ ok: true, service: 'farmdirect-delivery', integrations: { maps: Boolean(process.env.GOOGLE_MAPS_API_KEY), firebase: Boolean(process.env.FIREBASE_PROJECT_ID), mongodb: Boolean(process.env.MONGODB_URI), supabaseAuth: authConfigured() } }));
app.get('/', (request, response) => response.sendFile(path.join(publicDirectory, 'index.html')));
app.get('/api/partners', (request, response) => response.json({ partners, radiusKm }));

app.get('/api/me', async (request, response) => {
  const authentication = await getAuthenticatedUser(request);
  if (authentication.error) return response.status(authentication.status).json({ error: authentication.error });
  const profile = await getProfile(authentication.user.id);
  if (!profile || profile.account_status === 'disabled') return response.status(403).json({ error: 'Your account is disabled or has no profile.' });
  const identity = { user: authentication.user, profile };
  if (identity.error) return response.status(identity.status).json({ error: identity.error });
  response.json({ user: identity.user, profile: identity.profile });
});

app.get('/api/admin/staff', async (request, response) => {
  const identity = await requireProfile(request, ['admin']);
  if (identity.error) return response.status(identity.status).json({ error: identity.error });
  try { response.json({ profiles: await listStaffProfiles() }); } catch (error) { response.status(500).json({ error: error.message }); }
});

app.post('/api/admin/customer-care', async (request, response) => {
  const identity = await requireProfile(request, ['admin']);
  if (identity.error) return response.status(identity.status).json({ error: identity.error });
  const email = String(request.body.email || '').trim().toLowerCase();
  const name = String(request.body.name || '').trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || name.length < 2) return response.status(400).json({ error: 'A valid name and email are required.' });
  try { response.status(201).json({ profile: await inviteCustomerCare({ email, name, approvedBy: identity.user.id }) }); } catch (error) { response.status(400).json({ error: error.message }); }
});

app.patch('/api/admin/staff/:userId', async (request, response) => {
  const identity = await requireProfile(request, ['admin']);
  if (identity.error) return response.status(identity.status).json({ error: identity.error });
  try { response.json({ profile: await updateStaffProfile(request.params.userId, request.body, identity.user.id) }); } catch (error) { response.status(400).json({ error: error.message }); }
});

app.get('/api/admin/delivery-partners', async (request, response) => {
  const identity = await requireProfile(request, ['admin']);
  if (identity.error) return response.status(identity.status).json({ error: identity.error });
  try { response.json({ applications: await listDeliveryPartnerApplications() }); } catch (error) { response.status(500).json({ error: error.message }); }
});

app.patch('/api/admin/delivery-partners/:userId', async (request, response) => {
  const identity = await requireProfile(request, ['admin']);
  if (identity.error) return response.status(identity.status).json({ error: identity.error });
  try { response.json({ application: await updateDeliveryPartnerState(request.params.userId, request.body, identity.user.id) }); } catch (error) { response.status(400).json({ error: error.message }); }
});

app.get('/api/delivery-partner/application', async (request, response) => {
  const identity = await requireDeliveryApplicationAccess(request);
  if (identity.error) return response.status(identity.status).json({ error: identity.error });
  try { response.json({ application: await getDeliveryPartnerApplication(identity.user.id) }); } catch (error) { response.status(500).json({ error: error.message }); }
});

app.post('/api/delivery-partner/application', async (request, response) => {
  const identity = await requireDeliveryApplicationAccess(request);
  if (identity.error) return response.status(identity.status).json({ error: identity.error });
  try { response.status(201).json({ application: await submitDeliveryPartnerApplication(identity.user.id, request.body) }); } catch (error) { response.status(400).json({ error: error.message }); }
});

app.patch('/api/delivery-partner/availability', async (request, response) => {
  const identity = await requireProfile(request, ['delivery_partner']);
  if (identity.error) return response.status(identity.status).json({ error: identity.error });
  const application = await getDeliveryPartnerApplication(identity.user.id);
  if (!application || application.verification_status !== 'verified' || application.account_status !== 'active') return response.status(403).json({ error: 'Partner approval is required before changing availability.' });
  const availability = request.body.availability_status;
  if (!['available', 'busy', 'offline'].includes(availability)) return response.status(400).json({ error: 'Invalid availability status.' });
  const { data, error } = await (await import('@supabase/supabase-js')).createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }).from('delivery_partner_profiles').update({ availability_status: availability }).eq('user_id', identity.user.id).select().single();
  if (error) return response.status(400).json({ error: error.message });
  response.json({ application: data });
});

app.patch('/api/delivery-partner/location', async (request, response) => {
  const identity = await requireProfile(request, ['delivery_partner']);
  if (identity.error) return response.status(identity.status).json({ error: identity.error });
  const application = await getDeliveryPartnerApplication(identity.user.id);
  if (!application || application.verification_status !== 'verified' || application.account_status !== 'active' || !application.location_permission) return response.status(403).json({ error: 'Location permission and partner approval are required.' });
  const location = request.body.current_location;
  if (!location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) return response.status(400).json({ error: 'Valid current location is required.' });
  const client = (await import('@supabase/supabase-js')).createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.from('delivery_partner_profiles').update({ current_location: { lat: Number(location.lat), lng: Number(location.lng), updatedAt: new Date().toISOString() } }).eq('user_id', identity.user.id).select().single();
  if (error) return response.status(400).json({ error: error.message });
  response.json({ application: data });
});

app.use('/api/assignments', async (request, response, next) => {
  const identity = await requireProfile(request, ['admin', 'delivery_partner', 'customer_care']);
  if (identity.error) return response.status(identity.status).json({ error: identity.error });
  request.profile = identity.profile;
  next();
});

app.use('/api/orders', async (request, response, next) => {
  const identity = await requireProfile(request, ['admin', 'consumer', 'farmer', 'customer_care']);
  if (identity.error) return response.status(identity.status).json({ error: identity.error });
  request.profile = identity.profile;
  next();
});

app.post('/api/demand-radar', async (request, response) => {
  if (authConfigured() || process.env.NODE_ENV === 'production') {
    const identity = await requireProfile(request, ['admin', 'farmer', 'customer_care']);
    if (identity.error) return response.status(identity.status).json({ error: identity.error });
  }
  const result = analyzeDemand({ query: request.body.query, produce: request.body.produce, orders: request.body.orders });
  response.json(result);
});

app.post('/api/payments/create', async (request, response) => {
  const identity = await requireProfile(request, ['admin', 'consumer', 'farmer', 'customer_care']);
  if (identity.error) return response.status(identity.status).json({ error: identity.error });
  try {
    const payment = await createPaymentOrder({ amount: request.body.amount, receipt: request.body.receipt });
    response.status(201).json({ ...payment, keyId: process.env.RAZORPAY_KEY_ID || null, providerConfigured: paymentConfigured() });
  } catch (error) {
    response.status(503).json({ error: error.message });
  }
});

app.post('/api/payments/verify', async (request, response) => {
  const identity = await requireProfile(request, ['admin', 'consumer', 'farmer', 'customer_care']);
  if (identity.error) return response.status(identity.status).json({ error: identity.error });
  const { orderId, paymentId, signature } = request.body;
  const valid = paymentId?.startsWith('dev_payment_') ? markDevelopmentPayment({ orderId }) : verifyPayment({ orderId, paymentId, signature });
  if (!valid) return response.status(400).json({ error: 'Payment could not be verified.' });
  response.json({ verified: true, paymentId });
});

function normalizePhone(phone) {
  return String(phone || '').replace(/[\s()-]/g, '');
}

function hashCode(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function sendWhatsAppOtp(phone, otp) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_OTP === 'true') return { provider: 'development', devOtp: otp };
    throw new Error('WhatsApp OTP provider is not configured');
  }
  const body = new URLSearchParams({ To: `whatsapp:${phone}`, From: `whatsapp:${TWILIO_WHATSAPP_FROM}`, Body: `FarmDirect verification code: ${otp}. It expires in 10 minutes.` });
  const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const result = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!result.ok) throw new Error(`WhatsApp provider returned ${result.status}`);
  return { provider: 'twilio' };
}

app.post('/api/upload-verification/request', async (request, response) => {
  const phone = normalizePhone(request.body.phone);
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return response.status(400).json({ error: 'Use an international phone number, for example +919876543210.' });
  const challengeId = crypto.randomUUID();
  const otp = String(crypto.randomInt(100000, 1000000));
  try {
    const delivery = await sendWhatsAppOtp(phone, otp);
    uploadChallenges.set(challengeId, { phone, codeHash: hashCode(otp), expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 });
    response.json({ challengeId, provider: delivery.provider, ...(delivery.devOtp ? { devOtp: delivery.devOtp } : {}) });
  } catch (error) {
    response.status(503).json({ error: error.message });
  }
});

app.post('/api/upload-verification/verify', (request, response) => {
  const challenge = uploadChallenges.get(request.body.challengeId);
  const code = String(request.body.code || '');
  if (!challenge || challenge.expiresAt < Date.now() || challenge.attempts >= 5) return response.status(401).json({ error: 'This verification request has expired. Request a new code.' });
  challenge.attempts += 1;
  if (!/^\d{6}$/.test(code) || hashCode(code) !== challenge.codeHash) return response.status(401).json({ error: 'That WhatsApp code is not correct.' });
  const verificationToken = crypto.randomUUID();
  uploadTokens.set(verificationToken, { phone: challenge.phone, expiresAt: Date.now() + 10 * 60 * 1000 });
  uploadChallenges.delete(request.body.challengeId);
  response.json({ verificationToken });
});

app.post('/api/uploads', async (request, response) => {
  const verification = uploadTokens.get(request.body.verificationToken);
  if (!verification || verification.expiresAt < Date.now()) return response.status(401).json({ error: 'Verify your WhatsApp number before uploading.' });
  const match = String(request.body.imageData || '').match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return response.status(400).json({ error: 'Upload a JPEG, PNG, WEBP, or GIF image.' });
  const image = Buffer.from(match[2], 'base64');
  if (image.length > 5 * 1024 * 1024) return response.status(413).json({ error: 'Image must be smaller than 5 MB.' });
  await fs.mkdir(uploadDirectory, { recursive: true });
  const extension = match[1].split('/')[1].replace('jpeg', 'jpg');
  const fileName = `${crypto.randomUUID()}.${extension}`;
  await fs.writeFile(path.join(uploadDirectory, fileName), image);
  uploadTokens.delete(request.body.verificationToken);
  response.status(201).json({ url: `/uploads/${fileName}` });
});

app.post('/api/orders/:orderId/confirm', async (request, response) => {
  const identity = await requireProfile(request, ['admin', 'consumer', 'farmer', 'customer_care']);
  if (identity.error) return response.status(identity.status).json({ error: identity.error });
  const order = { ...request.body, id: request.params.orderId, weightKg: Number(request.body.weightKg ?? request.body.quantity ?? 0) };
  if (!order.pickup || !order.dropoff) return response.status(400).json({ error: 'pickup and dropoff coordinates are required' });
  const eligiblePartners = await listEligibleDeliveryPartners();
  const assignment = createAssignment({ order, partners: eligiblePartners, radiusKm });
  assignment.pickupVerification = { otp: String(Math.floor(100000 + Math.random() * 900000)), verified: false };
  assignment.deliveryVerification = { otp: String(Math.floor(100000 + Math.random() * 900000)), verified: false };
  assignment.payment = { status: 'held', releasedAt: null };
  orders.set(order.id, order);
  assignments.set(assignment.id, assignment);
  await dataStore?.saveOrder(order);
  await dataStore?.saveAssignment(assignment);
  await assignCandidate(assignment);
  response.status(201).json({ order, assignment, mapsProvider: process.env.GOOGLE_MAPS_API_KEY ? 'google_maps' : 'haversine_fallback' });
});

app.post('/api/assignments/:assignmentId/respond', async (request, response) => {
  const assignment = assignments.get(request.params.assignmentId);
  if (!assignment) return response.status(404).json({ error: 'assignment not found' });
  const { partnerId, response: partnerResponse } = request.body;
  if (request.profile.role !== 'admin' && request.profile.user_id !== assignment.assignedPartnerId) return response.status(403).json({ error: 'Only the assigned delivery partner can respond.' });
  if (assignment.assignedPartnerId !== partnerId) return response.status(409).json({ error: 'partner is not the current candidate' });
  if (request.profile.role === 'delivery_partner') {
    const partnerApplication = await getDeliveryPartnerApplication(request.profile.user_id);
    if (!partnerApplication || partnerApplication.verification_status !== 'verified' || partnerApplication.account_status !== 'active' || partnerApplication.availability_status !== 'available') return response.status(403).json({ error: 'Partner is not currently eligible for delivery acceptance.' });
  }
  clearAssignmentTimer(assignment.id);
  if (partnerResponse === 'accept') {
    assignment.status = 'accepted';
    assignment.acceptedAt = new Date().toISOString();
    await dataStore?.saveAssignment(assignment);
    broadcast({ type: 'assignment_accepted', assignment });
    return response.json(assignment);
  }
  const fallback = nextCandidate(assignment);
  if (!fallback) {
    assignment.status = 'unassigned';
    broadcast({ type: 'assignment_unassigned', assignment, reason: 'partner_declined' });
    return response.json(assignment);
  }
  assignments.set(assignment.id, fallback);
  await dataStore?.saveAssignment(fallback);
  await assignCandidate(fallback);
  response.json(fallback);
});

app.get('/api/assignments/:assignmentId', (request, response) => {
  const assignment = assignments.get(request.params.assignmentId);
  if (!assignment) return response.status(404).json({ error: 'assignment not found' });
  response.json(assignment);
});

app.post('/api/assignments/:assignmentId/location', (request, response) => {
  const assignment = assignments.get(request.params.assignmentId);
  if (!assignment) return response.status(404).json({ error: 'assignment not found' });
  assignment.liveLocation = { ...request.body, updatedAt: new Date().toISOString() };
  broadcast({ type: 'location_updated', assignmentId: assignment.id, location: assignment.liveLocation });
  response.json(assignment.liveLocation);
});

app.get('/api/assignments/:assignmentId/eta', async (request, response) => {
  const assignment = assignments.get(request.params.assignmentId);
  if (!assignment) return response.status(404).json({ error: 'assignment not found' });
  const candidate = assignment.candidates[assignment.currentCandidateIndex];
  const googleMinutes = candidate ? await getGoogleTravelTime(candidate.partner.location, orders.get(assignment.orderId)?.dropoff) : null;
  const etaMinutes = googleMinutes || candidate?.travelTimeMinutes || null;
  assignment.eta = { minutes: etaMinutes, updatedAt: new Date().toISOString(), provider: googleMinutes ? 'google_maps' : 'estimated' };
  broadcast({ type: 'eta_updated', assignmentId: assignment.id, eta: assignment.eta });
  response.json(assignment.eta);
});

function verifyStep(assignment, step, code, qrToken) {
  const verification = assignment[step];
  const valid = (code && code === verification.otp) || (qrToken && qrToken === verification.qrToken);
  if (valid) verification.verified = true;
  return valid;
}

app.post('/api/assignments/:assignmentId/pickup/verify', (request, response) => {
  const assignment = assignments.get(request.params.assignmentId);
  if (!assignment) return response.status(404).json({ error: 'assignment not found' });
  if (request.profile.role !== 'admin' && request.profile.user_id !== assignment.assignedPartnerId) return response.status(403).json({ error: 'Only the assigned delivery partner can verify pickup.' });
  assignment.pickupVerification.qrToken ||= crypto.randomUUID();
  if (!verifyStep(assignment, 'pickupVerification', request.body.otp, request.body.qrToken)) return response.status(401).json({ error: 'invalid pickup OTP or QR token' });
  assignment.status = 'in_transit';
  broadcast({ type: 'pickup_verified', assignment });
  response.json(assignment);
});

app.post('/api/assignments/:assignmentId/delivery/verify', (request, response) => {
  const assignment = assignments.get(request.params.assignmentId);
  if (!assignment) return response.status(404).json({ error: 'assignment not found' });
  if (request.profile.role !== 'admin' && request.profile.user_id !== assignment.assignedPartnerId) return response.status(403).json({ error: 'Only the assigned delivery partner can verify delivery.' });
  assignment.deliveryVerification.qrToken ||= crypto.randomUUID();
  if (!verifyStep(assignment, 'deliveryVerification', request.body.otp, request.body.qrToken)) return response.status(401).json({ error: 'invalid delivery OTP or QR token' });
  assignment.status = 'delivered';
  assignment.payment.status = 'released';
  assignment.payment.releasedAt = new Date().toISOString();
  broadcast({ type: 'delivery_confirmed', assignment, payment: assignment.payment });
  response.json(assignment);
});

websocketServer.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'connected', service: 'farmdirect-delivery' }));
});

server.listen(port, () => console.log(`FarmDirect delivery service listening on http://localhost:${port}`));

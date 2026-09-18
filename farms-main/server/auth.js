import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminClient = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

export function authConfigured() {
  return Boolean(adminClient);
}

function bearerToken(request) {
  const header = request.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

export async function getAuthenticatedUser(request) {
  if (!adminClient) return { error: 'Supabase authentication is not configured', status: 503 };
  const token = bearerToken(request);
  if (!token) return { error: 'Authentication required', status: 401 };
  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user) return { error: 'Invalid or expired authentication token', status: 401 };
  return { user: data.user };
}

export async function getProfile(userId) {
  if (!adminClient) throw new Error('Supabase authentication is not configured');
  const { data, error } = await adminClient.from('profiles').select('user_id,name,email,role,account_status,approved_by,created_at').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function requireProfile(request, roles = []) {
  const authentication = await getAuthenticatedUser(request);
  if (authentication.error) return authentication;
  const profile = await getProfile(authentication.user.id);
  if (!profile || profile.account_status !== 'approved') return { error: 'Your account is not approved or is disabled', status: 403 };
  if (roles.length && !roles.includes(profile.role)) return { error: 'You are not authorized for this resource', status: 403 };
  return { user: authentication.user, profile };
}

export async function requireDeliveryApplicationAccess(request) {
  const authentication = await getAuthenticatedUser(request);
  if (authentication.error) return authentication;
  const profile = await getProfile(authentication.user.id);
  if (!profile || profile.role !== 'delivery_partner' || profile.account_status === 'disabled') return { error: 'Delivery partner application access is not available for this account', status: 403 };
  return { user: authentication.user, profile };
}

export async function inviteCustomerCare({ email, name, approvedBy }) {
  if (!adminClient) throw new Error('Supabase authentication is not configured');
  const { data: invitation, error: invitationError } = await adminClient.auth.admin.inviteUserByEmail(email, { data: { name } });
  if (invitationError) throw invitationError;
  const { data, error } = await adminClient.from('profiles').upsert({ user_id: invitation.user.id, name, email: email.toLowerCase(), role: 'customer_care', account_status: 'pending', approved_by: approvedBy }, { onConflict: 'user_id' }).select().single();
  if (error) throw error;
  return data;
}

export async function updateStaffProfile(userId, changes, approvedBy) {
  if (!adminClient) throw new Error('Supabase authentication is not configured');
  const allowed = {};
  if (changes.account_status) allowed.account_status = changes.account_status;
  if (changes.role && ['customer_care', 'farmer', 'delivery_partner'].includes(changes.role)) allowed.role = changes.role;
  if (!Object.keys(allowed).length) throw new Error('No supported profile changes supplied');
  allowed.approved_by = approvedBy;
  const { data, error } = await adminClient.from('profiles').update(allowed).eq('user_id', userId).neq('role', 'admin').select().single();
  if (error) throw error;
  return data;
}

export async function listStaffProfiles() {
  if (!adminClient) throw new Error('Supabase authentication is not configured');
  const { data, error } = await adminClient.from('profiles').select('user_id,name,email,role,account_status,approved_by,created_at').in('role', ['customer_care', 'farmer', 'delivery_partner']).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getDeliveryPartnerApplication(userId) {
  if (!adminClient) throw new Error('Supabase authentication is not configured');
  const { data, error } = await adminClient.from('delivery_partner_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function submitDeliveryPartnerApplication(userId, application) {
  if (!adminClient) throw new Error('Supabase authentication is not configured');
  const payload = {
    user_id: userId,
    full_name: String(application.full_name || '').trim(),
    mobile_number: String(application.mobile_number || '').trim(),
    email: String(application.email || '').trim().toLowerCase(),
    operating_location: String(application.operating_location || '').trim(),
    service_area: String(application.service_area || '').trim(),
    vehicle_type: application.vehicle_type,
    vehicle_number: String(application.vehicle_number || '').trim().toUpperCase(),
    government_id_type: String(application.government_id_type || '').trim(),
    government_id_last4: String(application.government_id_last4 || '').trim(),
    verification_documents: Array.isArray(application.verification_documents) ? application.verification_documents : [],
    location_permission: application.location_permission === true
  };
  if (!payload.full_name || !/^\+?[1-9]\d{7,14}$/.test(payload.mobile_number.replace(/[\s()-]/g, '')) || !payload.operating_location || !payload.service_area || !['Bike', 'Auto', 'Mini Truck', 'Truck'].includes(payload.vehicle_type) || !payload.vehicle_number || !payload.government_id_type || !/^\w{4}$/.test(payload.government_id_last4)) throw new Error('Complete all required partner details with a valid mobile number and ID last four digits.');
  const { data, error } = await adminClient.from('delivery_partner_profiles').upsert(payload, { onConflict: 'user_id' }).select().single();
  if (error) throw error;
  return data;
}

export async function updateDeliveryPartnerState(userId, changes, approvedBy) {
  if (!adminClient) throw new Error('Supabase authentication is not configured');
  const allowed = {};
  if (changes.verification_status && ['verified', 'rejected'].includes(changes.verification_status)) allowed.verification_status = changes.verification_status;
  if (changes.account_status && ['active', 'suspended'].includes(changes.account_status)) allowed.account_status = changes.account_status;
  if (changes.rejection_reason !== undefined) allowed.rejection_reason = String(changes.rejection_reason || '').trim();
  if (allowed.verification_status === 'verified') { allowed.account_status = 'active'; allowed.approved_by = approvedBy; allowed.approved_at = new Date().toISOString(); allowed.rejection_reason = null; }
  if (allowed.verification_status === 'rejected') { allowed.account_status = 'suspended'; allowed.approved_by = approvedBy; allowed.approved_at = null; }
  if (!Object.keys(allowed).length) throw new Error('No supported partner review changes supplied');
  const { data, error } = await adminClient.from('delivery_partner_profiles').update(allowed).eq('user_id', userId).select().single();
  if (error) throw error;
  const profileStatus = allowed.verification_status === 'verified' ? 'approved' : allowed.verification_status === 'rejected' ? 'disabled' : undefined;
  if (profileStatus) {
    const { error: profileError } = await adminClient.from('profiles').update({ account_status: profileStatus, approved_by: approvedBy }).eq('user_id', userId).eq('role', 'delivery_partner');
    if (profileError) throw profileError;
  }
  return data;
}

export async function listDeliveryPartnerApplications() {
  if (!adminClient) throw new Error('Supabase authentication is not configured');
  const { data, error } = await adminClient.from('delivery_partner_profiles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function listEligibleDeliveryPartners() {
  if (!adminClient) return [];
  const { data, error } = await adminClient.from('delivery_partner_profiles').select('*').eq('verification_status', 'verified').eq('account_status', 'active').eq('availability_status', 'available');
  if (error) throw error;
  return data.map((partner) => ({ id: partner.user_id, name: partner.full_name, vehicle: partner.vehicle_type, capacityKg: ({ Bike: 20, Auto: 300, 'Mini Truck': 1500, Truck: 5000 })[partner.vehicle_type], rating: 5, activeOrders: partner.active_order_count, available: true, serviceArea: partner.service_area, averageSpeedKph: 25, location: partner.current_location || null }));
}

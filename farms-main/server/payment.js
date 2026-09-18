import crypto from 'node:crypto';

const razorpayBaseUrl = 'https://api.razorpay.com/v1';
const paymentOrders = new Map();

export function paymentConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export async function createPaymentOrder({ amount, receipt }) {
  const amountPaise = Math.round(Number(amount) * 100);
  if (!Number.isFinite(amountPaise) || amountPaise < 100) throw new Error('Payment amount must be at least ₹1.');
  if (!paymentConfigured()) {
    if (process.env.NODE_ENV === 'production') throw new Error('Razorpay is not configured');
    const id = `dev_${crypto.randomUUID()}`;
    paymentOrders.set(id, { id, amount: amountPaise, status: 'created' });
    return { id, amount: amountPaise, currency: 'INR', mode: 'development' };
  }
  const credentials = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const response = await fetch(`${razorpayBaseUrl}/orders`, { method: 'POST', headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt: String(receipt).slice(0, 40), payment_capture: 1 }) });
  if (!response.ok) throw new Error(`Payment provider returned ${response.status}`);
  const order = await response.json();
  paymentOrders.set(order.id, order);
  return { id: order.id, amount: order.amount, currency: order.currency, mode: 'razorpay' };
}

export function verifyPayment({ orderId, paymentId, signature }) {
  const order = paymentOrders.get(orderId);
  if (!order || order.status === 'paid') return false;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'development-only-secret').update(`${orderId}|${paymentId}`).digest('hex');
  const received = Buffer.from(String(signature || ''));
  if (received.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), received)) return false;
  order.status = 'paid';
  order.paymentId = paymentId;
  order.verifiedAt = new Date().toISOString();
  return true;
}

export function markDevelopmentPayment({ orderId }) {
  if (process.env.NODE_ENV === 'production') return false;
  const order = paymentOrders.get(orderId);
  if (!order || !orderId.startsWith('dev_')) return false;
  order.status = 'paid';
  order.paymentId = `dev_payment_${crypto.randomUUID()}`;
  order.verifiedAt = new Date().toISOString();
  return true;
}

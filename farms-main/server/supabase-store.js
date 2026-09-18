import { createClient } from '@supabase/supabase-js';

export function createSupabaseStore(url = process.env.SUPABASE_URL, serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY) {
  if (!url || !serviceRoleKey) return null;
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    async saveOrder(order) {
      const { error } = await client.from('orders').upsert({ id: String(order.id), payload: order, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    async saveAssignment(assignment) {
      const { error } = await client.from('delivery_assignments').upsert({ id: assignment.id, order_id: String(assignment.orderId), status: assignment.status, payload: assignment, updated_at: new Date().toISOString() });
      if (error) throw error;
    }
  };
}

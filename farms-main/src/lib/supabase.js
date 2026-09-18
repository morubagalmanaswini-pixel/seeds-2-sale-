import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function createClient() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Missing Vite Supabase public environment variables.');
  }

  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}

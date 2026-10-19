import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

/**
 * Supabase Admin Client
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass Row Level Security when administrative tasks are required.
 * WARNING: NEVER use this on the client side or expose to browser bundles!
 */
export function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are required');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

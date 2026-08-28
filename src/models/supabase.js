import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/env.js';

export const supabase = createClient(
  config.supabase.url,
  config.supabase.publishableKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export function getSupabaseAdmin() {
  const secret = config.supabase.secretKey;
  if (!secret) return null;
  return createClient(config.supabase.url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
}

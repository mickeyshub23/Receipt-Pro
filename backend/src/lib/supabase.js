import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

let _admin = null;

export function getSupabase() {
  if (!_admin) {
    _admin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _admin;
}

export const supabase = getSupabase();
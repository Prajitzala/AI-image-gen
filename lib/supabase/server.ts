import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

export function createServerClient(): SupabaseClient | null {
  if (!config.supabaseEnabled) {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('Supabase URL or key not found');
    return null;
  }

  return createClient(url, key);
}


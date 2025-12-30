import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!config.supabaseEnabled) {
    return null;
  }

  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      console.warn('Supabase URL or key not found');
      return null;
    }

    supabaseInstance = createClient(url, key);
  }

  return supabaseInstance;
}


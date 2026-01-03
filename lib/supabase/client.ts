import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

export function getSupabaseClient() {
  if (!config.supabaseEnabled) {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Validate URL and key are present
  if (!url || !key || url.trim() === '' || key.trim() === '') {
    console.warn('Supabase URL or key not found');
    return null;
  }

  // Validate URL is a valid HTTP/HTTPS URL
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      console.warn('Invalid Supabase URL protocol. Must be HTTP or HTTPS.');
      return null;
    }
  } catch (error) {
    console.warn('Invalid Supabase URL format:', error);
    return null;
  }

  return createClient(url, key);
}


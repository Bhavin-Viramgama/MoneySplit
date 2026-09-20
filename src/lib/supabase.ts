import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. ' +
    'Copy .env.example to .env and fill in your Supabase URL and anon key.'
  );
}

/**
 * Supabase client singleton.
 *
 * Uses only the publishable anon key — safe for browser use.
 * RLS policies enforce authorization. Never use the service-role key here.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseKey && supabaseUrl.startsWith('http') && !supabaseUrl.includes('your-project-id'));
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

if (isSupabaseConfigured()) {
  console.log(`⚡ [SUPABASE] Connected to Supabase Project: ${supabaseUrl}`);
} else {
  console.log(`ℹ️ [DATABASE] Running on local SQLite database (Set SUPABASE_URL & SUPABASE_KEY to connect to Supabase)`);
}

export default supabase;

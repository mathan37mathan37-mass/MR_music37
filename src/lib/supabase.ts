import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const placeholderPattern = /^(YOUR_|your_|example|test|dummy|changeme|placeholder|undefined)/i;

const hasValidEnvValue = (value: string | undefined): boolean => {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && !placeholderPattern.test(trimmed);
};

export const isSupabaseConfigured = (): boolean => {
  return hasValidEnvValue(supabaseUrl) && hasValidEnvValue(supabaseAnonKey);
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

if (isSupabaseConfigured()) {
  console.info('✅ Supabase initialized successfully');
} else {
  console.info(
    'ℹ️ Supabase credentials not provided. Running in demo/Firebase mode. ' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env to enable Supabase.'
  );
}

export type { SupabaseClient };


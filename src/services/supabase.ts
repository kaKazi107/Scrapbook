import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/config/env';

/**
 * Shared Supabase client.
 *
 * `null` when the project has not been configured yet, so callers can fall back
 * to local-only mode instead of crashing on an empty URL.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Native apps don't have a URL to parse the session from.
        detectSessionInUrl: false,
      },
    })
  : null;

export { isSupabaseConfigured };

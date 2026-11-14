/**
 * Centralised environment configuration.
 *
 * Expo inlines `EXPO_PUBLIC_*` variables at build time. Add them to a local
 * `.env.local` file (git-ignored) for development:
 *
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
 *
 * Until those are provided the app runs in purely local-only mode; cloud
 * features (auth + sync + uploads) stay disabled instead of crashing.
 */

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured =
  SUPABASE_URL.trim().length > 0 && SUPABASE_ANON_KEY.trim().length > 0;

if (!isSupabaseConfigured) {
  console.warn(
    '[env] Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.local to enable cloud sync.'
  );
}

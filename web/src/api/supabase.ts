/**
 * Supabase client used ONLY by http.ts, and only for authentication
 * (sign up, log in, password reset, session/JWT).
 *
 * All application data (profile, conversations, settings) still goes through
 * the FastAPI backend, which verifies the Supabase JWT we send as a Bearer
 * token. See BACKEND-CONTRACT.md -> "Authentication".
 *
 * The anon key is public by design. Row-level security on the database is
 * what protects data, not secrecy of this key.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from './types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** null when the env vars are not set (e.g. running the mock). */
export const supabase: SupabaseClient | null =
  url && anonKey && !url.includes('your-project-ref') ? createClient(url, anonKey) : null;

/** Throws a clear error instead of a confusing "cannot read property of null". */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new ApiError(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.',
      0,
      'config',
    );
  }
  return supabase;
}

/** The current access token (JWT) or null when logged out. */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

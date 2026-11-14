import type { Session, User } from '@supabase/supabase-js';

import { supabase, isSupabaseConfigured } from '@/services/supabase';

export interface AuthResult {
  session: Session | null;
  user: User | null;
  error: string | null;
  needsEmailConfirmation?: boolean;
}

function friendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }
  if (lower.includes('user already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('password should be at least')) {
    return 'Password is too short (use at least 6 characters).';
  }
  if (lower.includes('invalid email')) {
    return 'That email address looks invalid.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before signing in. Check your inbox.';
  }
  return message;
}

export function isCloudEnabled(): boolean {
  return isSupabaseConfigured && supabase !== null;
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!supabase) {
    return { session: null, user: null, error: 'Cloud is not configured.' };
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { session: null, user: null, error: friendlyError(error.message) };
  }

  // Supabase returns a user but no session when email confirmation is required.
  const needsEmailConfirmation = !!data.user && !data.session;

  return {
    session: data.session,
    user: data.user,
    error: null,
    needsEmailConfirmation,
  };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!supabase) {
    return { session: null, user: null, error: 'Cloud is not configured.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { session: null, user: null, error: friendlyError(error.message) };
  }

  return { session: data.session, user: data.user, error: null };
}

export async function signOut(): Promise<{ error: string | null }> {
  if (!supabase) return { error: null };

  const { error } = await supabase.auth.signOut();
  return { error: error ? friendlyError(error.message) : null };
}

export async function getCurrentSession(): Promise<Session | null> {
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  return data.session;
}

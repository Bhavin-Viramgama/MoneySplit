import type { AuthError, Session, User } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import { buildSyntheticEmail } from '../../../lib/constants';

/**
 * Auth service — encapsulates all Supabase Auth interactions.
 *
 * Key design decisions:
 * - Synthetic email constructed from username (never exposed to UI)
 * - Error messages are generic (prevent enumeration)
 * - No service-role key usage
 */

/** Friendly error messages mapped from Supabase Auth errors */
function mapAuthError(error: AuthError): string {
  const message = error.message.toLowerCase();

  // Login errors — always generic to prevent enumeration
  if (message.includes('invalid login credentials')) {
    return 'Invalid username or password. Please try again.';
  }

  // Registration: username taken (Supabase says "User already registered" when
  // email confirmation is disabled and the synthetic email already exists)
  if (message.includes('user already registered')) {
    return 'This username is already taken. Please choose a different one.';
  }

  // Rate limiting
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  // Weak password
  if (message.includes('password')) {
    return 'Password does not meet requirements. Please use a stronger password.';
  }

  // Network / generic
  if (message.includes('network') || message.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Fallback — never expose raw Supabase error messages
  return 'Something went wrong. Please try again.';
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: string | null;
}

/**
 * Register a new user with username and password.
 *
 * - Normalizes username → constructs synthetic email
 * - Passes username in user_metadata for the database trigger
 * - Never exposes the synthetic email to the caller
 */
export async function signUp(
  username: string,
  password: string
): Promise<AuthResult> {
  const originalUsername = username.trim();
  const normalizedUsername = originalUsername.toLowerCase();
  const syntheticEmail = buildSyntheticEmail(normalizedUsername);

  const { data, error } = await supabase.auth.signUp({
    email: syntheticEmail,
    password,
    options: {
      data: {
        username: originalUsername,
      },
    },
  });

  if (error) {
    return { user: null, session: null, error: mapAuthError(error) };
  }

  return {
    user: data.user,
    session: data.session,
    error: null,
  };
}

/**
 * Sign in an existing user with username and password.
 *
 * - Constructs synthetic email from username
 * - Returns generic error for any failure (no enumeration)
 */
export async function signIn(
  username: string,
  password: string
): Promise<AuthResult> {
  const normalizedUsername = username.toLowerCase().trim();
  const syntheticEmail = buildSyntheticEmail(normalizedUsername);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password,
  });

  if (error) {
    return { user: null, session: null, error: mapAuthError(error) };
  }

  return {
    user: data.user,
    session: data.session,
    error: null,
  };
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: mapAuthError(error) };
  }
  return { error: null };
}

/**
 * Get the current session.
 */
export async function getSession(): Promise<{
  session: Session | null;
  error: string | null;
}> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return { session: null, error: mapAuthError(error) };
  }
  return { session: data.session, error: null };
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);

  return () => subscription.unsubscribe();
}

/**
 * Fetch the public profile for a user.
 */
export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Failed to fetch profile:', error.message);
    return null;
  }

  return data;
}

/**
 * Update the public profile for a user.
 */
export async function updateProfile(userId: string, updates: { username?: string }) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

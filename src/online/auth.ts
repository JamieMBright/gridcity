// Accounts: email + password is the primary flow (sign up / sign in /
// forgot-password), with the one-time-code / magic-link path kept as a
// fallback. Username is the public leaderboard identity. Guest play needs
// none of this.

import { supabase } from './supabase';

export interface OnlineUser {
  id: string;
  email: string;
  username: string | undefined;
}

/** Sentinel returned by signUpWithPassword when the Supabase project
 *  requires email confirmation before a session exists. The UI shows a
 *  "check your email to confirm" message rather than treating it as an
 *  error. */
export const CONFIRM_EMAIL = 'confirm-email';

export async function currentUser(): Promise<OnlineUser | undefined> {
  const sb = supabase();
  if (!sb) return undefined;
  const { data } = await sb.auth.getSession();
  const user = data.session?.user;
  if (!user) return undefined;
  const { data: profile } = await sb
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();
  return { id: user.id, email: user.email ?? '', username: profile?.username as string | undefined };
}

/** Email a one-time code / magic link. */
export async function requestCode(email: string): Promise<string | undefined> {
  const sb = supabase();
  if (!sb) return 'online play is not configured';
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
  });
  return error?.message;
}

export async function verifyCode(email: string, token: string): Promise<string | undefined> {
  const sb = supabase();
  if (!sb) return 'online play is not configured';
  const { error } = await sb.auth.verifyOtp({ email, token: token.trim(), type: 'email' });
  return error?.message;
}

/** Create an account with email + password, then claim the username.
 *  Returns undefined on success, CONFIRM_EMAIL if the project requires
 *  email confirmation (no session yet), or a friendly error string. */
export async function signUpWithPassword(
  email: string,
  password: string,
  username: string,
): Promise<string | undefined> {
  const sb = supabase();
  if (!sb) return 'online play is not configured';
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already') || msg.includes('registered')) {
      return 'that email already has an account — try signing in';
    }
    if (msg.includes('password') && (msg.includes('weak') || msg.includes('least') || msg.includes('6'))) {
      return 'password is too weak — use at least 6 characters';
    }
    return error.message;
  }
  // No session means email confirmation is required before sign-in.
  if (!data.session) return CONFIRM_EMAIL;
  return ensureUsername(username);
}

/** Sign in with email + password. */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<string | undefined> {
  const sb = supabase();
  if (!sb) return 'online play is not configured';
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('invalid') || msg.includes('credentials')) {
      return 'email or password is incorrect';
    }
    if (msg.includes('confirm')) {
      return 'please confirm your email first — check your inbox';
    }
    return error.message;
  }
  return undefined;
}

/** Email a password-reset link. Returns undefined on success. The link
 *  redirects back to the app's /#type=recovery, handled by AuthCallback. */
export async function resetPassword(email: string): Promise<string | undefined> {
  const sb = supabase();
  if (!sb) return 'online play is not configured';
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  return error?.message;
}

/** Set a new password for the user in a recovery session (the auth-callback
 *  page after a reset link). Returns undefined on success. */
export async function updatePassword(password: string): Promise<string | undefined> {
  const sb = supabase();
  if (!sb) return 'online play is not configured';
  const { error } = await sb.auth.updateUser({ password });
  return error?.message;
}

/** Claim/refresh the public username (leaderboard identity). */
export async function ensureUsername(username: string): Promise<string | undefined> {
  const sb = supabase();
  if (!sb) return 'online play is not configured';
  const { data } = await sb.auth.getSession();
  const user = data.session?.user;
  if (!user) return 'not signed in';
  const { error } = await sb
    .from('profiles')
    .upsert({ id: user.id, username }, { onConflict: 'id' });
  if (error?.code === '23505') return 'that username is taken';
  return error?.message;
}

export async function signOut(): Promise<void> {
  await supabase()?.auth.signOut();
}

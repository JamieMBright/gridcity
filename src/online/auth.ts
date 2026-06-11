// Passwordless accounts: email + username, a 6-digit code (or magic link)
// each time, never a password.

import { supabase } from './supabase';

export interface OnlineUser {
  id: string;
  email: string;
  username: string | undefined;
}

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

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

// Auth-change fan-out. Several panels mount at once (the start-menu
// AccountPanel and the SettingsPanel overlay each hold their OWN cached
// `currentUser()`), so a sign-out in one would leave the others showing a
// stale "signed in" until a remount — the player reads that as "it kept me
// signed in". signOut() notifies every subscriber so they all re-check at
// once. Tiny and dependency-free (no EventTarget — works in any env).
type AuthListener = () => void;
const authListeners = new Set<AuthListener>();

/** Subscribe to auth changes (currently: sign-out). Returns an unsubscribe.
 *  Listeners must re-read currentUser() themselves — this only nudges. */
export function onAuthChange(fn: AuthListener): () => void {
  authListeners.add(fn);
  return () => authListeners.delete(fn);
}

function notifyAuthChange(): void {
  for (const fn of [...authListeners]) {
    try {
      fn();
    } catch {
      /* a broken listener must not stop the others from re-checking */
    }
  }
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
  // Supabase anti-enumeration: signing up an ALREADY-registered email
  // returns a user with NO identities and no session — and sends no email.
  // We used to misreport that as "check your email to confirm" (so the
  // user waits forever for a mail that never comes). Detect it and tell
  // them to sign in instead.
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return 'that email already has an account — sign in instead';
  }
  // No session (with identities present) means the project requires email
  // confirmation before sign-in.
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

/** Change a SIGNED-IN user's password from the settings popup: re-authenticate
 *  with the current password first (so a walked-away session can't be hijacked
 *  into a new password), then set the new one. Returns undefined on success or
 *  a friendly error string. */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<string | undefined> {
  const sb = supabase();
  if (!sb) return 'online play is not configured';
  const { data } = await sb.auth.getSession();
  const email = data.session?.user.email;
  if (!email) return 'not signed in';
  if (newPassword.length < 6) return 'new password is too weak — use at least 6 characters';
  // verify the current password by re-signing in (refreshes the session too)
  const { error: reauth } = await sb.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (reauth) {
    const msg = reauth.message.toLowerCase();
    if (msg.includes('invalid') || msg.includes('credentials')) {
      return 'current password is incorrect';
    }
    return reauth.message;
  }
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('different') || msg.includes('same')) {
      return 'new password must differ from the current one';
    }
    return error.message;
  }
  return undefined;
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

/** Sign the user out. Returns undefined on success or a friendly error
 *  string (mirroring the other auth fns) so the caller can surface it.
 *
 *  Uses `scope: 'local'` deliberately: the player tapped "sign out" and
 *  must be signed out on THIS device immediately. The default global scope
 *  makes a network round-trip to revoke the refresh token server-side and,
 *  if that call fails (offline, an already-expired/stale token returning
 *  403, a proxy hiccup), can leave the persisted local session in place —
 *  which is exactly the "it kept me signed in" bug. A local sign-out clears
 *  the device session without depending on the server.
 *
 *  Belt-and-braces: if the SDK still reports an error, force-clear the
 *  persisted session so getSession() can never resurrect the signed-in
 *  user, and only THEN return the message. */
export async function signOut(): Promise<string | undefined> {
  const sb = supabase();
  if (!sb) return undefined; // never configured → already "signed out"
  try {
    const { error } = await sb.auth.signOut({ scope: 'local' });
    if (error) {
      // signOut already drops the in-memory session; make sure the persisted
      // copy is gone too so a reload / next getSession() stays signed out.
      clearPersistedSession();
      return error.message;
    }
    return undefined;
  } catch (e) {
    clearPersistedSession();
    return e instanceof Error ? e.message : 'could not sign out';
  } finally {
    // the local session is gone on every path — tell every mounted panel to
    // re-check so none of them keeps showing the old signed-in identity.
    notifyAuthChange();
  }
}

/** Remove supabase-js's persisted auth token from storage as a last resort,
 *  so a failed signOut() can never leave a session that getSession() reads
 *  back. supabase-js keys it `sb-<project-ref>-auth-token`; we clear any
 *  matching key rather than recompute the ref. No-ops if storage is
 *  unavailable (SSR / private mode) — there's nothing persisted to clear. */
function clearPersistedSession(): void {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return;
    for (let i = ls.length - 1; i >= 0; i--) {
      const key = ls.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        ls.removeItem(key);
      }
    }
  } catch {
    /* storage unavailable — nothing persisted to clear */
  }
}

// Remote self-heal sink: fire-and-forget crash reports into Supabase's
// `client_errors` table so the maintainer can read tracebacks and fix bugs.
//
// Guarded EXACTLY like cloud.ts: any failure (Supabase unconfigured,
// offline, RLS reject, missing table) quietly no-ops. It must never throw,
// never block the UI, and never include save-game contents. The user's
// email is attached ONLY if they are already signed in (privacy-safe: we
// read the existing session, we never prompt).
//
// Wiring: installErrorSink() injects this into errorLog via setRemoteSink,
// keeping the Supabase client out of errorLog's worker-safe import graph.

import type { ErrorEntry } from '../app/errorLog';
import { setRemoteSink } from '../app/errorLog';
import { supabase } from './supabase';

/** Best-effort: read the signed-in user's email from the existing session.
 *  Returns undefined for guests or on any failure (never prompts). */
async function sessionEmail(): Promise<string | undefined> {
  try {
    const sb = supabase();
    if (!sb) return undefined;
    const { data } = await sb.auth.getSession();
    return data.session?.user.email ?? undefined;
  } catch {
    return undefined;
  }
}

/** Insert one captured error. Fire-and-forget; swallows every error path. */
function sendError(entry: ErrorEntry): void {
  void (async () => {
    const sb = supabase();
    if (!sb) return; // Supabase unconfigured → local-only logging, no remote.
    const email = await sessionEmail();
    await sb.from('client_errors').insert({
      message: entry.message,
      stack: entry.stack ?? null,
      component_stack: entry.componentStack ?? null,
      source: entry.source,
      build: entry.build,
      save_version: entry.saveVersion,
      city: entry.city ?? null,
      url: entry.url,
      user_agent: entry.userAgent,
      user_email: email ?? null,
      // privacy: extra is structured context only (never save contents).
      extra: entry.extra ?? null,
    });
  })().catch(() => undefined); // offline / RLS / missing table: stay silent.
}

/** Install the remote sink. Call once at boot, AFTER Supabase is importable.
 *  No-op-safe to call when Supabase is absent (sendError guards internally). */
export function installErrorSink(): void {
  setRemoteSink(sendError);
}

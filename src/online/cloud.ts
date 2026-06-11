// Cloud saves, settings sync and the leaderboard. All best-effort: any
// failure quietly falls back to local play.

import type { ReportCard } from '../sim/regulation/riio';
import { isSaveData, type SaveData } from '../sim/state';
import type { AudioSettings } from '../audio/audio';
import { supabase } from './supabase';

const PUSH_DEBOUNCE_MS = 45_000;
let lastPush = 0;
let pendingPush: ReturnType<typeof setTimeout> | undefined;

async function userId(): Promise<string | undefined> {
  const sb = supabase();
  if (!sb) return undefined;
  const { data } = await sb.auth.getSession();
  return data.session?.user.id;
}

export async function pullCloudSave(): Promise<SaveData | undefined> {
  const sb = supabase();
  const id = await userId();
  if (!sb || !id) return undefined;
  const { data } = await sb.from('saves').select('data').eq('user_id', id).eq('slot', 0).maybeSingle();
  const save = data?.data as unknown;
  return isSaveData(save) ? save : undefined;
}

/** Debounced upsert — autosaves arrive every 30s, the cloud sees ~1/min. */
export function pushCloudSave(data: SaveData, immediate = false): void {
  const run = async (): Promise<void> => {
    const sb = supabase();
    const id = await userId();
    if (!sb || !id) return;
    lastPush = Date.now();
    await sb
      .from('saves')
      .upsert({ user_id: id, slot: 0, data, updated_at: new Date().toISOString() });
  };
  if (pendingPush) clearTimeout(pendingPush);
  const wait = immediate ? 0 : Math.max(0, PUSH_DEBOUNCE_MS - (Date.now() - lastPush));
  pendingPush = setTimeout(() => void run().catch(() => undefined), wait);
}

export async function pullSettings(): Promise<Partial<AudioSettings> | undefined> {
  const sb = supabase();
  const id = await userId();
  if (!sb || !id) return undefined;
  const { data } = await sb
    .from('settings')
    .select('music_on, sfx_on, volume')
    .eq('user_id', id)
    .maybeSingle();
  if (!data) return undefined;
  return {
    musicOn: data.music_on as boolean,
    sfxOn: data.sfx_on as boolean,
    volume: data.volume as number,
  };
}

export function pushSettings(s: AudioSettings): void {
  void (async () => {
    const sb = supabase();
    const id = await userId();
    if (!sb || !id) return;
    await sb.from('settings').upsert({
      user_id: id,
      music_on: s.musicOn,
      sfx_on: s.sfxOn,
      volume: s.volume,
      updated_at: new Date().toISOString(),
    });
  })().catch(() => undefined);
}

/** Submit a closed period's report card to the global leaderboard. */
export function submitScore(card: ReportCard): void {
  void (async () => {
    const sb = supabase();
    const id = await userId();
    if (!sb || !id) return;
    await sb.from('leaderboard').insert({
      user_id: id,
      period: card.index,
      composite: card.composite,
      grade: card.grade,
      kpis: card.scores,
    });
  })().catch(() => undefined);
}

export interface LeaderboardRow {
  username: string;
  composite: number;
  grade: string;
  period: number;
  achievedAt: string;
}

export async function fetchLeaderboard(limit = 10): Promise<LeaderboardRow[]> {
  const sb = supabase();
  if (!sb) return [];
  const { data } = await sb
    .from('leaderboard')
    .select('composite, grade, period, achieved_at, profiles(username)')
    .order('composite', { ascending: false })
    .order('achieved_at', { ascending: true })
    .limit(limit);
  if (!data) return [];
  return data.map((r) => ({
    username:
      ((r.profiles as { username?: string } | null)?.username as string | undefined) ?? 'operator',
    composite: r.composite as number,
    grade: r.grade as string,
    period: r.period as number,
    achievedAt: r.achieved_at as string,
  }));
}

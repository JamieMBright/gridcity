// Build templates (ROADMAP #37): save a small named pattern of substations
// and lines (e.g. "grid sub + 33 kV feeder + dist sub") and stamp it
// elsewhere as one undo step.
//
// A template is a PURE relative description — every member carries an
// offset from the template's anchor (its top-left placement tile), so it
// can be stamped anywhere by adding the paste anchor. Lines reference their
// endpoints by member index, not asset id, so the set re-wires itself at
// the new location. Stored client-side in localStorage behind a thin pure
// API so the capture/apply maths can be unit-tested without a DOM.
//
// Only network kit the OPERATOR builds belongs in a template: substations
// (incl. capacitor banks) and the lines/cables between them. Generation is
// developer-tendered (no instant build) and depots are one-offs, so neither
// is captured — keeps templates deterministic and all-or-nothing.

import type { LineBuild, SubType } from '../sim/catalog';
import type { VoltageLevel } from '../sim/grid/types';

const TEMPLATES_KEY = 'electricity.templates.v1';

/** Maximum saved templates (a tidy, scannable palette list). */
export const MAX_TEMPLATES = 12;

/** A substation member of a template, positioned relative to the anchor. */
export interface TemplateSub {
  kind: 'sub';
  sub: SubType;
  /** Tile offset from the template anchor. */
  dx: number;
  dy: number;
}

/** A line/cable member: endpoints are MEMBER INDICES into the template's
 *  member list, so the wiring survives relocation. */
export interface TemplateLine {
  kind: 'line';
  level: VoltageLevel;
  build: LineBuild;
  /** Indices into `members` for the two endpoints (both must be subs). */
  a: number;
  b: number;
}

export type TemplateMember = TemplateSub | TemplateLine;

export interface BuildTemplate {
  /** Stable id (timestamp-derived) for React keys and deletes. */
  id: string;
  name: string;
  /** Wall-clock ms it was saved (menu ordering). */
  savedAt: number;
  members: TemplateMember[];
}

/** What the UI hands the store: a captured set of placed subs + the lines
 *  among them, in absolute tile space. The store re-bases it to the
 *  top-left anchor and rewires line endpoints to member indices. */
export interface CapturedSub {
  /** The asset id it had when captured — only used to rewire lines. */
  id: number;
  sub: SubType;
  x: number;
  y: number;
}
export interface CapturedLine {
  level: VoltageLevel;
  build: LineBuild;
  /** Captured endpoint asset ids. */
  a: number;
  b: number;
}

/** Build a relative template from an absolute capture. Returns undefined
 *  when there is nothing placeable (no substations). Lines whose endpoints
 *  aren't both in the captured sub set are dropped (dangling). Pure. */
export function buildTemplate(
  name: string,
  subs: CapturedSub[],
  lines: CapturedLine[],
): Omit<BuildTemplate, 'id' | 'savedAt'> | undefined {
  if (subs.length === 0) return undefined;
  // anchor = top-left of the captured footprint, so offsets are >= 0 and
  // the paste anchor reads as "where the top-left tile lands"
  const minX = Math.min(...subs.map((s) => s.x));
  const minY = Math.min(...subs.map((s) => s.y));
  const indexOf = new Map<number, number>();
  const members: TemplateMember[] = subs.map((s, i) => {
    indexOf.set(s.id, i);
    return { kind: 'sub', sub: s.sub, dx: s.x - minX, dy: s.y - minY };
  });
  for (const l of lines) {
    const a = indexOf.get(l.a);
    const b = indexOf.get(l.b);
    if (a === undefined || b === undefined || a === b) continue;
    members.push({ kind: 'line', level: l.level, build: l.build, a, b });
  }
  return { name: name.trim() || 'template', members };
}

/** Absolute placements a template stamps at `(ax, ay)`: subs with concrete
 *  tiles, and lines carrying both endpoint tile pairs. Pure — the command
 *  layer re-validates and prices each piece. */
export interface StampedSub {
  sub: SubType;
  x: number;
  y: number;
}
export interface StampedLine {
  level: VoltageLevel;
  build: LineBuild;
  ax: number;
  ay: number;
  bx: number;
  by: number;
}
export function stampTemplate(
  t: BuildTemplate,
  ax: number,
  ay: number,
): { subs: StampedSub[]; lines: StampedLine[] } {
  const subTiles: Array<{ x: number; y: number }> = [];
  const subs: StampedSub[] = [];
  for (const m of t.members) {
    if (m.kind !== 'sub') continue;
    const x = ax + m.dx;
    const y = ay + m.dy;
    subTiles[t.members.indexOf(m)] = { x, y };
    subs.push({ sub: m.sub, x, y });
  }
  const lines: StampedLine[] = [];
  for (const m of t.members) {
    if (m.kind !== 'line') continue;
    const pa = subTiles[m.a];
    const pb = subTiles[m.b];
    if (!pa || !pb) continue;
    lines.push({ level: m.level, build: m.build, ax: pa.x, ay: pa.y, bx: pb.x, by: pb.y });
  }
  return { subs, lines };
}

/** The template footprint span in tiles (for the paste preview marker). */
export function templateSpan(t: BuildTemplate): { w: number; h: number } {
  let w = 1;
  let h = 1;
  for (const m of t.members) {
    if (m.kind !== 'sub') continue;
    w = Math.max(w, m.dx + 1);
    h = Math.max(h, m.dy + 1);
  }
  return { w, h };
}

// --- localStorage persistence ------------------------------------------------

function read(): BuildTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (t): t is BuildTemplate =>
        typeof t === 'object' && t !== null && 'id' in t && Array.isArray((t as BuildTemplate).members),
    );
  } catch {
    return [];
  }
}

function write(templates: BuildTemplate[]): void {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch {
    // quota / private mode: templates just won't persist
  }
}

/** Templates, newest first. */
export function listTemplates(): BuildTemplate[] {
  return read().sort((a, b) => b.savedAt - a.savedAt);
}

let idCounter = 0;
function freshId(): string {
  return `tpl-${Date.now()}-${idCounter++}`;
}

/** Persist a captured template; caps the list at MAX_TEMPLATES (drops the
 *  oldest). Returns the saved record (with id + timestamp). */
export function saveTemplate(t: Omit<BuildTemplate, 'id' | 'savedAt'>): BuildTemplate {
  const rec: BuildTemplate = { ...t, id: freshId(), savedAt: Date.now() };
  let next = [rec, ...read()];
  if (next.length > MAX_TEMPLATES) {
    next = next.sort((a, b) => b.savedAt - a.savedAt).slice(0, MAX_TEMPLATES);
  }
  write(next);
  return rec;
}

export function deleteTemplate(id: string): void {
  write(read().filter((t) => t.id !== id));
}

// Build-tool hotkeys: number row for generation, QWERT for substations,
// ZXC for line voltages, plus depot/bulldoze/inspect. The App keyboard
// handler applies them; the palette renders the chips.

import { GEN_PALETTE_ORDER } from '../sim/catalog';
import type { Tool } from './store';

export interface Hotkey {
  key: string;
  tool: Tool;
}

// The number-row generation hotkeys are DERIVED from the voltage-sorted
// palette order (owner, 2026-06-26) so 1–9,0 always matches the on-screen
// order — hydro now has a number, and the row never drifts from the palette.
// Up to ten generators take the number row (1..9 then 0); any overflow keeps
// its letter mnemonic below. The interconnector (iMports) keeps 'm'.
const NUMBER_ROW = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const NUMBERED = GEN_PALETTE_ORDER.filter((g) => g !== 'interconnector').slice(0, NUMBER_ROW.length);
const genHotkeys: Hotkey[] = NUMBERED.map((gen, i) => ({
  key: NUMBER_ROW[i]!,
  tool: { t: 'gen', gen },
}));

export const HOTKEYS: Hotkey[] = [
  // generation — number row, in voltage-sorted palette order (derived above)
  ...genHotkeys,
  // M for iMports (the interconnector); Y for hYdrogen (the electrolyser, a
  // demand-side load — off the generation number row but still hotkeyed)
  { key: 'm', tool: { t: 'gen', gen: 'interconnector' } },
  { key: 'y', tool: { t: 'gen', gen: 'electrolyser' } },
  // substations (V = VAr support: the capacitor bank)
  { key: 'q', tool: { t: 'sub', sub: 'bulk' } },
  { key: 'w', tool: { t: 'sub', sub: 'grid' } },
  { key: 'e', tool: { t: 'sub', sub: 'dist' } },
  { key: 'r', tool: { t: 'sub', sub: 'pole' } },
  { key: 't', tool: { t: 'sub', sub: 'vault' } },
  { key: 'v', tool: { t: 'sub', sub: 'capbank' } },
  // lines (the handler preserves the current overhead/underground mode)
  { key: 'z', tool: { t: 'line', level: 400, build: 'overhead' } },
  { key: 'x', tool: { t: 'line', level: 132, build: 'overhead' } },
  { key: 'c', tool: { t: 'line', level: 33, build: 'overhead' } },
  // operations
  { key: 'd', tool: { t: 'depot' } },
  { key: 'b', tool: { t: 'demolish' } },
  { key: 'i', tool: { t: 'inspect' } },
];

/** The chip shown next to a palette entry, if it has a key. */
export function hotkeyLabel(tool: Tool): string | undefined {
  for (const h of HOTKEYS) {
    if (h.tool.t !== tool.t) continue;
    if (h.tool.t === 'gen' && tool.t === 'gen' && h.tool.gen !== tool.gen) continue;
    if (h.tool.t === 'sub' && tool.t === 'sub' && h.tool.sub !== tool.sub) continue;
    if (h.tool.t === 'line' && tool.t === 'line' && h.tool.level !== tool.level) continue;
    return h.key.toUpperCase();
  }
  return undefined;
}

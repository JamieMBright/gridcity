// Build-tool hotkeys: number row for generation, QWERT for substations,
// ZXC for line voltages, plus depot/bulldoze/inspect. The App keyboard
// handler applies them; the palette renders the chips.

import type { Tool } from './store';

export interface Hotkey {
  key: string;
  tool: Tool;
}

export const HOTKEYS: Hotkey[] = [
  // generation — number row, in palette order
  { key: '1', tool: { t: 'gen', gen: 'gasCCGT' } },
  { key: '2', tool: { t: 'gen', gen: 'gasPeaker' } },
  { key: '3', tool: { t: 'gen', gen: 'solarFarm' } },
  { key: '4', tool: { t: 'gen', gen: 'windOnshore' } },
  { key: '5', tool: { t: 'gen', gen: 'windOffshore' } },
  { key: '6', tool: { t: 'gen', gen: 'tidal' } },
  { key: '7', tool: { t: 'gen', gen: 'biomass' } },
  { key: '8', tool: { t: 'gen', gen: 'nuclear' } },
  { key: '9', tool: { t: 'gen', gen: 'battery' } },
  { key: '0', tool: { t: 'gen', gen: 'coal' } },
  // the number row is full: M for iMports (the interconnector)
  { key: 'm', tool: { t: 'gen', gen: 'interconnector' } },
  // substations
  { key: 'q', tool: { t: 'sub', sub: 'bulk' } },
  { key: 'w', tool: { t: 'sub', sub: 'grid' } },
  { key: 'e', tool: { t: 'sub', sub: 'dist' } },
  { key: 'r', tool: { t: 'sub', sub: 'pole' } },
  { key: 't', tool: { t: 'sub', sub: 'vault' } },
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

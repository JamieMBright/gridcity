// Maps the currently-armed build tool to a short human label + verb, so
// an on-screen "Building: …" chip can tell the player what the next click
// will place. Pure (no React) → unit-testable; reads catalog names so the
// chip text always matches the palette.

import type { Tool } from '../app/store';
import { GENS, SUBS } from '../sim/catalog';

export interface BuildLabel {
  /** Imperative verb for the action ('Building', 'Placing', 'Demolish'). */
  verb: string;
  /** Catalog name of the thing being placed. */
  name: string;
}

/** Returns the label for an armed tool, or null for the neutral inspect
 *  tool (nothing is being built, so no chip is shown). */
export function buildLabel(tool: Tool): BuildLabel | null {
  switch (tool.t) {
    case 'inspect':
      return null;
    case 'gen':
      return { verb: 'Building', name: GENS[tool.gen].name };
    case 'sub':
      // strip the parenthetical voltage suffix for the chip ("Grid substation")
      return { verb: 'Building', name: SUBS[tool.sub].name.split(' (')[0] ?? tool.sub };
    case 'line': {
      const kind = tool.build === 'underground' ? 'cable' : 'line';
      return { verb: 'Placing', name: `${tool.level} kV ${kind}` };
    }
    case 'depot':
      return { verb: 'Building', name: 'Field depot' };
    case 'demolish':
      return { verb: 'Demolishing', name: 'asset' };
  }
}

// Hydrogen endgame (ROADMAP #23). Two halves:
//
//  · ELECTROLYSERS are load-side units (GENS.electrolyser): dispatch never
//    stacks them — they soak energy that would otherwise be CURTAILED into
//    an H₂ tank farm, and they NEVER consume while demand is unserved.
//    Each electrolyser's tank level rides state.soc keyed by its asset id,
//    exactly like a battery's SoC — which is why the store reaches
//    dispatch, serializes, and hydrates from old saves (empty tanks) with
//    ZERO new state plumbing. The store is denominated in re-generatable
//    MWh: charging applies the net power→H₂→power round trip up front
//    (ELECTROLYSER_EFFICIENCY), so 1 MWh in the tank is 1 MWh a converted
//    peaker can put back on the grid — the battery-model precedent
//    (charge-side efficiency, 1:1 discharge).
//
//  · CONVERTED PEAKERS (GenAsset.h2, the convertToH2 command below) burn
//    from the licence-wide store first — hydrogen travels by pipeline and
//    tube trailer, not by wire, so any converted OCGT can draw on any
//    electrolyser's tanks regardless of electrical island. While the
//    store holds: carbon 0 and fuel at H2_FUEL_COST_K (the H₂ offtake
//    price paid to the electrolyser developers — that is their business
//    model; the soaked surplus itself was headed for the curtailment
//    bin). When the tanks run dry the unit falls back to gas price and
//    gas carbon, seamlessly, inside one dispatch.
//
// Innovation gating is deliberately NOT here: the electrolyser ships
// ungated-but-expensive (catalog capex); wiring it to events/innovation.ts
// is the integrator's (that file belongs to another lane this wave).

import { GENS } from '../catalog';
import type { PlacedAsset } from '../assets';
import { pushEvent, type GameState } from '../state';
import type { CommandResult } from '../commands';

/** Net power→H₂→power round trip applied on charge (PEM electrolysis
 *  ~70% × storage × H₂-fired OCGT ~50% ≈ 0.35). The store holds
 *  re-generatable MWh, so discharge is 1:1 — the battery-model shape. */
export const ELECTROLYSER_EFFICIENCY = 0.35;

/** What a converted peaker pays for stored hydrogen, £k/MWh of output —
 *  the offtake price that funds the electrolyser developer. Cheaper than
 *  OCGT gas (£140) so converted units burn H₂ first; dearer than CCGT
 *  (£85) so the conversion stays a peaking play, not baseload. */
export const H2_FUEL_COST_K = 0.09;

/** Built electrolysers (tank owners), ascending id — the deterministic
 *  drain order the converted fleet burns through. */
export function electrolyserIds(assets: Iterable<PlacedAsset>): number[] {
  const ids: number[] = [];
  for (const a of assets) {
    if (a.kind === 'gen' && a.gen === 'electrolyser') ids.push(a.id);
  }
  return ids.sort((a, b) => a - b);
}

/** Licence-wide H₂ store level, re-generatable MWh. */
export function h2StoreMWh(soc: Map<number, number>, ids: number[]): number {
  let total = 0;
  for (const id of ids) total += soc.get(id) ?? 0;
  return total;
}

/** Licence-wide tank capacity, MWh. */
export function h2CapacityMWh(assets: Iterable<PlacedAsset>): number {
  let total = 0;
  for (const a of assets) {
    if (a.kind === 'gen' && a.gen === 'electrolyser') {
      total += GENS.electrolyser.energyMWh ?? 0;
    }
  }
  return total;
}

/** Burn `mwh` from the tanks, ascending id (deterministic). Clamps at
 *  empty — callers only ever allocate what the pool reported. */
export function drainH2(soc: Map<number, number>, ids: number[], mwh: number): void {
  let left = mwh;
  for (const id of ids) {
    if (left <= 0) break;
    const have = soc.get(id) ?? 0;
    const take = Math.min(have, left);
    if (take > 0) soc.set(id, have - take);
    left -= take;
  }
}

/** Apply `{type:'convertToH2'}`: flip a gas peaker to hydrogen firing.
 *  One-way (the burner swap doesn't reverse); developer/customer plant
 *  converts too — the owner funds the refit and recovers it through the
 *  H₂ fuel price, so nothing lands on the player's bill. Undo-safe via
 *  the worker snapshot; no assetsVersion bump (fuel steers dispatch, not
 *  topology — the next solve reads the flag straight off the asset). */
export function applyConvertToH2(state: GameState, assetId: number): CommandResult {
  const asset = state.assets.get(assetId);
  if (!asset || asset.kind !== 'gen' || asset.gen !== 'gasPeaker') {
    return { ok: false, error: 'only gas peakers (OCGT) convert to hydrogen' };
  }
  if (asset.h2) return { ok: false, error: 'already burning hydrogen' };
  asset.h2 = true;
  pushEvent(
    state,
    'info',
    'OCGT converted to hydrogen firing — burns the H₂ store first, gas when the tanks run dry',
    asset.x,
    asset.y,
  );
  return { ok: true };
}

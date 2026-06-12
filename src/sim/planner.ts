// The reinforcement planner: turns the balance engine's "Watfordshire
// needs +64 MW at 18:00" into 2–4 costed work bundles — bigger
// transformers, a second circuit, re-conductoring, or a battery tender —
// each scored by re-running the balance profile on a clone with the
// candidate applied (residual shortfall, capex, £/home/yr), with the
// ready-to-send commands attached. Also the ring-main assist: the
// cheapest line that closes a radial service sub into a loop, found
// topologically (no DCPF). Nothing here ever mutates live state: every
// what-if runs on a deserialize(serialize()) clone, the same purity
// discipline as study.ts.

import {
  assetLevels,
  busId,
  deriveNetwork,
  lineBranchId,
  subMva,
  type GenAsset,
  type LineAsset,
  type SubAsset,
} from './assets';
import { computeBalance } from './balance';
import {
  ANNUITY_FACTOR,
  GENS,
  LINE_UPRATE_COST_FRAC,
  LINE_UPRATE_MUL,
  LINES,
  SUB_UG_MUL,
  subCapexK,
  SUBS,
} from './catalog';
import { applyCommand, checkBuild, type Command } from './commands';
import { priceLine } from './cost';
import { DLR_RATING_MUL } from './events/innovation';
import { solveDcPowerFlow } from './grid/dcpf';
import { findIslands } from './grid/topology';
import type { Network, VoltageLevel } from './grid/types';
import { runDispatch } from './market/dispatch';
import { NO_COUNCIL } from './map/types';
import { DOMESTIC_NETWORK_SHARE } from './regulation/bill';
import { assignServiceAreas, computeSubLoads } from './service';
import { deserialize, serialize, type GameState, type SimContext } from './state';

export interface ReinforcementOption {
  label: string;
  /** Total quoted capex of the bundle, £k. */
  capexK: number;
  /** What the bundle adds to the average household bill, £/home/yr
   *  (annuitized capex + O&M, domestic share spread across the area). */
  billImpactYr: number;
  /** The scope's worst-hour shortfall AFTER the bundle, MW. */
  residualShortfallMW: number;
  /** Ready-to-send sim commands that execute the bundle. */
  commands: Command[];
}

export interface ReinforcementPlan {
  /** Council id, or -1 for the whole licence area. */
  scopeId: number;
  /** The shortfall the plan was cut against, MW (worst hour). */
  shortfallMW: number;
  /** Costed candidates, best (lowest residual, then cheapest) first. */
  options: ReinforcementOption[];
}

/** How far afield the ring-main assist looks for a bay to loop to. */
const LOOP_RANGE_TILES = 30;

/** £/home/yr a capex bundle adds to the average bill: annuitized capex
 *  plus fixed O&M, domestic share of the network pot (the same
 *  DOMESTIC_NETWORK_SHARE math as regulation/bill.ts), spread across
 *  every customer in the licence area. (The battery tender is really
 *  private capex recovered through its PPA strike, but the network-share
 *  figure is an honest like-for-like yardstick for v1.) */
function billImpactYr(capexK: number, opexFrac: number, totalCustomers: number): number {
  if (totalCustomers <= 0) return 0;
  const yrK = capexK * (ANNUITY_FACTOR + opexFrac);
  return Math.round(((yrK * DOMESTIC_NETWORK_SHARE * 1000) / totalCustomers) * 100) / 100;
}

/** Line loadings (line branch id → |flow|/rating) at the planning stress
 *  moment — the calm, dark winter-evening peak — on a clone (same
 *  machinery as study.ts's loadings; the clone keeps the live state
 *  pristine while we move its clock). */
function stressLineLoadings(live: GameState, ctx: SimContext): Map<number, number> {
  const s = deserialize(serialize(live));
  const day = Math.floor(s.simTimeMin / 1440);
  s.simTimeMin = day * 1440 + 18 * 60 + 30;
  s.weather = { cloud: 0.8, wind: 0.15 };
  const net = deriveNetwork(s.assets.values(), s.tech.dlr ? DLR_RATING_MUL : 1);
  for (const br of net.branches) br.inService = !s.outages.has(br.id);
  const service = assignServiceAreas(ctx.map, s.assets.values(), s.loadSites, s.councils);
  const loads = computeSubLoads(ctx.map, service.tilesOfSub, s.councils, s.loadSites);
  const dispatch = runDispatch(net, s.assets.values(), loads, {
    simTimeMin: s.simTimeMin,
    weather: s.weather,
    soc: s.soc,
    dtMin: 0,
    tech: { smartEv: s.tech.smartEv, flexMarket: s.tech.flexMarket },
  });
  const pf = solveDcPowerFlow(net, dispatch.injections, {
    slackPreference: dispatch.slackPreference,
  });
  const out = new Map<number, number>();
  for (const br of net.branches) {
    if (!br.inService || br.ratingMW <= 0) continue;
    out.set(br.id, Math.abs(pf.flowMW.get(br.id) ?? 0) / br.ratingMW);
  }
  return out;
}

function subName(s: SubAsset): string {
  return SUBS[s.sub].name.split(' (')[0] ?? 'substation';
}

/** An asset with electrical bays a new line can land on. */
type BayAsset = GenAsset | SubAsset;

function bayName(a: BayAsset): string {
  return a.kind === 'sub' ? subName(a) : GENS[a.gen].name;
}

interface Candidate {
  label: string;
  capexK: number;
  opexFrac: number;
  commands: Command[];
  /** Clone-only extras beyond the commands themselves (the battery
   *  tender: score the plant + tail that only exist after award). */
  simulate?: ((clone: GameState) => void) | undefined;
}

/** Residual worst-hour shortfall for the scope with a candidate applied —
 *  always on a fresh clone, never the live state. */
function scoreCandidate(
  live: GameState,
  ctx: SimContext,
  scopeId: number,
  c: Candidate,
): number {
  const clone = deserialize(serialize(live));
  for (const cmd of c.commands) applyCommand(clone, ctx.map, cmd);
  c.simulate?.(clone);
  const after = computeBalance(clone, ctx);
  return after.scopes.find((s) => s.id === scopeId)?.shortfallMW ?? 0;
}

/** Propose 2–4 costed reinforcement bundles for a balance scope (council
 *  id, or -1 for the whole licence area). */
export function planReinforcement(
  live: GameState,
  ctx: SimContext,
  scopeId: number,
): ReinforcementPlan {
  const { map } = ctx;
  const report = computeBalance(live, ctx);
  const scope = report.scopes.find((s) => s.id === scopeId);
  // the head scope (-1) carries the licence area's full customer base
  const totalCustomers = report.scopes[0]?.customers ?? 0;
  if (!scope) return { scopeId, shortfallMW: 0, options: [] };

  const service = assignServiceAreas(map, live.assets.values(), live.loadSites, live.councils);
  const islands = findIslands(deriveNetwork(live.assets.values()));

  // the scope's service subs, and the electrical islands feeding them
  const scopeSubs: SubAsset[] = [];
  const scopeIslands = new Set<number>();
  for (const a of live.assets.values()) {
    if (a.kind !== 'sub' || SUBS[a.sub].serviceRadius === undefined) continue;
    const tiles = service.tilesOfSub.get(a.id);
    if (!tiles || tiles.length === 0) continue;
    if (scopeId !== -1 && !tiles.some((t) => (map.council[t] ?? NO_COUNCIL) === scopeId)) continue;
    scopeSubs.push(a);
    const gi = islands.islandOf.get(busId(a.id, 33));
    if (gi !== undefined && gi >= 0) scopeIslands.add(gi);
  }

  const candidates: Candidate[] = [];

  // (a) bigger transformers: step the most-loaded service subs up their
  // MVA ladders (most subscribed iron first)
  const upgradable = scopeSubs
    .filter((s) => !s.idno && SUBS[s.sub].mvaSteps !== undefined)
    .map((s) => ({ s, loading: (service.peakOfSub.get(s.id) ?? 0) / Math.max(1e-6, subMva(s)) }))
    .sort((x, y) => y.loading - x.loading || x.s.id - y.s.id);
  const txCmds: Command[] = [];
  const txNames: string[] = [];
  let txCapexK = 0;
  let txOpexFrac = SUBS.dist.opexFrac;
  for (const { s } of upgradable) {
    const next = (SUBS[s.sub].mvaSteps ?? []).find((m) => m > subMva(s));
    if (next === undefined) continue;
    txCmds.push({ type: 'setSubMva', assetId: s.id, mva: next });
    txCapexK += (subCapexK(s.sub, next) - subCapexK(s.sub, subMva(s))) * (s.underground ? SUB_UG_MUL : 1);
    txNames.push(`${subName(s)} ${subMva(s)}→${next} MVA`);
    txOpexFrac = SUBS[s.sub].opexFrac;
    if (txCmds.length >= 2) break;
  }
  if (txCmds.length > 0) {
    candidates.push({
      label: `bigger transformers: ${txNames.join(' + ')}`,
      capexK: Math.round(txCapexK),
      opexFrac: txOpexFrac,
      commands: txCmds,
    });
  }

  // corridors feeding the scope, hottest first (DCPF at the winter-
  // evening stress moment, on a clone)
  const loadings = stressLineLoadings(live, ctx);
  const corridors = [...live.assets.values()]
    .filter((a): a is LineAsset => a.kind === 'line')
    .filter((a) => scopeIslands.has(islands.islandOf.get(busId(a.a, a.level)) ?? -2))
    .sort(
      (x, y) =>
        (loadings.get(lineBranchId(y.id)) ?? 0) - (loadings.get(lineBranchId(x.id)) ?? 0) ||
        x.id - y.id,
    );

  // (b) a second circuit: duplicate the hottest corridor (same endpoints)
  const corridor = corridors[0];
  if (corridor) {
    const endA = live.assets.get(corridor.a);
    const endB = live.assets.get(corridor.b);
    if (endA && endA.kind !== 'line' && endB && endB.kind !== 'line') {
      const builds =
        corridor.build === 'overhead'
          ? (['overhead', 'underground'] as const)
          : (['underground'] as const);
      for (const build of builds) {
        const spec = {
          kind: 'line' as const,
          level: corridor.level,
          build,
          ax: endA.x,
          ay: endA.y,
          bx: endB.x,
          by: endB.y,
        };
        const check = checkBuild(map, live.assets.values(), spec);
        if (!check.ok) continue;
        candidates.push({
          label: `second ${corridor.level} kV circuit alongside the loaded corridor`,
          capexK: check.capexK,
          opexFrac: LINES[corridor.level].opexFrac,
          commands: [{ type: 'build', spec }],
        });
        break;
      }
    }
  }

  // (c) re-conductor the hottest not-yet-uprated corridor
  const recond = corridors.find((l) => !l.uprated);
  if (recond) {
    candidates.push({
      label: `re-conductor the ${recond.level} kV corridor (+${Math.round((LINE_UPRATE_MUL - 1) * 100)}% rating)`,
      capexK: Math.round(recond.capexK * LINE_UPRATE_COST_FRAC),
      opexFrac: LINES[recond.level].opexFrac,
      commands: [{ type: 'uprateLine', assetId: recond.id }],
    });
  }

  // (d) a battery tender beside the scope's grid substation: approving
  // designates the site (= a 'build' gen spec), which opens a developer
  // tender — the plant arrives via the normal acceptBid path
  const gridSubs = [...live.assets.values()]
    .filter((a): a is SubAsset => a.kind === 'sub' && (a.sub === 'grid' || a.sub === 'bulk'))
    .sort(
      (x, y) =>
        Math.hypot(x.x - scope.cx, x.y - scope.cy) - Math.hypot(y.x - scope.cx, y.y - scope.cy) ||
        x.id - y.id,
    );
  battery: for (const gs of gridSubs) {
    for (let r = 1; r <= 3; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = gs.x + dx;
          const y = gs.y + dy;
          const spec = { kind: 'gen' as const, gen: 'battery' as const, x, y };
          if (!checkBuild(map, live.assets.values(), spec).ok) continue;
          candidates.push({
            label: `${GENS.battery.capacityMW} MW battery beside ${subName(gs)} — opens a developer tender (wire it up on award)`,
            capexK: GENS.battery.capexK,
            opexFrac: GENS.battery.opexFrac,
            commands: [{ type: 'build', spec }],
            // score the eventual outcome: the awarded plant, wired into
            // the sub's 33 kV bay (clone-only; the live command merely
            // opens the tender)
            simulate: (clone) => {
              const gid = clone.nextAssetId++;
              clone.assets.set(gid, {
                id: gid,
                kind: 'gen',
                gen: 'battery',
                x,
                y,
                developer: 1,
                liveAtMin: 0,
              });
              clone.soc.set(gid, GENS.battery.energyMWh ?? 0);
              let priced = priceLine(map, 33, 'overhead', gs.x, gs.y, x, y);
              if (!priced.ok) priced = priceLine(map, 33, 'underground', gs.x, gs.y, x, y);
              if (priced.ok) {
                const lid = clone.nextAssetId++;
                clone.assets.set(lid, {
                  id: lid,
                  kind: 'line',
                  level: 33,
                  build: 'overhead',
                  a: gs.id,
                  b: gid,
                  lengthTiles: priced.lengthTiles,
                  capexK: priced.capexK,
                  pylons: [],
                });
              }
              clone.assetsVersion++;
            },
          });
          break battery;
        }
      }
    }
  }

  const options: ReinforcementOption[] = candidates
    .map((c) => ({
      label: c.label,
      capexK: c.capexK,
      billImpactYr: billImpactYr(c.capexK, c.opexFrac, totalCustomers),
      residualShortfallMW: scoreCandidate(live, ctx, scopeId, c),
      commands: c.commands,
    }))
    .sort((x, y) => x.residualShortfallMW - y.residualShortfallMW || x.capexK - y.capexK);

  return { scopeId, shortfallMW: scope.shortfallMW, options };
}

/** Buses reachable from `start` over in-service branches, skipping one
 *  branch — the "what hangs off this feeder" question. */
function componentOf(net: Network, start: number, skipBranch: number): Set<number> {
  const adj = new Map<number, number[]>();
  for (const br of net.branches) {
    if (!br.inService || br.id === skipBranch) continue;
    let f = adj.get(br.from);
    if (!f) adj.set(br.from, (f = []));
    f.push(br.to);
    let t = adj.get(br.to);
    if (!t) adj.set(br.to, (t = []));
    t.push(br.from);
  }
  const seen = new Set<number>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const b = queue.pop();
    if (b === undefined) break;
    for (const next of adj.get(b) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

/** The ring-main assist: for a service substation hanging off a single
 *  supply path, find the cheapest new line that closes it into a loop.
 *  Pure topology (findIslands with each supply-path branch removed) — no
 *  DCPF. Returns a plan shaped like the planner's, with one option (or
 *  none if the sub is already ringed / has no live supply to ring into). */
export function proposeLoop(live: GameState, ctx: SimContext, subId: number): ReinforcementPlan {
  const { map } = ctx;
  const sub = live.assets.get(subId);
  const empty: ReinforcementPlan = { scopeId: -1, shortfallMW: 0, options: [] };
  if (!sub || sub.kind !== 'sub') return empty;
  const levels = assetLevels(sub);
  const low = levels[levels.length - 1];
  if (low === undefined) return empty;

  const net = deriveNetwork(live.assets.values());
  // radiality is about the wiring, not transient outages
  const base = findIslands(net);
  const subBus = busId(sub.id, low);
  const island0 = base.islandOf.get(subBus);
  if (island0 === undefined || island0 < 0) return empty;

  // generator buses are the topological "supply" the loop must keep hold of
  const genBuses = new Set<number>();
  for (const a of live.assets.values()) {
    if (a.kind === 'gen') genBuses.add(busId(a.id, GENS[a.gen].level));
  }
  if (!(base.groups[island0] ?? []).some((b) => genBuses.has(b))) return empty; // dark island

  // every supply-path bridge: removing it strands the sub from all
  // generation. inside = buses cut off by EVERY such bridge (the radial
  // subtree's core, always containing the sub); union = everything any
  // bridge can strand. A line from inside to beyond the union closes a
  // loop over the whole supply path at once.
  let inside: Set<number> | undefined;
  const strandable = new Set<number>();
  for (const br of net.branches) {
    if (!br.inService) continue;
    if (base.islandOf.get(br.from) !== island0) continue;
    const comp = componentOf(net, subBus, br.id);
    let hasGen = false;
    for (const b of comp) {
      if (genBuses.has(b)) {
        hasGen = true;
        break;
      }
    }
    if (hasGen) continue; // not on the supply path
    inside = inside === undefined ? comp : new Set([...inside].filter((b) => comp.has(b)));
    for (const b of comp) strandable.add(b);
  }
  if (!inside || inside.size === 0) return { ...empty, scopeId: -1 }; // already ringed

  // candidate bays: inside the radial subtree × nearby bays beyond it
  // (same island, so the far end genuinely holds supply)
  const insideAssets: BayAsset[] = [];
  const outsideAssets: BayAsset[] = [];
  for (const a of live.assets.values()) {
    if (a.kind === 'line' || a.kind === 'depot') continue;
    const lvls = assetLevels(a);
    if (lvls.length === 0) continue;
    const buses = lvls.map((l) => busId(a.id, l));
    if (buses.some((b) => inside.has(b))) {
      insideAssets.push(a);
    } else if (
      buses.every((b) => !strandable.has(b)) &&
      buses.some((b) => base.islandOf.get(b) === island0)
    ) {
      outsideAssets.push(a);
    }
  }

  // cheapest closure first (priceLine), then validate with checkBuild
  interface Closure {
    a: BayAsset;
    b: BayAsset;
    level: VoltageLevel;
    build: 'overhead' | 'underground';
    capexK: number;
  }
  const closures: Closure[] = [];
  for (const ia of insideAssets) {
    for (const ob of outsideAssets) {
      if (Math.hypot(ia.x - ob.x, ia.y - ob.y) > LOOP_RANGE_TILES) continue;
      const obLevels = assetLevels(ob);
      for (const level of assetLevels(ia)) {
        if (!obLevels.includes(level)) continue;
        for (const build of ['overhead', 'underground'] as const) {
          const priced = priceLine(map, level, build, ia.x, ia.y, ob.x, ob.y);
          if (!priced.ok) continue;
          closures.push({ a: ia, b: ob, level, build, capexK: priced.capexK });
          break; // overhead never costs more than the same route buried
        }
      }
    }
  }
  closures.sort((x, y) => x.capexK - y.capexK || x.a.id - y.a.id || x.b.id - y.b.id);

  const cid = map.council[sub.y * map.width + sub.x] ?? NO_COUNCIL;
  const scopeId = cid === NO_COUNCIL ? -1 : cid;
  const report = computeBalance(live, ctx);
  const totalCustomers = report.scopes[0]?.customers ?? 0;
  const shortfallMW = report.scopes.find((s) => s.id === scopeId)?.shortfallMW ?? 0;

  for (const c of closures) {
    const spec = {
      kind: 'line' as const,
      level: c.level,
      build: c.build,
      ax: c.a.x,
      ay: c.a.y,
      bx: c.b.x,
      by: c.b.y,
    };
    const check = checkBuild(map, live.assets.values(), spec);
    if (!check.ok) continue;
    const candidate: Candidate = {
      label: `close the ring: ${c.level} kV ${c.build === 'underground' ? 'cable' : 'circuit'} ${bayName(c.a)} → ${bayName(c.b)}`,
      capexK: check.capexK,
      opexFrac: LINES[c.level].opexFrac,
      commands: [{ type: 'build', spec }],
    };
    return {
      scopeId,
      shortfallMW,
      options: [
        {
          label: candidate.label,
          capexK: candidate.capexK,
          billImpactYr: billImpactYr(candidate.capexK, candidate.opexFrac, totalCustomers),
          residualShortfallMW: scoreCandidate(live, ctx, scopeId, candidate),
          commands: candidate.commands,
        },
      ],
    };
  }
  return { scopeId, shortfallMW, options: [] };
}

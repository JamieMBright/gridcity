// A connection study: what actually happens to the network if this
// application connects — the thing a real DNO does before offering terms.
// Clones the live state, wires the applicant the way a player would
// (generation: a line at its voltage to the nearest compatible bay;
// load: joins the nearest service catchment), then re-runs dispatch +
// power flow under stress conditions and reports every piece of kit the
// connection pushes near or past its rating. Firm vs flexible stops
// being a blind choice.

import { assetLevels, assetOfId, deriveNetwork, subMva } from './assets';
import { GENS, SUBS } from './catalog';
import { priceLine } from './cost';
import { GEN_OF_KIND, type Application } from './events/applications';
import { DLR_RATING_MUL } from './events/innovation';
import { solveDcPowerFlow } from './grid/dcpf';
import type { VoltageLevel } from './grid/types';
import { runDispatch } from './market/dispatch';
import { assignServiceAreas, computeSubLoads } from './service';
import { deserialize, serialize, type GameState, type SimContext } from './state';

export interface StudyImpact {
  label: string;
  beforePct: number;
  afterPct: number;
}

export interface ConnectionStudy {
  appId: number;
  ok: boolean;
  error?: string | undefined;
  /** Connection voltage and the bay the study wired to (gen only). */
  level?: VoltageLevel | undefined;
  bayName?: string | undefined;
  distKm?: number | undefined;
  lineCapexK?: number | undefined;
  /** Kit at ≥90% loading after connection, worst first. */
  impacts: StudyImpact[];
  recommendation: string;
}

/** Stress moment for the study: generation studied at its max-output
 *  hour, load studied at the winter-evening domestic peak. */
function stress(state: GameState, app: Application): void {
  const day = Math.floor(state.simTimeMin / 1440);
  if (app.kind === 'solarFarm') {
    state.simTimeMin = day * 1440 + 12 * 60; // high noon, clear sky
    state.weather = { cloud: 0, wind: 0.5 };
  } else if (app.kind === 'windOnshore') {
    state.simTimeMin = day * 1440 + 12 * 60; // a blowy day
    state.weather = { cloud: 0.5, wind: 0.8 };
  } else {
    state.simTimeMin = day * 1440 + 18 * 60 + 30; // evening peak, calm + dark
    state.weather = { cloud: 0.8, wind: 0.15 };
  }
}

/** All branch loadings (branch id → |flow|/rating) under the state's
 *  current conditions. */
function loadings(state: GameState, ctx: SimContext): Map<number, number> {
  const net = deriveNetwork(state.assets.values(), state.tech.dlr ? DLR_RATING_MUL : 1);
  for (const br of net.branches) br.inService = !state.outages.has(br.id);
  const service = assignServiceAreas(ctx.map, state.assets.values(), state.loadSites, state.councils);
  const loads = computeSubLoads(ctx.map, service.tilesOfSub, state.councils, state.loadSites);
  const dispatch = runDispatch(net, state.assets.values(), loads, {
    simTimeMin: state.simTimeMin,
    weather: state.weather,
    soc: state.soc,
    dtMin: 0,
    tech: { smartEv: state.tech.smartEv, flexMarket: state.tech.flexMarket },
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

function branchLabel(state: GameState, branchId: number): string {
  const a = state.assets.get(assetOfId(branchId));
  if (!a) return 'network kit';
  if (a.kind === 'line') return `${a.level} kV ${a.build === 'underground' ? 'cable' : 'line'}`;
  if (a.kind === 'sub') return `${SUBS[a.sub].name.split(' (')[0]} transformer`;
  return 'network kit';
}

export function connectionStudy(
  live: GameState,
  ctx: SimContext,
  app: Application,
): ConnectionStudy {
  let catchmentImpact: StudyImpact | undefined;
  const fail = (error: string): ConnectionStudy => ({
    appId: app.id,
    ok: false,
    error,
    impacts: [],
    recommendation: error,
  });

  // baseline and what-if both run on clones at the same stress moment
  const base = deserialize(serialize(live));
  stress(base, app);
  const withApp = deserialize(serialize(live));
  stress(withApp, app);

  const gen = GEN_OF_KIND[app.kind];
  let level: VoltageLevel | undefined;
  let bayName: string | undefined;
  let distKm: number | undefined;
  let lineCapexK: number | undefined;

  if (gen !== undefined) {
    // wire the plant the way the player would: a line to the nearest bay
    level = GENS[gen].level;
    let best: { id: number; x: number; y: number; name: string } | undefined;
    let bestD = Number.POSITIVE_INFINITY;
    for (const a of withApp.assets.values()) {
      if (a.kind === 'line' || a.kind === 'depot') continue;
      if (!assetLevels(a).includes(level)) continue;
      const d = Math.hypot(a.x - app.x, a.y - app.y);
      if (d < bestD) {
        bestD = d;
        best = {
          id: a.id,
          x: a.x,
          y: a.y,
          name: a.kind === 'sub' ? (SUBS[a.sub].name.split(' (')[0] ?? 'substation') : GENS[a.gen].name,
        };
      }
    }
    if (!best) return fail(`no ${level} kV bay on the network yet — build one before deciding`);
    bayName = best.name;
    distKm = Math.round(bestD);
    let priced = priceLine(ctx.map, level, 'overhead', best.x, best.y, app.x, app.y);
    if (!priced.ok) priced = priceLine(ctx.map, level, 'underground', best.x, best.y, app.x, app.y);
    if (!priced.ok) return fail('no viable route to the nearest bay');
    lineCapexK = priced.capexK;

    const genId = withApp.nextAssetId++;
    withApp.assets.set(genId, {
      id: genId,
      kind: 'gen',
      gen,
      x: app.x,
      y: app.y,
      customer: true,
      liveAtMin: 0,
    });
    if (gen === 'battery') withApp.soc.set(genId, GENS.battery.energyMWh ?? 0);
    const lineId = withApp.nextAssetId++;
    withApp.assets.set(lineId, {
      id: lineId,
      kind: 'line',
      level,
      build: 'overhead',
      a: best.id,
      b: genId,
      lengthTiles: priced.lengthTiles,
      capexK: priced.capexK,
      pylons: [],
    });
  } else {
    // load connection: it joins the nearest service catchment
    withApp.loadSites.push({
      id: 1_000_000 + app.id,
      x: app.x,
      y: app.y,
      mw: app.mw,
      customers: app.customers,
      name: app.name,
    });
    const service = assignServiceAreas(
      ctx.map,
      withApp.assets.values(),
      withApp.loadSites,
      withApp.councils,
    );
    const served = [...service.tilesOfSub.values()].some((tiles) =>
      tiles.some((t) => t === app.y * ctx.map.width + app.x),
    );
    if (!served) {
      return fail(
        'outside every service catchment — place a distribution substation in reach first',
      );
    }
    // the catchment transformer is implicit (33 kV/LV is abstracted), so
    // report its loading directly: this is usually where a big load bites
    const servingId = service.subOfTile.get(app.y * ctx.map.width + app.x);
    const servingSub = servingId !== undefined ? withApp.assets.get(servingId) : undefined;
    if (servingSub && servingSub.kind === 'sub') {
      const mva = subMva(servingSub);
      const afterPk = service.peakOfSub.get(servingSub.id) ?? 0;
      const beforePk = Math.max(0, afterPk - app.mw);
      if (mva > 0 && afterPk / mva >= 0.9) {
        catchmentImpact = {
          label: `${SUBS[servingSub.sub].name.split(' (')[0]} catchment (${mva} MVA fitted)`,
          beforePct: Math.round((beforePk / mva) * 100),
          afterPct: Math.round((afterPk / mva) * 100),
        };
      }
    }
  }

  const before = loadings(base, ctx);
  const after = loadings(withApp, ctx);
  const impacts: StudyImpact[] = [];
  for (const [id, pct] of after) {
    if (pct < 0.9) continue;
    impacts.push({
      label: branchLabel(withApp, id),
      beforePct: Math.round((before.get(id) ?? 0) * 100),
      afterPct: Math.round(pct * 100),
    });
  }
  if (catchmentImpact) impacts.push(catchmentImpact);
  impacts.sort((a, b) => b.afterPct - a.afterPct);

  const isGen = gen !== undefined;
  const recommendation =
    impacts.length === 0
      ? 'clean study: nothing exceeds 90% at stress — a FIRM offer is safe'
      : isGen
        ? 'overloads at stress: take it FLEXIBLE (curtailable, no compensation) or reinforce before going firm — firm + curtailment = constraint payments'
        : 'overloads at stress: reinforce before energizing (bigger transformer, second circuit, re-conductor) — load cannot be curtailed like generation';

  return {
    appId: app.id,
    ok: true,
    level,
    bayName,
    distKm,
    lineCapexK,
    impacts: impacts.slice(0, 5),
    recommendation,
  };
}

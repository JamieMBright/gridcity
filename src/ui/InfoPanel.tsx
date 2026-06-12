import { useMemo, useState } from 'react';
import { linePeaks, useAppStore } from '../app/store';
import { getLondonMap, NAMED_PLACES } from '../data/londonMap';
import { sendCommand } from '../app/workerBridge';
import { GENS, LINES, SUB_UG_MUL, subCapexK, subRadius, SUBS, type SubType } from '../sim/catalog';
import { assetLevels, subMva, type BatteryPolicy, type PlacedAsset } from '../sim/assets';
import { assetAtTile, spanAt } from '../sim/commands';
import {
  assetHealth,
  MAINT_COST_FRAC,
  MAINT_HEALTH_BELOW,
  maintenanceBranchOf,
  maintenanceCutsSupply,
  REPLACE_COST_FRAC,
  REPLACE_HEALTH_BELOW,
} from '../sim/reliability/ageing';
import { assetCapexK } from '../sim/regulation/bill';
import { availAt } from '../sim/balance';
import { nationalPriceMWh } from '../sim/market/dispatch';
import { CAPBANK_BOOST_PU } from '../sim/grid/voltage';
import { priceLine } from '../sim/cost';
import { NO_COUNCIL, TERRAIN, ZONE, type Terrain, type Zone } from '../sim/map/types';
import { COV } from '../sim/tick';
import { fmtMoneyK, panelStyle, theme } from './theme';

const ZONE_NAMES: Record<Zone, string> = {
  [ZONE.none]: 'Open land',
  [ZONE.urbanCore]: 'Urban core',
  [ZONE.urban]: 'Urban terraces',
  [ZONE.suburb]: 'Suburb',
  [ZONE.posh]: 'Conservation area',
  [ZONE.rural]: 'Village',
  [ZONE.industrial]: 'Industrial estate',
  [ZONE.greenhouse]: 'Glasshouses',
  [ZONE.park]: 'Park',
  [ZONE.solarSite]: 'Solar farm site',
  [ZONE.windSite]: 'Offshore wind zone',
  [ZONE.nuclearSite]: 'Nuclear-capable site',
  [ZONE.cbd]: 'Skyscraper district',
  [ZONE.newEstate]: 'New-build estate (iDNO)',
};

const TERRAIN_NAMES: Record<Terrain, string> = {
  [TERRAIN.water]: 'Water',
  [TERRAIN.land]: 'Land',
  [TERRAIN.hill]: 'Hills',
  [TERRAIN.trees]: 'Woodland',
};

const ROAD_NAMES: Record<number, string | undefined> = {
  2: 'Street',
  3: 'A road',
  4: 'Motorway',
  5: 'Railway',
};

const COV_BADGE: Record<number, { label: string; color: string }> = {
  [COV.unserved]: { label: 'no network', color: theme.slate },
  [COV.on]: { label: 'on supply', color: theme.ok },
  [COV.brownout]: { label: 'brownout', color: theme.warn },
  [COV.off]: { label: 'blackout', color: theme.danger },
};

export function InfoPanel({ frame }: { frame?: React.CSSProperties } = {}) {
  const hovered = useAppStore((s) => s.hoveredTile);
  const snapshot = useAppStore((s) => s.snapshot);
  const selectedAsset = useAppStore((s) => s.selectedAsset);
  const selectedLine = useAppStore((s) => s.selectedLine);
  const setSelected = useAppStore((s) => s.setSelected);

  // an inspect CLICK pins the card: it stays up (and clickable) while
  // the player works the controls, instead of vanishing with the hover
  const pinnedFrame: React.CSSProperties = {
    ...panelStyle,
    position: 'absolute',
    top: 28,
    right: 12,
    width: 240,
    padding: '10px 14px',
    pointerEvents: 'auto',
    lineHeight: 1.5,
    ...frame,
  };
  if (snapshot && selectedLine !== undefined) {
    const line = snapshot.assets.find((a) => a.id === selectedLine);
    if (line && line.kind === 'line') {
      return (
        <div style={pinnedFrame}>
          <CloseX onClick={() => setSelected({})} />
          <LineInfo assetId={selectedLine} />
        </div>
      );
    }
  }
  if (snapshot && selectedAsset !== undefined) {
    const asset = snapshot.assets.find((a) => a.id === selectedAsset);
    if (asset && asset.kind !== 'line') {
      return (
        <div style={pinnedFrame}>
          <CloseX onClick={() => setSelected({})} />
          <AssetInfo assetId={selectedAsset} />
        </div>
      );
    }
  }

  if (!hovered) return null;

  const map = getLondonMap();
  const i = hovered.y * map.width + hovered.x;
  const terrain = (map.terrain[i] ?? TERRAIN.land) as Terrain;
  const zone = (map.zone[i] ?? ZONE.none) as Zone;
  const councilId = map.council[i] ?? NO_COUNCIL;
  const council = councilId === NO_COUNCIL ? undefined : map.councils[councilId];
  const customers = map.customers[i] ?? 0;
  const roadClass = map.road[i] ?? 0;
  const cov = snapshot?.coverage[i] ?? COV.empty;
  const badge = COV_BADGE[cov];

  const asset = snapshot ? assetAtTile(snapshot.assets, hovered.x, hovered.y) : undefined;

  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        top: 28,
        right: 12,
        width: 240,
        padding: '10px 14px',
        pointerEvents: 'none',
        lineHeight: 1.5,
        ...frame,
      }}
    >
      <div style={{ color: theme.orange, fontWeight: 700 }}>
        {NAMED_PLACES.find((p) => p.x === hovered.x && p.y === hovered.y)?.name ??
          ROAD_NAMES[roadClass] ??
          ZONE_NAMES[zone]}
      </div>
      <div style={{ color: theme.slate, fontSize: 11 }}>
        {TERRAIN_NAMES[terrain]} · tile {hovered.x},{hovered.y}
      </div>
      {council && (
        <div style={{ marginTop: 6 }}>
          <div>{council.name}</div>
          <div style={{ color: theme.slate, fontSize: 11, fontStyle: 'italic' }}>
            {council.blurb}
          </div>
          <CouncilStats councilId={council.id} />
        </div>
      )}
      {customers > 0 && (
        <div style={{ marginTop: 6 }}>
          <span style={{ color: theme.gold }}>{customers} customers</span>
          {badge && (
            <span style={{ color: badge.color, marginLeft: 8 }}>● {badge.label}</span>
          )}
        </div>
      )}
      {asset && snapshot && <AssetInfo assetId={asset.id} />}
    </div>
  );
}

function CouncilStats({ councilId }: { councilId: number }) {
  const snapshot = useAppStore((s) => s.snapshot);
  const cs = snapshot?.councils.find(([id]) => id === councilId)?.[1];
  if (!cs) return null;
  return (
    <div style={{ fontSize: 11, marginTop: 3 }}>
      <span style={{ color: theme.ok }}>☺ {cs.satisfaction.toFixed(0)}</span>
      <span style={{ color: theme.slate }}>
        {' '}
        · EV {(cs.ev * 100).toFixed(0)}% · HP {(cs.hp * 100).toFixed(0)}% · PV{' '}
        {(cs.pv * 100).toFixed(0)}%
      </span>
      {cs.smartCharging === true && (
        // fund/stop lives in the grid-balance panel (this hover card is
        // pointer-transparent); the badge just reflects the programme
        <span style={{ color: theme.ok }}> · ⚡ smart charging</span>
      )}
    </div>
  );
}

function CloseX({ onClick }: { onClick: () => void }) {
  return (
    <button
      aria-label="close"
      onClick={onClick}
      style={{
        position: 'absolute',
        top: 4,
        right: 6,
        width: 20,
        height: 20,
        padding: 0,
        border: 'none',
        background: 'transparent',
        color: theme.slate,
        fontFamily: theme.font,
        fontSize: 14,
        cursor: 'pointer',
      }}
    >
      ×
    </button>
  );
}

function assetName(a: PlacedAsset): string {
  if (a.kind === 'gen') return GENS[a.gen].name;
  if (a.kind === 'sub') return SUBS[a.sub].name.split(' (')[0] ?? SUBS[a.sub].name;
  if (a.kind === 'depot') return 'Field depot';
  return `${a.level} kV line`;
}

/** Two game-days of performance: MW through the kit vs its rating. */
function Sparkline({ series }: { series: Array<[number, number, number]> }) {
  if (series.length < 2) return null;
  const w = 208;
  const h = 36;
  const maxCap = Math.max(...series.map((s) => s[2]), ...series.map((s) => s[1]), 1);
  const pts = series
    .map((s, i) => `${((i / (series.length - 1)) * w).toFixed(1)},${(h - (s[1] / maxCap) * h).toFixed(1)}`)
    .join(' ');
  const last = series[series.length - 1];
  const capY = h - ((last?.[2] ?? maxCap) / maxCap) * h;
  return (
    <div style={{ marginTop: 6 }}>
      <svg width={w} height={h} style={{ display: 'block', background: 'rgba(0,0,0,0.25)', borderRadius: 4 }}>
        <line x1={0} y1={capY} x2={w} y2={capY} stroke={theme.danger} strokeDasharray="3 3" strokeWidth={1} opacity={0.7} />
        <polyline points={pts} fill="none" stroke={theme.gold} strokeWidth={1.5} />
      </svg>
      <div style={{ fontSize: 10, color: theme.slate }}>
        last 2 days · dashed = rating · headroom now{' '}
        {Math.max(0, (last?.[2] ?? 0) - (last?.[1] ?? 0)).toFixed(1)} MW
      </div>
    </div>
  );
}

/** Inspector condition row (#15): derived health + build year. The UI
 *  reads the base curve (no loading hook — the heat accumulator lives in
 *  the worker; the curves agree whenever the kit isn't overloaded). */
function healthRow(asset: PlacedAsset, simTimeMin: number): [string, string] {
  const health = assetHealth(asset, simTimeMin);
  const builtAtMin =
    asset.kind === 'line' || asset.kind === 'sub' ? Math.max(0, asset.builtAtMin ?? 0) : 0;
  return ['health', `${health.toFixed(0)}% · built year ${Math.floor(builtAtMin / 525_600) + 1}`];
}

/** What to do about it — the spanner pin's promised advice. */
function fixAdvice(cause: string, kind: 'line' | 'tx'): string {
  if (cause.includes('overload')) {
    return kind === 'tx'
      ? 'fix: fit a bigger transformer (controls below) or share the load with another substation'
      : 'fix: re-conductor for +30% rating (below), run a second circuit, or move load off this corridor';
  }
  if (cause.includes('tree')) {
    return 'fix: trim the trees (tree cutting, fleet panel) or underground this span — cables ignore vegetation';
  }
  if (cause.includes('storm')) {
    return 'fix: underground this span/line — cables shrug storms off entirely';
  }
  if (cause.includes('cable')) {
    return 'cable faults are rare but slow to dig up — more vans shorten the outage';
  }
  return kind === 'tx'
    ? 'fix: transformers age — a bigger unit (below) or a GIS rebuild hardens the site'
    : 'fix: underground the span, or keep a crew close — depots cut travel time';
}

const ACTION_BTN: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 5,
  border: `1px solid ${theme.navyLight}`,
  background: 'transparent',
  color: theme.offWhite,
  fontFamily: theme.font,
  fontSize: 11,
  cursor: 'pointer',
  textAlign: 'left',
};

/** Pinned card for a clicked line span: what it is, how hard it works,
 *  what's left in it — and the underground-rebuild quote. */
function LineInfo({ assetId }: { assetId: number }) {
  const snapshot = useAppStore((s) => s.snapshot);
  const setSelected = useAppStore((s) => s.setSelected);
  const at = useAppStore((s) => s.selectedLineAt);
  if (!snapshot) return null;
  const line = snapshot.assets.find((a) => a.id === assetId);
  if (!line || line.kind !== 'line') return null;
  const endA = snapshot.assets.find((a) => a.id === line.a);
  const endB = snapshot.assets.find((a) => a.id === line.b);
  const b = snapshot.branches.find((br) => br.assetId === assetId && br.kind === 'line');
  const flow = b ? Math.abs(b.flowMW) : 0;
  const rating = b?.ratingMW ?? LINES[line.level].ratingMW;
  const peak = linePeaks.get(assetId) ?? 0;

  const rows: Array<[string, string]> = [
    ['voltage', `${line.level} kV`],
    ['build', line.build === 'underground' ? 'underground cable' : 'overhead line'],
    ['route', `${line.lengthTiles} km`],
    ['capex', fmtMoneyK(line.capexK)],
    healthRow(line, snapshot.simTimeMin),
  ];
  if (endA) rows.push(['from', assetName(endA)]);
  if (endB) rows.push(['to', assetName(endB)]);
  const job = snapshot.fleet.jobs.find((j) => j.assetId === assetId);
  if (b && b.outMin !== undefined) {
    rows.push([
      'status',
      b.outMin < 0
        ? job?.staffed
          ? 'TRIPPED · crew en route'
          : 'TRIPPED · awaiting crew (1 van)'
        : `TRIPPED · ${(b.outMin / 60).toFixed(1)}h to repair`,
    ]);
    if (b.cause) rows.push(['why', b.cause]);
  } else {
    rows.push(['loading', `${flow.toFixed(1)} / ${rating.toFixed(0)} MW (${((flow / rating) * 100).toFixed(0)}%)`]);
    rows.push(['headroom', `${Math.max(0, rating - flow).toFixed(1)} MW`]);
    if (b?.lossMW !== undefined) {
      // I²R at the current flow, priced at the running marginal price —
      // only a shorter or lower-r route cuts this (uprating doesn't)
      const lossKYr = (b.lossMW * snapshot.stats.priceMWh * 8760) / 1000;
      rows.push(['losses now', `${b.lossMW.toFixed(2)} MW (£${Math.round(lossKYr)}k/yr)`]);
    }
  }
  if (line.uprated) rows.push(['conductors', 'high-temp (+30% rating)']);
  if (peak > 0) rows.push(['peak seen', `${(peak * 100).toFixed(0)}% of rating`]);

  let ugQuote: { ok: boolean; capexK: number } | undefined;
  let spanQuote: { ok: boolean; capexK: number; km: number; whole: boolean } | undefined;
  if (line.build === 'overhead' && endA && endA.kind !== 'line' && endB && endB.kind !== 'line') {
    const map = getLondonMap();
    const q = priceLine(map, line.level, 'underground', endA.x, endA.y, endB.x, endB.y);
    ugQuote = { ok: q.ok, capexK: q.capexK };
    // the clicked span between two supports: amenity undergrounding
    if (at) {
      const span = spanAt(line, endA, endB, map.width, at.x, at.y);
      if (span) {
        const sq = priceLine(map, line.level, 'underground', span.ax, span.ay, span.bx, span.by);
        spanQuote = {
          ok: sq.ok,
          capexK: sq.capexK,
          km: sq.lengthTiles,
          whole: span.fromEnd && span.toEnd,
        };
      }
    }
  }

  return (
    <div>
      <div style={{ color: theme.orangeSoft, fontWeight: 700 }}>
        {line.level} kV circuit
        {b && b.outMin !== undefined && <span style={{ color: theme.danger }}> · TRIPPED</span>}
      </div>
      <div style={{ fontSize: 11 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ color: theme.slate, flex: 'none' }}>{k}</span>
            <span style={v.startsWith('TRIPPED') ? { color: theme.danger, textAlign: 'right' } : { textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>
      {b?.cause && (
        <div style={{ fontSize: 11, color: theme.orangeSoft, marginTop: 4 }}>
          {fixAdvice(b.cause, 'line')}
        </div>
      )}
      {!b?.cause && rating > 0 && flow / rating > 0.9 && (
        <div style={{ fontSize: 11, color: theme.warn, marginTop: 4 }}>
          headroom critical — re-conductor (below), run a second circuit, or shed load
        </div>
      )}
      {snapshot.watch?.assetId === assetId && <Sparkline series={snapshot.watch.series} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
        {line.build === 'overhead' && !line.uprated && (
          <button
            style={ACTION_BTN}
            title="High-temperature conductors on the same supports: +30% thermal rating"
            onClick={() => sendCommand({ type: 'uprateLine', assetId })}
          >
            ⚡ re-conductor (+30% rating) · {fmtMoneyK(Math.round(line.capexK * 0.6))}
          </button>
        )}
        {line.build === 'overhead' && spanQuote && !spanQuote.whole && at && (
          <button
            style={{ ...ACTION_BTN, opacity: spanQuote.ok ? 1 : 0.5 }}
            disabled={!spanQuote.ok}
            title="Bury just the span you clicked, between its two supports — the line surfaces at sealing-end towers either side"
            onClick={() =>
              sendCommand({
                type: 'undergroundSection',
                lineId: assetId,
                x: Math.round(at.x),
                y: Math.round(at.y),
              })
            }
          >
            ⤓ underground this span ({spanQuote.km} km) · {fmtMoneyK(spanQuote.capexK)}
          </button>
        )}
        {line.build === 'overhead' && (
          <button
            style={{ ...ACTION_BTN, opacity: ugQuote?.ok ? 1 : 0.5 }}
            disabled={!ugQuote?.ok}
            onClick={() => sendCommand({ type: 'convertLine', assetId })}
          >
            ⤓ underground the whole line · {fmtMoneyK(ugQuote?.capexK ?? 0)}
          </button>
        )}
        {line.build === 'overhead' && (
          <button
            style={ACTION_BTN}
            title="One-off emergency trim before the storm: halves this route's overgrowth"
            onClick={() => sendCommand({ type: 'stormPrep', action: 'vegCut', lineId: assetId })}
          >
            ✂ emergency veg cut · {fmtMoneyK(Math.round(line.lengthTiles * 4))}
          </button>
        )}
        <ConditionActions key={assetId} asset={line} />
        <button
          style={{ ...ACTION_BTN, color: theme.danger, borderColor: theme.danger }}
          onClick={() => {
            sendCommand({ type: 'demolish', assetId });
            setSelected({});
          }}
        >
          ✕ demolish line
        </button>
      </div>
    </div>
  );
}

function AssetInfo({ assetId }: { assetId: number }) {
  const snapshot = useAppStore((s) => s.snapshot);
  if (!snapshot) return null;
  const asset = snapshot.assets.find((a) => a.id === assetId);
  if (!asset || asset.kind === 'line') return null;

  const volts = snapshot.volts.filter(([id]) => id === assetId);
  const rows: Array<[string, string]> = [];

  if (asset.kind === 'depot') {
    const stationed = snapshot.fleet.vans.length;
    return (
      <div style={{ marginTop: 8, paddingTop: 6, borderTop: `1px solid ${theme.navyLight}` }}>
        <div style={{ color: theme.orangeSoft, fontWeight: 700 }}>Field depot</div>
        <div style={{ fontSize: 11, color: theme.slate }}>
          {stationed} van{stationed === 1 ? '' : 's'} in the fleet
        </div>
      </div>
    );
  }

  rows.push(['bays', assetLevels(asset).map((l) => `${l} kV`).join(' / ') || '—']);
  if (asset.kind === 'gen') {
    const spec = GENS[asset.gen];
    const mw = snapshot.genMW.find(([id]) => id === assetId)?.[1] ?? 0;
    if (asset.gen === 'battery') {
      const soc = snapshot.soc.find(([id]) => id === assetId)?.[1] ?? 0;
      rows.push([
        mw < 0 ? 'charging' : 'discharging',
        `${Math.abs(mw).toFixed(1)} / ${spec.capacityMW} MW`,
      ]);
      rows.push(['stored', `${soc.toFixed(0)} / ${spec.energyMWh ?? 0} MWh`]);
    } else if (asset.gen === 'interconnector') {
      rows.push(['importing', `${mw.toFixed(1)} / ${spec.capacityMW} MW`]);
      // the same deterministic series dispatch buys at, quoted live
      rows.push([
        'import price now',
        `£${nationalPriceMWh(snapshot.simTimeMin, snapshot.weather).toFixed(0)}/MWh`,
      ]);
    } else if (asset.gen === 'electrolyser') {
      const soc = snapshot.soc.find(([id]) => id === assetId)?.[1] ?? 0;
      rows.push(['soaking', `${Math.abs(Math.min(0, mw)).toFixed(1)} / ${spec.capacityMW} MW`]);
      rows.push(['H₂ store', `${soc.toFixed(0)} / ${spec.energyMWh ?? 0} MWh`]);
    } else {
      // farm-scaled plant carries its awarded (land-capped) capacity
      rows.push(['output', `${mw.toFixed(1)} / ${asset.mw ?? spec.capacityMW} MW`]);
      if (asset.ppaMWh !== undefined) rows.push(['PPA strike', `£${asset.ppaMWh}/MWh`]);
      else rows.push(['marginal cost', `£${(spec.marginalCostK * 1000).toFixed(0)}/MWh`]);
    }
  } else {
    const spec = SUBS[asset.sub];
    const tx = snapshot.branches.find((b) => b.assetId === assetId && b.kind === 'tx');
    if (tx && tx.outMin !== undefined) {
      rows.push([
        'transformer',
        tx.outMin < 0 ? 'TRIPPED · awaiting crew (1 van)' : `TRIPPED · ${(tx.outMin / 60).toFixed(1)}h to repair`,
      ]);
      if (tx.cause) rows.push(['why', tx.cause]);
    } else if (tx) {
      rows.push(['transformer', `${Math.abs(tx.flowMW).toFixed(1)} / ${tx.ratingMW} MW`]);
    }
    const mva = subMva(asset);
    if (spec.serviceRadius !== undefined) {
      rows.push(['service radius', `${subRadius(asset.sub, mva).toFixed(1)} km`]);
    }
    if (asset.sub !== 'tee') {
      rows.push(['build', asset.underground ? 'underground (GIS)' : 'outdoor (AIS)']);
    }
    if (asset.sub === 'capbank') {
      rows.push(['voltage support', `+${CAPBANK_BOOST_PU.toFixed(2)} pu at and downstream of its bus`]);
    }
    rows.push(healthRow(asset, snapshot.simTimeMin));
    const sec = snapshot.security?.find(([id]) => id === assetId)?.[1];
    if (sec !== undefined) {
      rows.push(['N-1 security', sec ? 'secure ✓' : 'AT RISK — single point of failure']);
    }
    rows.push(['capex', fmtMoneyK(subCapexK(asset.sub, mva) * (asset.underground ? SUB_UG_MUL : 1))]);
  }
  for (const [, level, v] of volts) {
    rows.push([`${level} kV bus`, v > 0 ? `${v.toFixed(3)} pu` : 'de-energized']);
  }
  // every bus dark + nothing tripped here = the problem is UPSTREAM
  const tripped = snapshot.branches.some((b) => b.assetId === assetId && b.outMin !== undefined);
  const dead = volts.length > 0 && volts.every(([, , v]) => v <= 0);

  const name = asset.kind === 'gen' ? GENS[asset.gen].name : SUBS[asset.sub].name;
  return (
    <div style={{ marginTop: 8, paddingTop: 6, borderTop: `1px solid ${theme.navyLight}` }}>
      <div style={{ color: theme.orangeSoft, fontWeight: 700 }}>
        {name}
        {asset.kind === 'sub' && asset.idno ? ' · iDNO' : ''}
      </div>
      {dead && (
        <div style={{ fontSize: 11, color: theme.danger, fontWeight: 700 }}>
          DE-ENERGIZED — {tripped ? 'kit here has tripped; a crew is needed' : 'no live path to a generator: trace the circuit upstream for a tripped or missing link'}
        </div>
      )}
      <div style={{ fontSize: 11 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: theme.slate }}>{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>
      {(() => {
        const tx = snapshot.branches.find((b) => b.assetId === assetId && b.kind === 'tx');
        if (tx?.cause) {
          return (
            <div style={{ fontSize: 11, color: theme.orangeSoft, marginTop: 4 }}>
              {fixAdvice(tx.cause, 'tx')}
            </div>
          );
        }
        if (tx && tx.ratingMW > 0 && Math.abs(tx.flowMW) / tx.ratingMW > 0.9) {
          return (
            <div style={{ fontSize: 11, color: theme.warn, marginTop: 4 }}>
              transformer near its limit — step the MVA up (below) before it cooks
            </div>
          );
        }
        return null;
      })()}
      {snapshot.watch?.assetId === assetId && <Sparkline series={snapshot.watch.series} />}
      {asset.kind === 'gen' && (
        <div style={{ marginTop: 4 }}>
          <Sparkline
            series={Array.from({ length: 24 }, (_, h) => [
              h * 60,
              (asset.mw ?? GENS[asset.gen].capacityMW) * availAt(asset.gen, h),
              asset.mw ?? GENS[asset.gen].capacityMW,
            ])}
          />
          <div style={{ fontSize: 10, color: theme.slate }}>
            availability profile (typical day)
          </div>
        </div>
      )}
      {asset.kind === 'gen' && asset.gen === 'battery' && (
        <BatteryPolicyControls assetId={asset.id} policy={asset.policy ?? 'shave'} />
      )}
      {asset.kind === 'gen' && asset.gen === 'gasPeaker' && (
        <div style={{ pointerEvents: 'auto', marginTop: 6 }}>
          {asset.h2 ? (
            <div style={{ fontSize: 11, color: theme.gold }}>
              hydrogen-fired — burns the H₂ store first, gas when the tanks run dry
            </div>
          ) : (
            <button
              style={{ ...ACTION_BTN, width: '100%' }}
              onClick={() => sendCommand({ type: 'convertToH2', assetId: asset.id })}
            >
              ⚗ convert to hydrogen firing
            </button>
          )}
        </div>
      )}
      {asset.kind === 'sub' && !asset.idno && SUBS[asset.sub].mvaSteps && (
        <MvaControls assetId={asset.id} sub={asset.sub} mva={subMva(asset)} auto={asset.mvaAuto !== false} />
      )}
      {asset.kind === 'sub' && !asset.idno && !asset.underground && asset.sub !== 'tee' && (
        <div style={{ pointerEvents: 'auto', marginTop: 6 }}>
          <button
            style={{ ...ACTION_BTN, width: '100%' }}
            onClick={() => sendCommand({ type: 'convertSub', assetId })}
          >
            ⤓ rebuild underground (GIS) · +
            {fmtMoneyK(subCapexK(asset.sub, subMva(asset)) * (SUB_UG_MUL - 1))}
          </button>
        </div>
      )}
      {asset.kind === 'sub' && <ConditionActions key={asset.id} asset={asset} />}
    </div>
  );
}

/** Condition actions (#15/#16) for an aged line/substation: replace
 *  like-for-like below 50% health, schedule a maintenance night below
 *  80%. When switching the kit out would cut customers off (no alternate
 *  path — a pure topological screen mirroring the N-1 machinery), the
 *  button warns and takes a second click to confirm. Keyed by asset id
 *  at the call sites so the confirm state resets per asset. */
function ConditionActions({ asset }: { asset: PlacedAsset }) {
  const snapshot = useAppStore((s) => s.snapshot);
  const [armed, setArmed] = useState(false);
  const ageing =
    asset.kind === 'line' || (asset.kind === 'sub' && !asset.idno);
  const health = snapshot && ageing ? assetHealth(asset, snapshot.simTimeMin) : 100;
  const branchId = ageing ? maintenanceBranchOf(asset) : undefined;
  const canMaintain = branchId !== undefined && health < MAINT_HEALTH_BELOW;
  const cuts = useMemo(
    () =>
      snapshot && canMaintain && branchId !== undefined
        ? maintenanceCutsSupply(snapshot.assets, branchId)
        : false,
    [snapshot, canMaintain, branchId],
  );
  if (!snapshot || !ageing) return null;
  if (health >= MAINT_HEALTH_BELOW) return null;
  const capexK = assetCapexK(asset);
  return (
    <div
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        marginTop: 6,
      }}
    >
      {health < REPLACE_HEALTH_BELOW && (
        <button
          style={ACTION_BTN}
          title="New kit on the old easements and civils — that's why it's cheaper than a new build. Resets condition to 100%."
          onClick={() => sendCommand({ type: 'replaceAsset', assetId: asset.id })}
        >
          ♻ replace like-for-like · {fmtMoneyK(Math.round(capexK * REPLACE_COST_FRAC))}
        </button>
      )}
      {canMaintain && (
        <button
          style={armed ? { ...ACTION_BTN, color: theme.danger, borderColor: theme.danger } : ACTION_BTN}
          title="Switch it out tonight 01:00–05:00 (planned outage, no repair crew) — condition +25 on completion"
          onClick={() => {
            if (cuts && !armed) {
              setArmed(true);
              return;
            }
            setArmed(false);
            sendCommand({ type: 'scheduleMaintenance', assetId: asset.id });
          }}
        >
          🔧 schedule maintenance tonight (01:00–05:00) ·{' '}
          {fmtMoneyK(Math.round(capexK * MAINT_COST_FRAC))}
        </button>
      )}
      {canMaintain && cuts && (
        <div style={{ fontSize: 11, color: armed ? theme.danger : theme.warn }}>
          ⚠ no alternate path: customers WILL lose supply during the window
          {armed ? ' — click again to confirm' : ''}
        </div>
      )}
    </div>
  );
}

const BATTERY_POLICIES: Array<{ id: BatteryPolicy; label: string; title: string }> = [
  {
    id: 'shave',
    label: 'shave',
    title:
      'Peak shave (default): charge on cheap local surplus, discharge into the local evening peak',
  },
  {
    id: 'arbitrage',
    label: 'arbitrage',
    title:
      'Arbitrage: charge while the national price is under £60/MWh, discharge over £110/MWh — local peak or not',
  },
  {
    id: 'reserve',
    label: 'reserve',
    title:
      'Reserve: hold at least 50% charged; discharge only when this island would otherwise go dark',
  },
];

/** Battery dispatch policy selector (ROADMAP #12). Like MvaControls it
 *  sits in the pointer-transparent info panel, so it re-enables pointer
 *  events for itself. */
function BatteryPolicyControls({ assetId, policy }: { assetId: number; policy: BatteryPolicy }) {
  return (
    <div
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
        fontSize: 11,
      }}
    >
      <span style={{ color: theme.slate, flex: 'none' }}>policy</span>
      {BATTERY_POLICIES.map((p) => (
        <button
          key={p.id}
          title={p.title}
          aria-label={`battery policy ${p.id}`}
          onClick={() => sendCommand({ type: 'setBatteryPolicy', assetId, policy: p.id })}
          style={{
            flex: 1,
            padding: '2px 3px',
            borderRadius: 4,
            border: `1px solid ${policy === p.id ? theme.orange : theme.navyLight}`,
            background: policy === p.id ? theme.orange : 'transparent',
            color: policy === p.id ? theme.navy : theme.slate,
            fontFamily: theme.font,
            fontSize: 10,
            cursor: 'pointer',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/** Transformer sizing: step through the fixed MVA sizes, or hand it back
 *  to auto-reinforcement. Sits inside the (pointer-transparent) info
 *  panel, so the controls re-enable pointer events for themselves. */
function MvaControls({
  assetId,
  sub,
  mva,
  auto,
}: {
  assetId: number;
  sub: SubType;
  mva: number;
  auto: boolean;
}) {
  const steps = SUBS[sub].mvaSteps ?? [];
  const ix = steps.indexOf(mva);
  const btn: React.CSSProperties = {
    width: 20,
    height: 18,
    padding: 0,
    borderRadius: 4,
    border: `1px solid ${theme.navyLight}`,
    background: 'transparent',
    color: theme.offWhite,
    fontFamily: theme.font,
    fontSize: 11,
    cursor: 'pointer',
  };
  return (
    <div
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
        fontSize: 11,
      }}
    >
      <span style={{ color: theme.slate }}>transformer</span>
      <button
        aria-label="smaller transformer"
        style={btn}
        disabled={ix <= 0}
        onClick={() => {
          const next = steps[ix - 1];
          if (next !== undefined) sendCommand({ type: 'setSubMva', assetId, mva: next });
        }}
      >
        −
      </button>
      <span style={{ color: theme.gold }}>{mva} MVA</span>
      <button
        aria-label="bigger transformer"
        style={btn}
        disabled={ix < 0 || ix >= steps.length - 1}
        onClick={() => {
          const next = steps[ix + 1];
          if (next !== undefined) sendCommand({ type: 'setSubMva', assetId, mva: next });
        }}
      >
        +
      </button>
      <button
        aria-label="auto reinforcement"
        style={{
          ...btn,
          width: 'auto',
          padding: '0 6px',
          color: auto ? theme.navy : theme.slate,
          background: auto ? theme.orange : 'transparent',
          border: `1px solid ${auto ? theme.orange : theme.navyLight}`,
        }}
        onClick={() => sendCommand({ type: 'setSubMva', assetId, auto: !auto })}
      >
        auto
      </button>
    </div>
  );
}

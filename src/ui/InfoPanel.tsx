import { useAppStore } from '../app/store';
import { getLondonMap } from '../data/londonMap';
import { GENS, SUBS } from '../sim/catalog';
import { assetAtTile } from '../sim/commands';
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
};

const TERRAIN_NAMES: Record<Terrain, string> = {
  [TERRAIN.water]: 'Water',
  [TERRAIN.land]: 'Land',
  [TERRAIN.hill]: 'Hills',
  [TERRAIN.trees]: 'Woodland',
};

const COV_BADGE: Record<number, { label: string; color: string }> = {
  [COV.unserved]: { label: 'no network', color: theme.slate },
  [COV.on]: { label: 'on supply', color: theme.ok },
  [COV.brownout]: { label: 'brownout', color: theme.warn },
  [COV.off]: { label: 'blackout', color: theme.danger },
};

export function InfoPanel() {
  const hovered = useAppStore((s) => s.hoveredTile);
  const snapshot = useAppStore((s) => s.snapshot);
  if (!hovered) return null;

  const map = getLondonMap();
  const i = hovered.y * map.width + hovered.x;
  const terrain = (map.terrain[i] ?? TERRAIN.land) as Terrain;
  const zone = (map.zone[i] ?? ZONE.none) as Zone;
  const councilId = map.council[i] ?? NO_COUNCIL;
  const council = councilId === NO_COUNCIL ? undefined : map.councils[councilId];
  const customers = map.customers[i] ?? 0;
  const road = map.road[i] === 1;
  const cov = snapshot?.coverage[i] ?? COV.empty;
  const badge = COV_BADGE[cov];

  const asset = snapshot ? assetAtTile(snapshot.assets, hovered.x, hovered.y) : undefined;

  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        top: 12,
        right: 12,
        width: 240,
        padding: '10px 14px',
        pointerEvents: 'none',
        lineHeight: 1.5,
      }}
    >
      <div style={{ color: theme.orange, fontWeight: 700 }}>
        {road ? 'Street' : ZONE_NAMES[zone]}
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

function AssetInfo({ assetId }: { assetId: number }) {
  const snapshot = useAppStore((s) => s.snapshot);
  if (!snapshot) return null;
  const asset = snapshot.assets.find((a) => a.id === assetId);
  if (!asset || asset.kind === 'line') return null;

  const volts = snapshot.volts.filter(([id]) => id === assetId);
  const rows: Array<[string, string]> = [];

  if (asset.kind === 'gen') {
    const spec = GENS[asset.gen];
    const mw = snapshot.genMW.find(([id]) => id === assetId)?.[1] ?? 0;
    rows.push(['output', `${mw.toFixed(1)} / ${spec.capacityMW} MW`]);
    rows.push(['marginal cost', `£${(spec.marginalCostK * 1000).toFixed(0)}/MWh`]);
  } else {
    const spec = SUBS[asset.sub];
    const tx = snapshot.branches.find((b) => b.assetId === assetId && b.kind === 'tx');
    if (tx) rows.push(['transformer', `${Math.abs(tx.flowMW).toFixed(1)} / ${tx.ratingMW} MW`]);
    if (spec.serviceRadius !== undefined) rows.push(['service radius', `${spec.serviceRadius} km`]);
    rows.push(['capex', fmtMoneyK(spec.capexK)]);
  }
  for (const [, level, v] of volts) {
    rows.push([`${level} kV bus`, v > 0 ? `${v.toFixed(3)} pu` : 'de-energized']);
  }

  const name = asset.kind === 'gen' ? GENS[asset.gen].name : SUBS[asset.sub].name;
  return (
    <div style={{ marginTop: 8, paddingTop: 6, borderTop: `1px solid ${theme.navyLight}` }}>
      <div style={{ color: theme.orangeSoft, fontWeight: 700 }}>{name}</div>
      <div style={{ fontSize: 11 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: theme.slate }}>{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

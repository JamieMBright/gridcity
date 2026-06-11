import { useAppStore } from '../app/store';
import { getLondonMap } from '../data/londonMap';
import { NO_COUNCIL, TERRAIN, ZONE, type Terrain, type Zone } from '../sim/map/types';
import { theme } from './theme';

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

export function InfoPanel() {
  const hovered = useAppStore((s) => s.hoveredTile);
  if (!hovered) return null;

  const map = getLondonMap();
  const i = hovered.y * map.width + hovered.x;
  const terrain = (map.terrain[i] ?? TERRAIN.land) as Terrain;
  const zone = (map.zone[i] ?? ZONE.none) as Zone;
  const councilId = map.council[i] ?? NO_COUNCIL;
  const council = councilId === NO_COUNCIL ? undefined : map.councils[councilId];
  const customers = map.customers[i] ?? 0;
  const road = map.road[i] === 1;

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        width: 230,
        padding: '10px 14px',
        background: `${theme.navy}e6`,
        border: `1px solid ${theme.navyLight}`,
        borderRadius: 8,
        color: theme.offWhite,
        fontFamily: theme.font,
        fontSize: 13,
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
        <div style={{ marginTop: 6, color: theme.gold }}>{customers} customers</div>
      )}
    </div>
  );
}

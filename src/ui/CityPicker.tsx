// The New Game city picker: choose which world to power. London + Paris are
// PLAYABLE now (committed map data); the rest of the roster is listed as
// "coming soon" (no committed artifact yet) so the shape of the game-to-come
// is visible but unselectable. Open to all for now (owner: "open to all for
// now so I can test") — no rank gating. Lofi dusk styling, in the same world
// as the start menu; works desktop + phone held landscape (a scrolling grid).

import { CITY_DATA_IDS } from '../data/scenarioData';
import { theme } from './theme';

interface CityCard {
  id: string;
  name: string;
  /** One-line flavour, in the dusk register. */
  blurb: string;
  /** Difficulty 1–10 (design doc); shown as pips. */
  difficulty: number;
}

// The full roster (docs/multi-city-and-rank.md). `id` matches a registered
// scenario id where one exists; the coming-soon entries use a descriptive id.
// PLAYABLE = london + whatever has a committed map artifact (CITY_DATA_IDS),
// so adding a city's data file flips it playable here automatically.
const ROSTER: CityCard[] = [
  { id: 'london', name: 'London', blurb: 'The Thames, the green belt, the Essex estuary.', difficulty: 3 },
  { id: 'paris', name: 'Paris', blurb: 'Haussmann limestone and the calm grey Seine.', difficulty: 4 },
  { id: 'sydney', name: 'Sydney', blurb: 'Harbour sprawl, rooftop solar, bushfire summers.', difficulty: 4 },
  { id: 'newyork', name: 'New York', blurb: 'The grid, the boroughs, a 60 Hz heatwave.', difficulty: 6 },
  { id: 'berlin', name: 'Berlin', blurb: 'Grey render and ochre, ringed by wind.', difficulty: 5 },
  { id: 'shanghai', name: 'Shanghai', blurb: 'Pudong towers fed by UHV from afar.', difficulty: 7 },
  { id: 'hongkong', name: 'Hong Kong', blurb: 'Vertical density; you own the generation.', difficulty: 6 },
  { id: 'capetown', name: 'Cape Town', blurb: 'Table Mountain, Bo-Kaap pastels, load-shedding.', difficulty: 6 },
  { id: 'cairo', name: 'Cairo', blurb: 'Nile ribbon, desert sprawl, sandstorm soiling.', difficulty: 7 },
  { id: 'athens', name: 'Athens', blurb: 'Attica basin, Aegean links, the meltemi wind.', difficulty: 5 },
  { id: 'pune', name: 'Pune', blurb: 'Monsoon afternoons and a booming tech corridor.', difficulty: 6 },
  { id: 'northeast', name: 'North-East England', blurb: 'Tyne, Tees, and a coast full of offshore wind.', difficulty: 4 },
];

function Pips({ n }: { n: number }): React.JSX.Element {
  return (
    <span style={{ letterSpacing: 1 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} style={{ color: i < n ? theme.orangeSoft : 'rgba(141,151,180,0.3)', fontSize: 9 }}>
          {i < n ? '◆' : '◇'}
        </span>
      ))}
    </span>
  );
}

export function CityPicker({
  onPick,
  onClose,
}: {
  onPick: (scenarioId: string) => void;
  onClose: () => void;
}): React.JSX.Element {
  // a city is playable when it has a committed map (london is always drawn;
  // the rest need a registered data artifact)
  const playable = (id: string): boolean => id === 'london' || CITY_DATA_IDS.includes(id);

  return (
    <div
      role="dialog"
      aria-label="choose a city"
      style={{
        position: 'absolute',
        inset: 0,
        background: `${theme.night}d8`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 12,
        overflowY: 'auto',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(860px, 96vw)',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: 20,
          padding: '22px 22px 18px',
          background: 'rgba(13, 17, 36, 0.92)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(125, 135, 180, 0.28)',
          boxShadow: '0 24px 90px rgba(0, 0, 0, 0.6)',
          color: theme.offWhite,
          fontFamily: theme.font,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.04em' }}>
              <span style={{ color: theme.orange }}>⚡ </span>choose a city
            </div>
            <div style={{ color: theme.slate, fontSize: 12, marginTop: 4 }}>
              power a new network. more cities are coming online.
            </div>
          </div>
          <button
            aria-label="close"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid rgba(125,135,180,0.35)',
              color: theme.slate,
              borderRadius: 8,
              width: 30,
              height: 30,
              cursor: 'pointer',
              fontSize: 15,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            marginTop: 16,
            display: 'grid',
            // responsive: 3-up desktop, gracefully 2/1-up as the modal narrows
            // (a phone held landscape lands ~2-up and scrolls)
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {ROSTER.map((c) => {
            const open = playable(c.id);
            return (
              <button
                key={c.id}
                disabled={!open}
                onClick={() => open && onPick(c.id)}
                title={open ? `power ${c.name}` : `${c.name} — coming soon`}
                style={{
                  textAlign: 'left',
                  padding: '14px 14px 12px',
                  borderRadius: 14,
                  cursor: open ? 'pointer' : 'not-allowed',
                  border: open
                    ? '1px solid rgba(255, 138, 30, 0.45)'
                    : '1px solid rgba(125, 135, 180, 0.18)',
                  background: open
                    ? 'linear-gradient(180deg, rgba(255,138,30,0.14) 0%, rgba(255,138,30,0.05) 100%)'
                    : 'rgba(255, 255, 255, 0.02)',
                  color: open ? theme.offWhite : theme.slate,
                  opacity: open ? 1 : 0.62,
                  fontFamily: theme.font,
                  position: 'relative',
                  boxShadow: open ? '0 4px 22px rgba(255, 138, 30, 0.16)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.03em' }}>
                    {c.name}
                  </span>
                  {open ? (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        color: theme.gold,
                        border: `1px solid ${theme.gold}`,
                        borderRadius: 6,
                        padding: '2px 6px',
                      }}
                    >
                      PLAY
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        color: theme.slate,
                        border: '1px solid rgba(125,135,180,0.35)',
                        borderRadius: 6,
                        padding: '2px 6px',
                      }}
                    >
                      SOON
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, marginTop: 6, lineHeight: 1.35, minHeight: 30 }}>
                  {c.blurb}
                </div>
                <div style={{ marginTop: 8, fontSize: 9, color: theme.slate, letterSpacing: '0.06em' }}>
                  difficulty <Pips n={c.difficulty} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

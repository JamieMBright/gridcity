# ⚡ ElectriCity

You don't build the city — you **power** it. A browser strategy game where you
play the electricity network operator (think UK Power Networks) for a stylized
London → Essex region: build generation, string 400/132/33 kV lines, place
substations and depots, and keep the lights on through storms, tree growth and
the electrification of everything.

**Capital is unlimited — but every pound lands on customer bills.** You're
scored the way real DNOs are: average bill, CI/CML reliability, carbon
intensity, curtailment, customer satisfaction — graded every 5 game-years in
RIIO-style report cards.

## Playing

- **Start menu** — continue, new game, or the 7-step tutorial. Sign in
  (email + one-time code, no passwords) to sync saves and join the leaderboard.
- **The city** — a 256×160 London: meandering radials and an orbital
  motorway with live traffic, skyscraper districts, and the landmarks
  (parliament + clock tower, the wheel, the dome, the shard, tower bridge,
  the Olympic bowl, malls, the zoo, the old four-chimney power station).
- **Build the wires, signal the generation** — you own the network
  (substations down to pole-mounted transformers and under-building
  vaults, lines, depots); generation is a developer market. Placing a
  plant designates the site as a planning signal: fake businesses
  (Voltaic Brothers plc, Consolidated Power Holdings…) bid with strike
  prices and lead times, and you award or withdraw. Cross a conglomerate
  and it complains to the regulator. Substations come in fixed MVA sizes
  with load-based catchments and auto-reinforcement. Hotkeys: `1–9 0`
  generation, `Q W E R T` substations, `Z X C` line voltage, `U` flips
  overhead/underground, `D` depot, `B` bulldoze. Green/red overlays show
  siting suitability; big plant takes planning + construction time
  (coal spreads over 3×2 tiles, cooling towers and all).
- **The town evolves** — the game opens with live connection
  applications; data centres arrive uninvited in dense urban blocks and
  sulk under angry bubbles until energised; new homes infill near
  well-served streets — sometimes right where your headroom wasn't.
- **The network looks real** — overhead routes place lattice pylons
  (400/132 kV) or three-phase wooden poles (33 kV) that snap along the
  route, conductors sag span to span, chevrons ride each line in the
  direction of power flow, and turbines actually turn with the wind.
- **Watch** — the market dispatches itself (merit order, PPAs, batteries,
  tides); the ticker shows frequency, price, carbon and weather. `G` for
  grid view, `K` for the regulator's KPI dashboard, space to pause.
- **React** — faults raise jobs for your orange vans; councils electrify
  (EVs, heat pumps, rooftop PV) and overload networks you thought were done;
  the inbox brings connection applications (firm vs flexible) and innovation
  pitches funded by the levy.
- **The bill** — network costs are socialized across every home in the
  licence area (the way DUoS really works), so the headline £/home/yr is
  meaningful from your very first substation.

## Development

```bash
npm install
npm run dev        # local game at :5173
npm test           # 68 unit tests (solver, market, reliability, regulation)
npm run test:e2e   # 36 Playwright tests driving the real canvas + UI
npm run build      # production bundle
```

The whole simulation is dependency-free TypeScript in `src/sim/**`, running in
a Web Worker: DC power flow with real loop physics (hand-rolled LU), islanding,
voltage estimation, thermal trips, seeded weather/faults, council adoption,
bills and RIIO scoring. Rendering is PixiJS over a code-drawn isometric art
atlas (no image assets anywhere — sprites, UI and the lofi soundtrack are all
synthesized).

Backend (optional): Supabase project with RLS'd `profiles`, `saves`,
`settings`, `leaderboard`. The client is env-gated — `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` override the bundled defaults — and the game is fully
playable as a guest without it.

## Deploying

Static Vite build: import the repo into Vercel (framework preset “Vite”) and
every push deploys. No server-side compute — the sim runs in the player's tab.

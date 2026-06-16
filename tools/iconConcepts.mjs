// CONCEPT EXPLORATION — bespoke iPhone home-screen icon candidates for ElectriCity.
//
// The owner rejected the abstract "Node" redesign ("kinda trash") and the
// current home-screen icon is the old pylon+bolt+grey-buildings raster
// (public/apple-touch-icon.png). This tool draws 4 fresh code-drawn concepts,
// rasterises each at 180/120/60px, simulates the iOS rounded mask (~22%) for a
// fair home-screen read, and assembles a side-by-side comparison sheet on both
// a light and a dark home-screen-ish backdrop so the owner can pick at a glance.
//
// This does NOT touch the live app icons — output goes to preview/icon-concepts/
// only. All art is CODE (SVG built from the theme tokens, rasterised via the
// installed Chromium canvas, the same path tools/resizeIcon.mjs uses).
//
// Palette is the ElectriCity dusk gamut (src/ui/theme.ts):
//   navy #101630  navyLight #1d2547  night #0a0e22
//   orange #ff8a1e  orangeSoft #ffb066  gold #f5c469
//   dusk #3a2b50 (sunset purple)  sunset #e0697a (dusty pink)
//   offWhite #f2efe8  slate #8d97b4
//
// iOS icon craft applied (color-theory + game-ui-design skills):
//   - strong simple SILHOUETTE that survives at 60px and in grayscale
//   - figure-ground contrast: warm figure on deep-navy ground (>3:1)
//   - the glow is a HOT-WHITE core inside a warm bloom (avoids the neon
//     "halation" that fully-saturated orange edges cause on dark — see
//     color-theory sharp_edges "dark-mode-saturation-burn")
//   - FULL-BLEED: the OS applies its own corner mask; we never bake corners
//   - safe-area aware: key shapes stay inside the ~88% centre so the rounded
//     mask never clips the subject

import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

// ---------------------------------------------------------------------------
// palette
const C = {
  navy: '#101630',
  navyLight: '#1d2547',
  night: '#0a0e22',
  midnight: '#070a1c',
  orange: '#ff8a1e',
  orangeSoft: '#ffb066',
  gold: '#f5c469',
  goldPale: '#ffe3a6',
  dusk: '#3a2b50',
  duskWarm: '#5a3a5e',
  sunset: '#e0697a',
  sunsetPale: '#f3a07e',
  offWhite: '#f2efe8',
  slate: '#8d97b4',
  ink: '#0a0c1c',
};

// shared filter defs (soft warm glow) — referenced by id inside each concept
const FILTERS = `
  <filter id="glowSm" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="2.2" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="glowMd" x="-80%" y="-80%" width="260%" height="260%">
    <feGaussianBlur stdDeviation="4.5" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="glowLg" x="-120%" y="-120%" width="340%" height="340%">
    <feGaussianBlur stdDeviation="9" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
`;

// a warm window/fairy-light bulb: hot core in a tight bloom
const bulb = (x, y, r, core = C.goldPale, halo = C.gold) =>
  `<circle cx="${x}" cy="${y}" r="${r * 2.4}" fill="${halo}" opacity="0.28"/>` +
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${core}"/>`;

// ---------------------------------------------------------------------------
// All concepts draw into a 0..240 viewBox (2x of 120 for crisp downscale).
const VB = 240;

// CONCEPT A — DUSK SKYLINE & BOLT
// The game's literal thesis: a glowing bolt strikes down into a recognisable
// London skyline and the city lights up. Bottom-weighted silhouette; sunset
// gradient sky; warm lit windows as fairy-light points; the bolt is the hero,
// hot-white-cored so it reads at 60px.
function conceptSkyline() {
  // skyline silhouette path (recognisable: terraces -> Gherkin -> Shard spire
  // -> BT tower -> blocks). Drawn as one filled silhouette across the base.
  const sky = `M0 240 L0 176
    L18 176 L18 150 L34 150 L34 176
    L48 176 L48 132 L58 120 L68 132 L68 176
    L84 176 L84 110 L92 110 L92 176
    L104 176 L104 96 L112 78 L120 96 L120 176
    L132 176 L132 70 L140 52 L148 70 L148 176
    L160 176 L160 118 L172 118 L172 100 L182 100 L182 176
    L196 176 L196 138 L210 138 L210 158 L224 158 L224 176
    L240 176 L240 240 Z`;
  // lit windows scattered on the towers
  const wins = [
    [26, 162], [26, 170], [56, 150], [62, 162], [88, 130], [88, 150], [88, 164],
    [112, 120], [112, 140], [112, 158], [140, 92], [140, 114], [140, 138], [140, 160],
    [166, 132], [166, 150], [176, 116], [203, 150], [216, 166],
  ].map(([x, y]) => bulb(x, y, 2.0)).join('');
  return `
  <defs>
    <linearGradient id="A_sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.night}"/>
      <stop offset="0.42" stop-color="${C.dusk}"/>
      <stop offset="0.72" stop-color="${C.duskWarm}"/>
      <stop offset="0.92" stop-color="${C.sunset}"/>
      <stop offset="1" stop-color="${C.sunsetPale}"/>
    </linearGradient>
    <radialGradient id="A_boltGlow" cx="0.5" cy="0.4" r="0.55">
      <stop offset="0" stop-color="${C.goldPale}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${C.goldPale}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="A_bolt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.45" stop-color="${C.goldPale}"/>
      <stop offset="1" stop-color="${C.orange}"/>
    </linearGradient>
    ${FILTERS}
  </defs>
  <rect width="${VB}" height="${VB}" fill="url(#A_sky)"/>
  <!-- low sun haze behind the city -->
  <ellipse cx="120" cy="184" rx="150" ry="60" fill="${C.gold}" opacity="0.18" filter="url(#glowLg)"/>
  <!-- bolt aura -->
  <rect x="60" y="14" width="120" height="150" fill="url(#A_boltGlow)"/>
  <!-- city silhouette -->
  <path d="${sky}" fill="${C.midnight}"/>
  <path d="${sky}" fill="none" stroke="${C.orangeSoft}" stroke-width="1.4" stroke-linejoin="round" opacity="0.35"/>
  <!-- warm reflected glow on the rooftops -->
  <rect x="0" y="166" width="240" height="14" fill="${C.orange}" opacity="0.16"/>
  ${wins}
  <!-- the energised bolt, hero -->
  <g filter="url(#glowMd)">
    <path d="M150 22 L96 116 L124 116 L108 178 L168 96 L134 96 Z"
          fill="url(#A_bolt)" stroke="${C.ink}" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M150 22 L96 116 L124 116 L108 178 L168 96 L134 96 Z"
          fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round" opacity="0.85"/>
  </g>`;
}

// CONCEPT B — THE LIT PYLON
// A single bold lattice transmission pylon, centred, on a vertical sunset
// gradient (deep navy crown -> dusty-pink/gold horizon at the base). The
// operator's icon. Conductors catch warm light; insulator nodes glow. The
// refined successor to the old pylon — pylon as hero, no bolt/building clutter.
function conceptPylon() {
  // pylon built from a symmetric lattice. Centre x=120. BOLD members + a solid
  // silhouette-mass underlay so the tower survives at 60px (the thin-lattice
  // first pass vanished small — game-ui-design: "readable on the worst device").
  const steel = '#c2cadc'; // brighter than slate so it reads against the gradient
  const steelDk = '#7e88a3';
  const steelHi = C.offWhite;
  const w = 4.2; // chunky main members
  // SOLID silhouette mass: a filled hourglass body + legs so a 60px reader sees
  // a confident pylon SHAPE, not a tangle of hairlines. Sits under the lattice.
  const massBody = `M111 66 L129 66 L142 124 L156 226 L150 226 L120 150 L90 226 L84 226 L98 124 Z`;
  const mass = `<path d="${massBody}" fill="${steelDk}" opacity="0.55"/>`;
  // legs (splayed) + body taper + earth peak
  const legs = `
    <path d="M84 226 L111 66" stroke="${steel}" stroke-width="${w}"/>
    <path d="M156 226 L129 66" stroke="${steel}" stroke-width="${w}"/>
    <path d="M120 66 L120 226" stroke="${steel}" stroke-width="${w - 0.8}"/>`;
  // lattice cross-bracing (X's down the body) — fewer, bolder rows
  const braces = [];
  const rows = [
    [66, 92], [92, 124], [124, 162], [162, 226],
  ];
  for (const [y0, y1] of rows) {
    // body half-width interpolates from ~9 at top to ~36 at base
    const t0 = (y0 - 66) / (226 - 66);
    const t1 = (y1 - 66) / (226 - 66);
    const hw0 = 9 + t0 * 27;
    const hw1 = 9 + t1 * 27;
    braces.push(
      `<path d="M${(120 - hw0).toFixed(1)} ${y0} L${(120 + hw1).toFixed(1)} ${y1} M${(120 + hw0).toFixed(1)} ${y0} L${(120 - hw1).toFixed(1)} ${y1}" stroke="${steel}" stroke-width="${w - 1.6}"/>`,
      `<path d="M${(120 - hw1).toFixed(1)} ${y1} L${(120 + hw1).toFixed(1)} ${y1}" stroke="${steel}" stroke-width="${w - 1.4}"/>`,
    );
  }
  // cross-arms: upper (short) + lower (wide), classic suspension tower — bold
  const arms = `
    <path d="M58 96 L182 96" stroke="${steel}" stroke-width="${w + 1}"/>
    <path d="M44 126 L196 126" stroke="${steel}" stroke-width="${w + 1.4}"/>
    <path d="M120 74 L84 96 M120 74 L156 96" stroke="${steel}" stroke-width="${w - 0.6}"/>
    <path d="M120 96 L58 126 M120 96 L182 126" stroke="${steel}" stroke-width="${w - 1}"/>
    <!-- earth peak -->
    <path d="M110 66 L120 44 L130 66" stroke="${steel}" stroke-width="${w - 0.4}" fill="none"/>`;
  // conductor lines sweeping off the arms, catching warm light
  const wires = `
    <g stroke="${C.gold}" stroke-width="2.2" opacity="0.78" fill="none">
      <path d="M58 98 C 26 110, 8 122, 0 134"/>
      <path d="M182 98 C 214 110, 232 122, 240 134"/>
      <path d="M44 128 C 20 140, 8 152, 0 162"/>
      <path d="M196 128 C 220 140, 232 152, 240 162"/>
    </g>`;
  // insulator / suspension nodes glow warm
  const nodes = [
    [58, 98], [182, 98], [44, 128], [196, 128], [120, 75],
  ].map(([x, y]) => bulb(x, y, 3.0, C.goldPale, C.orange)).join('');
  // a subtle highlight pass on the right faces (sun low SE)
  const hi = `
    <g stroke="${steelHi}" stroke-width="1.4" opacity="0.55">
      <path d="M120 66 L120 226"/>
      <path d="M120 74 L156 96"/>
    </g>`;
  return `
  <defs>
    <linearGradient id="B_sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.midnight}"/>
      <stop offset="0.38" stop-color="${C.navy}"/>
      <stop offset="0.66" stop-color="${C.dusk}"/>
      <stop offset="0.86" stop-color="${C.sunset}"/>
      <stop offset="1" stop-color="${C.gold}"/>
    </linearGradient>
    <radialGradient id="B_sun" cx="0.5" cy="1" r="0.7">
      <stop offset="0" stop-color="${C.goldPale}" stop-opacity="0.85"/>
      <stop offset="0.5" stop-color="${C.gold}" stop-opacity="0.25"/>
      <stop offset="1" stop-color="${C.gold}" stop-opacity="0"/>
    </radialGradient>
    ${FILTERS}
  </defs>
  <rect width="${VB}" height="${VB}" fill="url(#B_sky)"/>
  <!-- low setting sun glow behind the tower base -->
  <rect x="0" y="120" width="240" height="120" fill="url(#B_sun)"/>
  ${wires}
  ${mass}
  <g stroke-linecap="round" stroke-linejoin="round" fill="none">
    ${braces.join('')}
    ${legs}
    ${arms}
    ${hi}
  </g>
  <g filter="url(#glowSm)">${nodes}</g>`;
}

// CONCEPT C — GRID NODE / CONVERGENCE (warm, figurative — NOT the cold abstract node)
// A warm glowing substation node where transmission lines converge from the
// corners — the operator's instrument, the point where the grid lights up.
// Hot-white core in a big warm bloom; lines radiate to dimmer satellite nodes.
function conceptNode() {
  const cx = 120;
  const cy = 122;
  // satellite nodes around the edges (where lines come in from)
  const sats = [
    [34, 44], [206, 50], [28, 168], [200, 196], [120, 26], [120, 214],
  ];
  const lines = sats
    .map(([x, y]) => `<path d="M${cx} ${cy} L${x} ${y}" stroke="${C.gold}" stroke-width="2" opacity="0.55"/>`)
    .join('');
  const satNodes = sats
    .map(([x, y]) => bulb(x, y, 3.0, C.goldPale, C.orange))
    .join('');
  // faint secondary mesh between satellites (a network, not a star)
  const mesh = `
    <g stroke="${C.slate}" stroke-width="1.1" opacity="0.3" fill="none">
      <path d="M34 44 L120 26 L206 50"/>
      <path d="M28 168 L120 214 L200 196"/>
      <path d="M34 44 L28 168 M206 50 L200 196"/>
    </g>`;
  return `
  <defs>
    <radialGradient id="C_bg" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0" stop-color="${C.navyLight}"/>
      <stop offset="0.55" stop-color="${C.navy}"/>
      <stop offset="1" stop-color="${C.midnight}"/>
    </radialGradient>
    <radialGradient id="C_core" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.25" stop-color="${C.goldPale}"/>
      <stop offset="0.6" stop-color="${C.orange}"/>
      <stop offset="1" stop-color="${C.orange}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="C_halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${C.orange}" stop-opacity="0.5"/>
      <stop offset="1" stop-color="${C.orange}" stop-opacity="0"/>
    </radialGradient>
    ${FILTERS}
  </defs>
  <rect width="${VB}" height="${VB}" fill="url(#C_bg)"/>
  <!-- subtle dusk wash from the lower-right -->
  <rect width="${VB}" height="${VB}" fill="${C.dusk}" opacity="0.12"/>
  ${mesh}
  ${lines}
  <g filter="url(#glowSm)">${satNodes}</g>
  <!-- big warm bloom -->
  <circle cx="${cx}" cy="${cy}" r="92" fill="url(#C_halo)"/>
  <!-- the converging hot core, ringed like a substation busbar -->
  <circle cx="${cx}" cy="${cy}" r="40" fill="url(#C_core)"/>
  <circle cx="${cx}" cy="${cy}" r="26" fill="none" stroke="${C.goldPale}" stroke-width="3" opacity="0.9"/>
  <circle cx="${cx}" cy="${cy}" r="13" fill="#ffffff"/>
  <circle cx="${cx}" cy="${cy}" r="13" fill="${C.goldPale}" opacity="0.5"/>`;
}

// CONCEPT D — ENERGISED "E" MONOGRAM
// The ElectriCity "E" as three glowing horizontal bars that read as both a
// letter and stacked busbars/conductors; the middle bar kicks into a bolt
// notch. Brand-forward, scales to tiny, unmistakably "Electri".
function conceptMono() {
  // three bars + spine, with the middle bar carrying a lightning kink
  const spineX = 74;
  const barL = 74;
  const barR = 176;
  const th = 22; // bar thickness
  const top = 58;
  const mid = 118;
  const bot = 178;
  // spine
  const spine = `<rect x="${spineX - th / 2}" y="${top - th / 2}" width="${th}" height="${bot - top + th}" rx="6" fill="url(#D_bar)"/>`;
  // top + bottom bars (rounded)
  const topBar = `<rect x="${barL}" y="${top - th / 2}" width="${barR - barL}" height="${th}" rx="6" fill="url(#D_bar)"/>`;
  const botBar = `<rect x="${barL}" y="${bot - th / 2}" width="${barR - barL - 6}" height="${th}" rx="6" fill="url(#D_bar)"/>`;
  // middle arm IS a bold lightning bolt — same warm gold as the bars (no dark
  // sliver). A clean 3-segment zigzag growing out of the spine: it reads as the
  // E's centre stroke AND unmistakably as a bolt, crisp even at 60px. A short
  // stub off the spine seats it; the bolt's body is a confident chevron.
  const midBolt = `
    <path d="M${barL} ${mid - th / 2} L122 ${mid - th / 2} L122 ${mid + th / 2} L${barL} ${mid + th / 2} Z" fill="url(#D_bar)"/>
    <path d="M118 ${mid - 17} L158 ${mid - 17} L134 ${mid + 1} L162 ${mid + 1} L120 ${mid + 27} L136 ${mid + 4} L112 ${mid + 4} Z"
          fill="url(#D_bolt)"/>`;
  return `
  <defs>
    <linearGradient id="D_bg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="${C.navyLight}"/>
      <stop offset="0.55" stop-color="${C.navy}"/>
      <stop offset="1" stop-color="${C.night}"/>
    </linearGradient>
    <linearGradient id="D_bar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.goldPale}"/>
      <stop offset="1" stop-color="${C.gold}"/>
    </linearGradient>
    <linearGradient id="D_bolt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.5" stop-color="${C.goldPale}"/>
      <stop offset="1" stop-color="${C.orange}"/>
    </linearGradient>
    <radialGradient id="D_corner" cx="0.78" cy="0.86" r="0.6">
      <stop offset="0" stop-color="${C.sunset}" stop-opacity="0.42"/>
      <stop offset="1" stop-color="${C.sunset}" stop-opacity="0"/>
    </radialGradient>
    ${FILTERS}
  </defs>
  <rect width="${VB}" height="${VB}" fill="url(#D_bg)"/>
  <!-- warm dusk corner glow so the field isn't flat -->
  <rect width="${VB}" height="${VB}" fill="url(#D_corner)"/>
  <g filter="url(#glowMd)">
    ${spine}
    ${topBar}
    ${botBar}
    ${midBolt}
  </g>`;
}

// ---------------------------------------------------------------------------
const CONCEPTS = [
  { id: 'A-skyline', label: 'A · Skyline + Bolt', draw: conceptSkyline },
  { id: 'B-pylon', label: 'B · Lit Pylon', draw: conceptPylon },
  { id: 'C-node', label: 'C · Grid Node', draw: conceptNode },
  { id: 'D-mono', label: 'D · Energised E', draw: conceptMono },
];

const svgFor = (draw) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}" width="${VB}" height="${VB}">${draw()}</svg>`;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1400, height: 1200 }, deviceScaleFactor: 2 });

// render one SVG string to a PNG dataURL at `size`, optional iOS-mask clip
async function rasterize(svg, size, mask) {
  return page.evaluate(
    async ({ svg, size, mask }) => {
      const img = new Image();
      const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = url;
      });
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (mask) {
        const r = size * 0.2237; // iOS superellipse approximated by a round-rect
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.arcTo(size, 0, size, size, r);
        ctx.arcTo(size, size, 0, size, r);
        ctx.arcTo(0, size, 0, 0, r);
        ctx.arcTo(0, 0, size, 0, r);
        ctx.closePath();
        ctx.clip();
      }
      ctx.drawImage(img, 0, 0, size, size);
      return c.toDataURL('image/png');
    },
    { svg, size, mask },
  );
}

const saveDataUrl = (dataUrl, out) => {
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  writeFileSync(out, buf);
  return buf.length;
};

const OUT = 'preview/icon-concepts';
const SIZES = [180, 120, 60];

// 1) per-concept renders (full-bleed + masked, at each size)
for (const c of CONCEPTS) {
  const svg = svgFor(c.draw);
  for (const s of SIZES) {
    saveDataUrl(await rasterize(svg, s, false), `${OUT}/${c.id}-${s}.png`);
    saveDataUrl(await rasterize(svg, s, true), `${OUT}/${c.id}-${s}-masked.png`);
  }
  // a big crisp hero for close inspection
  saveDataUrl(await rasterize(svg, 512, true), `${OUT}/${c.id}-512-masked.png`);
  console.log('rendered', c.id);
}

// 2) comparison sheet — drawn as one big SVG embedding the masked PNGs, on
//    both a light and a dark home-screen-ish backdrop, labelled. We embed the
//    already-rasterised masked PNGs so the sheet shows exactly what the phone
//    renders.
const masked180 = {};
const masked120 = {};
const masked60 = {};
for (const c of CONCEPTS) {
  masked180[c.id] = await rasterize(svgFor(c.draw), 360, true); // 2x of 180
  masked120[c.id] = await rasterize(svgFor(c.draw), 240, true);
  masked60[c.id] = await rasterize(svgFor(c.draw), 120, true);
}

function comparisonSheet(dark) {
  const bgGrad = dark
    ? `<linearGradient id="sheetbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1d2b"/><stop offset="1" stop-color="#0b0d16"/></linearGradient>`
    : `<linearGradient id="sheetbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef1f8"/><stop offset="1" stop-color="#cfd5e6"/></linearGradient>`;
  const fg = dark ? '#e8eaf2' : '#1d2238';
  const sub = dark ? '#9aa0b8' : '#5a6178';
  const W = 1080;
  const colW = W / CONCEPTS.length;
  const rowSizes = [180, 120, 60];
  const rowY = [150, 430, 600];
  const H = 760;
  let body = '';
  // column headers
  CONCEPTS.forEach((c, i) => {
    const cx = i * colW + colW / 2;
    body += `<text x="${cx}" y="60" font-family="-apple-system, system-ui, sans-serif" font-size="22" font-weight="700" fill="${fg}" text-anchor="middle">${c.label}</text>`;
  });
  // row labels on the left edge
  rowSizes.forEach((s, r) => {
    body += `<text x="14" y="${rowY[r] + s / 2}" font-family="-apple-system, system-ui, sans-serif" font-size="15" font-weight="600" fill="${sub}">${s}px</text>`;
  });
  // icons grid
  const maps = [masked180, masked120, masked60];
  CONCEPTS.forEach((c, i) => {
    const cx = i * colW + colW / 2;
    rowSizes.forEach((s, r) => {
      const x = cx - s / 2;
      const y = rowY[r];
      // soft drop shadow under the icon (home-screen feel)
      body += `<rect x="${x}" y="${y + 3}" width="${s}" height="${s}" rx="${s * 0.2237}" fill="#000000" opacity="${dark ? 0.45 : 0.22}" filter="url(#sh)"/>`;
      body += `<image x="${x}" y="${y}" width="${s}" height="${s}" href="${maps[r][c.id]}"/>`;
    });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <defs>${bgGrad}<filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter></defs>
    <rect width="${W}" height="${H}" fill="url(#sheetbg)"/>
    <text x="14" y="30" font-family="-apple-system, system-ui, sans-serif" font-size="16" font-weight="700" fill="${sub}">ElectriCity — iPhone home-screen icon concepts (${dark ? 'dark' : 'light'} backdrop, iOS-masked)</text>
    ${body}
  </svg>`;
}

// rasterize the comparison sheets (no mask — they're full compositions)
async function rasterizeSheet(svg, w, h) {
  return page.evaluate(
    async ({ svg, w, h }) => {
      const img = new Image();
      const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = url;
      });
      const c = document.createElement('canvas');
      c.width = w * 2;
      c.height = h * 2;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w * 2, h * 2);
      return c.toDataURL('image/png');
    },
    { svg, w, h },
  );
}

saveDataUrl(await rasterizeSheet(comparisonSheet(false), 1080, 760), `${OUT}/_comparison-light.png`);
saveDataUrl(await rasterizeSheet(comparisonSheet(true), 1080, 760), `${OUT}/_comparison-dark.png`);
console.log('rendered comparison sheets');

// 3) a grayscale strip of the 60px masked icons (color-theory: hierarchy must
//    survive without hue). We desaturate in-canvas.
async function grayscaleStrip() {
  return page.evaluate(
    async ({ maps, ids }) => {
      const W = 4 * 120 + 5 * 24;
      const H = 120 + 32;
      const c = document.createElement('canvas');
      c.width = W * 2;
      c.height = H * 2;
      const ctx = c.getContext('2d');
      ctx.scale(2, 2);
      ctx.fillStyle = '#15171f';
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < ids.length; i++) {
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = maps[ids[i]];
        });
        const x = 24 + i * (120 + 24);
        const y = 16;
        ctx.save();
        ctx.filter = 'grayscale(1) contrast(1.05)';
        ctx.drawImage(img, x, y, 120, 120);
        ctx.restore();
      }
      return c.toDataURL('image/png');
    },
    { maps: masked60, ids: CONCEPTS.map((c) => c.id) },
  );
}
saveDataUrl(await grayscaleStrip(), `${OUT}/_grayscale-60.png`);
console.log('rendered grayscale strip');

await browser.close();
console.log('done -> preview/icon-concepts/');

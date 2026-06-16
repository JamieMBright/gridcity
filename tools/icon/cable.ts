// DIRECTION 2 -- "STYLISED CABLE" app-icon concept (code-drawn).
// Owner brief: "a horizontal orange line on the blue background about 2/3 up the
// square, with some electrical arcing. Like a stylised cable."
//
// Design rationale (skills applied):
//  - color-theory: navy #101630 is the 60% dominant field (a subtle navy->dusk
//    vertical gradient for depth, never flat / never pure black); the orange
//    conductor (#ff8a1e -> #ffb066) is the ~10% accent. Blue/orange is the one
//    colour-blind-safe complementary pair and gives maximum figure-ground. To
//    dodge dark-mode "saturation burn"/halation on navy, every glow is a TIGHT
//    warm bloom around a HOT-WHITE core (the heroLights bulb atom), not a wide
//    saturated smear.
//  - game-ui-design: one confident horizontal element = an unmistakable
//    silhouette that survives 60px and grayscale; the arcs are the rare gesture.
//  - frontend-design: the signature is LIVE CURRENT -- arcing leaping off a
//    conductor, the literal instant electricity flows. Not a pylon, not a bolt.
//  - canvas-design: conductor sits in the upper third (~2/3 up), generous navy
//    breathing room below; the sag + a couple of insulator pins make it read as
//    a real spanned conductor, not just a stripe.
//
// Pure function: cableIcon(size) -> full-bleed RGBA Img at 4x supersample,
// downscaled to `size`. The hero/comparison harness masks + composites it.

import {
  bulb,
  fillVGrad,
  glowLine,
  type Img,
  mix,
  newImg,
  PAL,
  radialGlow,
  strokeLine,
} from './canvas';

const SS = 4; // supersample factor -> box-downscale for clean AA

/** Deterministic value hash in [0,1). */
function frac(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

/** A crisp lightning ARC from source (x0,y0) to strike (x1,y1). Real lightning
 *  reads as: sharp acute zig-zags, TAPERING from a thick warm root to a thin
 *  hot tip, warm-orange electricity with a white-hot centreline. Built from a
 *  few alternating-side kink points (acute angles, irregular spacing), drawn as
 *  per-segment tapered stamps so the width shrinks toward the tip. Optionally
 *  one forked branch. Returns the path. */
function arc(
  img: Img,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  jag: number,
  seed: number,
  width: number,
  glow: number,
  fork = false,
): number[] {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  // 3 interior kinks at irregular fractions, thrown to ALTERNATING sides with
  // shrinking amplitude toward the tip — that decay + alternation is the
  // lightning read (a bolt narrows and calms as it reaches its strike).
  const kinks = [
    { f: 0.28, mag: 1.0 },
    { f: 0.52, mag: 0.7 },
    { f: 0.78, mag: 0.42 },
  ];
  const pts: number[] = [x0, y0];
  kinks.forEach((k, i) => {
    const bx = x0 + dx * k.f;
    const by = y0 + dy * k.f;
    const side = i % 2 === 0 ? 1 : -1;
    const mag = jag * k.mag * (0.75 + 0.5 * frac(seed + i * 5.1));
    pts.push(bx + nx * side * mag, by + ny * side * mag);
  });
  pts.push(x1, y1);

  // draw a path with width tapering from wRoot (t=0) to wTip (t=1) along its
  // own arc-length, as warm bloom -> orange -> white-hot centreline.
  const drawTapered = (path: number[], wRoot: number, g: number): void => {
    const segs = (path.length >> 1) - 1;
    for (let i = 0; i < segs; i++) {
      const ax = path[i * 2] ?? 0;
      const ay = path[i * 2 + 1] ?? 0;
      const bx = path[i * 2 + 2] ?? 0;
      const by = path[i * 2 + 3] ?? 0;
      // sub-stamp each segment so the taper is smooth, not stepped
      const sl = Math.hypot(bx - ax, by - ay);
      const sub = Math.max(2, Math.ceil(sl / 3));
      for (let s = 0; s < sub; s++) {
        const tt = (i + s / sub) / segs; // 0..1 along the whole bolt
        const tn = (i + (s + 1) / sub) / segs;
        const px = ax + ((bx - ax) * s) / sub;
        const py = ay + ((by - ay) * s) / sub;
        const qx = ax + ((bx - ax) * (s + 1)) / sub;
        const qy = ay + ((by - ay) * (s + 1)) / sub;
        const w = wRoot * (1 - 0.78 * tt); // taper to ~22% at the tip
        const a = g * (1 - 0.22 * tt);
        // WARM-dominant bolt (brief: "warm-white hot cores inside a warm
        // bloom"). KEY: additively stacking warm layers + a white core sums to
        // white, which read as a cold wire. So the bolt BODY is painted ORANGE
        // as an OPAQUE stroke (it stays orange, doesn't blow out), wrapped in an
        // additive amber halo, with only a HAIRLINE additive white-hot filament
        // down the very spine. Result: warm electricity with a hot core.
        strokeLine(img, px, py, qx, qy, w * 4.2, PAL.famber, 0.16 * a, 'add'); // wide warm halo (glow)
        strokeLine(img, px, py, qx, qy, w * 2.5, PAL.orange, 0.85 * a, 'over'); // orange body (opaque)
        strokeLine(img, px, py, qx, qy, w * 1.5, PAL.orangeSoft, 0.95 * a, 'over'); // bright warm body
        strokeLine(img, px, py, qx, qy, Math.max(0.8, w * 0.7), PAL.fgold, 0.7 * a, 'over'); // warm-gold inner
        strokeLine(img, px, py, qx, qy, Math.max(0.6, w * 0.28), PAL.fwhite, 0.9 * a, 'add'); // hairline hot filament
        void tn;
      }
    }
  };
  drawTapered(pts, width, glow);

  // a single short fork peeling off the 2nd kink (a real bolt splits once),
  // thinner and dimmer than the trunk.
  if (fork) {
    const kx = pts[4] ?? x1; // 2nd interior kink
    const ky = pts[5] ?? y1;
    const fxp = kx + dx * 0.22 - nx * jag * 1.0;
    const fyp = ky + dy * 0.22 - ny * jag * 1.0;
    const mxk = (kx + fxp) / 2 - nx * jag * 0.25;
    const myk = (ky + fyp) / 2;
    drawTapered([kx, ky, mxk, myk, fxp, fyp], width * 0.62, glow * 0.8);
    bulb(img, fxp, fyp, width * 1.3, PAL.orangeSoft, 0.55);
  }
  return pts;
}

export function cableIcon(size: number): Img {
  const S = size * SS;
  const img = newImg(S, S);

  // --- the navy field: a subtle vertical gradient (depth, not a flat slab).
  // Top is a touch lighter dusk-navy so the conductor's sky has air; the
  // bottom sinks toward deep cosy night. Both within one analogous ramp.
  fillVGrad(img, mix(PAL.navy, PAL.navyLight, 0.5), mix(PAL.night, PAL.dusk, 0.28));
  // a soft dusk-warmth pooled low in the frame (the golden-hour cast of the
  // game world) so the lower two-thirds isn't dead navy — kept low-alpha so the
  // conductor stays the hero. A whisper of dusty pink for the cosy sunset.
  radialGlow(img, S * 0.5, S * 0.98, S * 0.7, PAL.dusk, 0.55, 'over', 2.2);
  radialGlow(img, S * 0.5, S * 1.0, S * 0.46, PAL.sunset, 0.05, 'add', 2.6);

  // --- the conductor line: ~2/3 up the square (upper third). A spanned cable
  // sags very slightly under its own weight (a shallow catenary) -- that read
  // is what separates "a real conductor" from "a stripe".
  const yBase = S * 0.34; // 0.34 from the top == ~2/3 up
  const sag = S * 0.02;
  const x0 = S * 0.045; // run nearer the edges so it reads as a SPANNED cable
  const x1 = S * 0.955; //   passing through the frame, not a floating pill
  const cableY = (t: number): number => yBase + Math.sin(t * Math.PI) * sag;

  const N = 140;
  const coreW = S * 0.0125; // slightly slimmer -> reads as a cable, not a tube
  const bloomW = S * 0.058;
  // pass 1: a wide warm bloom UNDER the line so it sits in its own halo
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = x0 + (x1 - x0) * t;
    radialGlow(img, x, cableY(t), bloomW * 1.5, PAL.orange, 0.05, 'add', 2.4);
  }
  // pass 2: the glowing conductor itself -- amber->orange->warm-white core, so
  // it reads as hot metal carrying current (cooler/dimmer at the ends).
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const tn = (i + 1) / N;
    const x = x0 + (x1 - x0) * t;
    const xn = x0 + (x1 - x0) * tn;
    // brightness swells toward the middle where the arcs jump; the very ends
    // taper down so the conductor reads as running OFF-frame (a spanned line),
    // not a capped pill.
    const edge = Math.min(1, Math.min(t, 1 - t) / 0.12); // fade over a wider band
    const swell = (0.6 + 0.4 * Math.sin(t * Math.PI)) * (0.25 + 0.75 * edge);
    const core = mix(PAL.orange, PAL.fwhite, 0.38 * swell);
    glowLine(img, x, cableY(t), xn, cableY(tn), coreW * Math.max(0.35, swell), bloomW * (0.35 + 0.65 * edge), core, PAL.orange, 0.9 * (0.4 + 0.6 * edge));
  }
  // a hair-thin hot highlight riding the very top of the conductor (specular)
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const tn = (i + 1) / N;
    const x = x0 + (x1 - x0) * t;
    const xn = x0 + (x1 - x0) * tn;
    strokeLine(img, x, cableY(t) - coreW * 0.55, xn, cableY(tn) - coreW * 0.55, coreW * 0.5, 0xfff7e8, 0.5, 'add');
  }

  // --- two slim insulator pins the cable passes over (it's a SPANNED line).
  // Steel-cool so they don't fight the warm conductor; they anchor the read.
  const pin = (px: number): void => {
    const t = (px - x0) / (x1 - x0);
    const y = cableY(t);
    const h = S * 0.05;
    strokeLine(img, px, y, px, y + h, S * 0.012, mix(PAL.slate, PAL.navy, 0.35), 0.9, 'over');
    // a tiny cool cap glint where the conductor seats
    radialGlow(img, px, y, S * 0.016, PAL.cool, 0.35, 'add', 1.6);
  };
  pin(S * 0.165);
  pin(S * 0.835);

  // --- ELECTRICAL ARCING: crisp lightning jags leaping off the line. The
  // signature gesture, kept minimal: one bold FORKED bolt striking down into
  // the navy (the event) + one short jag escaping up-left. Each launch point
  // flares warm-hot; each strike point ends in a warm bulb.
  const mid = (x0 + x1) / 2;

  const tipBulb = (tips: number[], r: number, col: number, a: number): void => {
    bulb(img, tips[tips.length - 2] ?? 0, tips[tips.length - 1] ?? 0, r, col, a);
  };

  // MAIN downward bolt — the event: a forked jag striking down into the navy,
  // just right of centre. The fork gives it a real-lightning split; this is the
  // one place the icon spends its boldness.
  {
    const sx = mid + S * 0.04;
    const t = (sx - x0) / (x1 - x0);
    const sy = cableY(t);
    const tips = arc(img, sx, sy, mid + S * 0.02, S * 0.72, S * 0.06, 11.3, S * 0.013, 1.0, true);
    tipBulb(tips, S * 0.02, PAL.orangeSoft, 0.9);
    // a warm launch flare: orange bloom around a hot core (where it leaves the
    // conductor), so the root reads as warm electricity, not a cold spark
    radialGlow(img, sx, sy, S * 0.07, PAL.orange, 0.4, 'add', 2.2);
    bulb(img, sx, sy, S * 0.024, PAL.orangeSoft, 1.0);
  }
  // ONE short crisp jag up-left (current escaping above the line). Kept singular
  // so the icon stays minimal — two strikes, not a thicket (game-ui: every
  // element earns its space).
  {
    const sx = mid - S * 0.2;
    const t = (sx - x0) / (x1 - x0);
    const sy = cableY(t);
    const tips = arc(img, sx, sy, mid - S * 0.29, S * 0.16, S * 0.034, 4.7, S * 0.0095, 0.92);
    tipBulb(tips, S * 0.014, PAL.fgold, 0.82);
    bulb(img, sx, sy, S * 0.016, PAL.fwhite, 0.94);
  }

  // a scatter of tiny escaping sparks near the main strike (energy, not clutter)
  for (let i = 0; i < 5; i++) {
    const a = frac(i * 7.7) * Math.PI * 2;
    const rr = S * (0.04 + frac(i * 3.1) * 0.06);
    const x = mid - S * 0.05 + Math.cos(a) * rr;
    const y = S * 0.62 + Math.sin(a) * rr * 0.7;
    bulb(img, x, y, S * (0.004 + frac(i * 9.2) * 0.004), PAL.orangeSoft, 0.55);
  }

  // --- the BRAND beat: powering an area makes it GLOW. A faint, irregular row
  // of tiny warm window-bulbs along the bottom edge — a city quietly lit by the
  // current overhead. Kept very low so it's atmosphere, never a second subject;
  // it disappears into a warm hum at 60px but gives the lower third meaning.
  for (let i = 0; i < 11; i++) {
    const x = S * (0.1 + (i / 10) * 0.8) + (frac(i * 4.3) - 0.5) * S * 0.03;
    const y = S * (0.9 + frac(i * 2.1) * 0.05);
    const on = frac(i * 6.1) > 0.25 ? 1 : 0.3;
    bulb(img, x, y, S * 0.006, PAL.fgold, 0.4 * on);
  }

  return img;
}

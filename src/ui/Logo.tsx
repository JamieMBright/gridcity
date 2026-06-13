// ElectriCity brand mark — code-drawn SVG (art-is-code; no raster
// dependency for the mark itself). Two exports:
//
//   <LogoMark/>     the logomark only: a substation NODE where the grid
//                   converges, lit warm against the dark network — the
//                   "powering an area makes it glow" hook, distilled. Reads
//                   at 16px (favicon) and large (hero). This is the same
//                   geometry as public/logo.svg / public/icon.svg.
//
//   <LogoLockup/>   mark + wordmark: "Electri" (off-white, energized) →
//                   "City" (gold, the operator's warm grid), the "i" tittle
//                   replaced by a glowing grid-node so the wordmark quotes
//                   the mark. Used on the start-menu hero and corner chrome.
//
// Colour discipline (color-theory): the warm sunset ramp = ENERGIZED, the
// cool navy/slate = the dark grid. The single warm focal point carries the
// hierarchy; in grayscale the lit core still dominates. Contrast holds on
// the navy dusk panels (off-white 15:1, gold 11:1, slate 6:1).

import { theme } from './theme';

let _uid = 0;
/** Unique gradient ids per instance so multiple marks on a page don't
 *  collide on `url(#…)` references. */
function useIds() {
  // module-scoped counter is fine: ids only need to be unique within a doc
  const n = ++_uid;
  return { glow: `ecGlow${n}`, core: `ecCore${n}` };
}

/** Shared gradient defs + the node geometry, drawn into a 64-unit box. */
function MarkGuts({ glow, core }: { glow: string; core: string }) {
  return (
    <>
      <defs>
        <radialGradient id={glow} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ff8a1e" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ff8a1e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={core} cx="42%" cy="38%" r="68%">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="0.5" stopColor="#ff9a2e" />
          <stop offset="1" stopColor="#f47714" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="26" fill={`url(#${glow})`} />
      <g fill="none" stroke="#6f7ba6" strokeWidth="3.4" strokeLinecap="round">
        <path d="M32 32 L11 11" />
        <path d="M32 32 L53 11" />
        <path d="M32 32 L11 53" />
        <path d="M32 32 L53 53" />
      </g>
      <g fill="#39446e">
        <circle cx="11" cy="11" r="4.4" />
        <circle cx="53" cy="11" r="4.4" />
        <circle cx="11" cy="53" r="4.4" />
        <circle cx="53" cy="53" r="4.4" />
      </g>
      <circle cx="32" cy="32" r="12.5" fill={`url(#${core})`} />
      <circle cx="32" cy="32" r="12.5" fill="none" stroke="#ffe6bc" strokeWidth="1.6" />
      <circle cx="28.5" cy="28.5" r="3" fill="#fff7ec" opacity="0.9" />
    </>
  );
}

/** Logomark only. `rounded` draws the navy tile behind it (favicon/app-icon
 *  look); omit for a bare glyph that floats on a panel. */
export function LogoMark({
  size = 32,
  rounded = true,
  title,
}: {
  size?: number;
  rounded?: boolean;
  title?: string;
}) {
  const ids = useIds();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ display: 'block' }}
    >
      {title && <title>{title}</title>}
      {rounded && <rect width="64" height="64" rx="14" fill="#0d1228" />}
      <MarkGuts {...ids} />
    </svg>
  );
}

/** Primary lockup: mark + "ElectriCity" wordmark with the glowing-node "i".
 *  Scales by `height`; the wordmark sets the width. `tagline` toggles the
 *  "LONDON GRID OPERATOR" line (on for the hero, off for tight chrome). */
export function LogoLockup({
  height = 64,
  tagline = true,
}: {
  height?: number;
  tagline?: boolean;
}) {
  const ids = useIds();
  const vbW = 760;
  const vbH = tagline ? 200 : 150;
  const width = (height * vbW) / vbH;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${vbW} ${vbH}`}
      role="img"
      aria-label="ElectriCity"
      style={{ display: 'block', maxWidth: '100%' }}
    >
      <title>ElectriCity</title>
      <g transform="translate(100 100) scale(1.45) translate(-32 -32)">
        <MarkGuts {...ids} />
      </g>
      <text
        x="196"
        y="116"
        fontSize="90"
        fontWeight="800"
        letterSpacing="-2"
        fontFamily="'Inter','Helvetica Neue',Arial,sans-serif"
      >
        <tspan fill={theme.offWhite}>Electri</tspan>
        <tspan fill="#ff9a2e">City</tspan>
      </text>
      {/* the "i" tittle, drawn as the glowing grid-node */}
      <circle cx="445" cy="44" r="9" fill={`url(#${ids.core})`} />
      <circle cx="445" cy="44" r="9" fill="none" stroke="#ffe6bc" strokeWidth="1" />
      {tagline && (
        <text
          x="198"
          y="158"
          fontFamily="'Inter',Arial,sans-serif"
          fontSize="21"
          letterSpacing="6.5"
          fill={theme.slate}
          fontWeight="600"
        >
          LONDON GRID OPERATOR
        </text>
      )}
    </svg>
  );
}

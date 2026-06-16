// The app mark: a simple lightning BOLT on a blue rounded tile — the same
// bolt that sits between the ELECTRI⚡CITY wordmark (owner, 2026-06-15:
// "remove the square home icon… use the lightning BOLT on a blue background
// — super simple"). Replaces the old /icon-192.png pylon raster everywhere
// it appeared (start menu, both in-game wordmark buttons). Pure inline SVG so
// it scales crisply at any size and needs no asset round-trip. The bolt uses
// the same silhouette as IconBolt in the bespoke icon set, so the mark and
// the in-HUD energy glyph speak one language.

import { theme } from './theme';

export function BoltMark({
  size = 26,
  radius,
}: {
  size?: number;
  /** corner radius of the blue tile; defaults to ~26% of size */
  radius?: number;
}): React.ReactElement {
  const r = radius ?? Math.round(size * 0.26);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="ElectriCity"
      style={{ display: 'block', flex: 'none' }}
    >
      {/* deep-navy → night blue tile, matching the dusk chrome */}
      <defs>
        <linearGradient id="boltbg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#232a52" />
          <stop offset="1" stopColor={theme.night} />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx={(r / size) * 24} fill="url(#boltbg)" />
      {/* the bolt — IconBolt silhouette, orange brand fill, dark ink contour */}
      <path
        d="M13 3 6 13.5h5L11 21l7-10.5h-5z"
        fill={theme.orange}
        stroke="#241c38"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

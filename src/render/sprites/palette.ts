// Master pixel-art palette. Every sprite is a grid of these characters.
// The whole world lives in golden-hour light: warm-lit faces use the "lit"
// member of each pair, shaded faces the darker one; shadows lean warm
// purple rather than black, per the lofi sunset art direction.

export const PALETTE: Record<string, string> = {
  // structure
  K: '#2e2240', // outline / deep warm shadow
  k: '#1f1a2e', // unlit window glass
  y: '#ffd277', // lit window, warm
  Y: '#ffb347', // lit window, hot core
  b: '#c26a4a', // brick, sun side
  B: '#934e3a', // brick, shade side
  z: '#d98a5e', // terracotta ridge tiles / chimney pots
  s: '#555273', // slate roof, shade slope
  S: '#807c9e', // slate roof, lit slope
  l: '#8a6a52', // brown tile roof, lit
  L: '#6b4f3e', // brown tile roof, shade
  c: '#ecdcc0', // cream render, lit
  C: '#c3ab8e', // cream render, shade
  a: '#a8a0b8', // concrete, lit
  A: '#7b7390', // concrete, shade
  i: '#b4bcc8', // steel, lit
  I: '#707a8c', // steel, shade
  D: '#3f6f6a', // front doors (teal)
  o: '#ff8a1e', // brand orange (vans, hi-vis, beacons)
  O: '#c96a14', // brand orange, shade

  // nature
  g: '#97a05c', // grass, lit
  G: '#7a8a4c', // grass, mid
  f: '#5e6e3d', // grass, dark
  t: '#6a7d45', // tree canopy, lit
  T: '#4c5e35', // tree canopy, shade
  n: '#6f4a33', // trunk / bare earth
  e: '#cfa75c', // field stubble, gold
  E: '#b08a48', // field, shade rows
  u: '#8a7a58', // moorland hill
  U: '#6f6248', // hill shade
  d: '#cfb288', // sand / shoreline
  w: '#2f3e68', // water, dusk navy
  W: '#4a5d96', // water, light ripple
  p: '#d98a9e', // sunset glint on water/glass

  // fabric
  r: '#564f60', // asphalt
  R: '#433d4d', // asphalt shade / kerb
  m: '#9a8d74', // road markings, faded warm
  q: '#b9d2cf', // glasshouse glass
  Q: '#e2ece2', // glasshouse glass, lit pane
  v: '#4a5f9e', // solar panel
  V: '#7d92cc', // solar panel glint
  x: '#d9ced6', // smoke / steam
};

export type PaletteChar = keyof typeof PALETTE;

/** Parse '#rrggbb' to [r,g,b]. */
export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

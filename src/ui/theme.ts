// ElectriCity design tokens — UK Power Networks-inspired palette with a
// lofi golden-hour cast. Single source of truth for all UI colour.

export const theme = {
  // Brand
  navy: '#101630', // deep navy — primary chrome, panels
  navyLight: '#1d2547', // raised panels, hover
  orange: '#ff8a1e', // accents, CTAs, alerts, the vans
  orangeSoft: '#ffb066', // secondary accent, glows
  slate: '#6b7591', // secondary UI, muted text
  offWhite: '#f2efe8', // primary text, light surfaces

  // Lofi sunset ambience
  dusk: '#3a2b50', // sunset purple
  sunset: '#e0697a', // dusty pink
  gold: '#f5c469', // golden-hour light
  night: '#0a0e22', // deep cosy night

  // Semantics
  ok: '#7bc47f',
  warn: '#f5c469',
  danger: '#e0697a',

  font: "'Iosevka', 'JetBrains Mono', ui-monospace, 'Cascadia Code', Menlo, monospace",
} as const;

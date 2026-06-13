// A tiny registry so sibling UI (the corner minimap, #26) can reach the
// live MapRenderer without prop-drilling through the React tree. MapView
// owns the renderer's lifecycle and publishes/retracts the active one
// here; the minimap reads it each animation frame (read-only — it only
// calls getMinimapView() and panTo()).

import type { MapRenderer } from './MapRenderer';

let active: MapRenderer | undefined;

export function setActiveRenderer(r: MapRenderer | undefined): void {
  active = r;
}

export function getActiveRenderer(): MapRenderer | undefined {
  return active;
}

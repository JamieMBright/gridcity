// Per-hero ELECTRIFICATION light-show (owner, 2026-06-15): every hero lights up
// with a BESPOKE effect when energised. This pins the pure landmark→effect-kind
// mapping (the only piece worth unit-testing — the draw is a Pixi render gate)
// so the characterful effects stay wired to the right heroes and every
// hero-light landmark resolves to a real kind.

import { describe, expect, it } from 'vitest';
import {
  heroLightKind,
  HERO_LIGHT_LANDMARKS,
  type HeroLightKind,
} from '../src/render/heroLights';
import { LANDMARK, type Landmark } from '../src/sim/map/types';

describe('hero light effect selection', () => {
  it('maps each iconic hero to its bespoke, hero-relevant effect', () => {
    const cases: Array<[Landmark, HeroLightKind]> = [
      [LANDMARK.eiffel, 'eiffelSparkle'], // golden lattice sparkle
      [LANDMARK.spire, 'spireBeacon'], // the Shard's spire-tip beacon
      [LANDMARK.skyscraper, 'towerCrown'], // lit crown + windows
      [LANDMARK.grand, 'towerCrown'],
      [LANDMARK.gherkin, 'towerCrown'],
      [LANDMARK.pyramidGreat, 'pyramidFlood'], // Giza Sound-&-Light
      [LANDMARK.pyramidKhafre, 'pyramidFlood'],
      [LANDMARK.pyramidMenkaure, 'pyramidFlood'],
      [LANDMARK.pyramid, 'pyramidFlood'], // deprecated monolithic group
      [LANDMARK.sphinx, 'sphinxFlood'],
      [LANDMARK.notredame, 'facadeFlood'], // floodlit facade + rose window
      [LANDMARK.dome, 'facadeFlood'], // St Paul's lantern
      [LANDMARK.basilica, 'facadeFlood'],
      [LANDMARK.parliament, 'facadeFlood'],
      [LANDMARK.bttower, 'aerialBeacon'], // aerial-gallery beacon
      [LANDMARK.palacemast, 'aerialBeacon'],
      [LANDMARK.eye, 'rimCycle'], // colour-cycling rim
      [LANDMARK.wembley, 'archGlow'], // the lit arch
      [LANDMARK.arch, 'archGlow'],
      [LANDMARK.orbit, 'archGlow'],
      [LANDMARK.stadium, 'stadiumFlood'],
      [LANDMARK.o2dome, 'stadiumFlood'],
    ];
    for (const [lm, kind] of cases) {
      expect(heroLightKind(lm)).toBe(kind);
    }
  });

  it('falls back to a generic warm glow for any unlisted hero (every hero lights)', () => {
    // the decommissioned power station + tower bridge carry no bespoke kind but
    // must still light up via the generic fallback
    expect(heroLightKind(LANDMARK.powerstation)).toBe('genericGlow');
    expect(heroLightKind(LANDMARK.towerBridge)).toBe('genericGlow');
    // an unknown / future id never throws and always resolves to a real kind
    expect(heroLightKind(9999 as Landmark)).toBe('genericGlow');
  });

  it('every hero-light landmark resolves to a defined effect kind', () => {
    const KINDS: ReadonlySet<HeroLightKind> = new Set([
      'eiffelSparkle',
      'spireBeacon',
      'towerCrown',
      'pyramidFlood',
      'sphinxFlood',
      'facadeFlood',
      'aerialBeacon',
      'rimCycle',
      'archGlow',
      'stadiumFlood',
      'genericGlow',
    ]);
    for (const lm of HERO_LIGHT_LANDMARKS) {
      expect(KINDS.has(heroLightKind(lm))).toBe(true);
    }
  });

  it('excludes plain civic fabric from the hero light-shows (5%-hero rule)', () => {
    // the night should read with the HEROES lit, not the whole city — the
    // ordinary municipal/service fabric must not earn a light-show
    for (const lm of [
      LANDMARK.station,
      LANDMARK.school,
      LANDMARK.townhall,
      LANDMARK.church,
      LANDMARK.watertower,
      LANDMARK.sewage,
      LANDMARK.carpark,
      LANDMARK.datacentre,
      LANDMARK.civic,
      LANDMARK.airport,
      LANDMARK.heathrow,
    ]) {
      expect(HERO_LIGHT_LANDMARKS.has(lm)).toBe(false);
    }
  });
});

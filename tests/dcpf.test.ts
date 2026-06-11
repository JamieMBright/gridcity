import { describe, expect, it } from 'vitest';
import { solveDcPowerFlow } from '../src/sim/grid/dcpf';
import type { Branch, Bus, Network } from '../src/sim/grid/types';

function bus(id: number, level: 400 | 132 | 33 = 132): Bus {
  return { id, x: id, y: 0, level };
}

function branch(id: number, from: number, to: number, x: number, rating = 1000): Branch {
  return { id, from, to, kind: 'overhead', x, r: x / 10, ratingMW: rating, inService: true };
}

describe('DC power flow', () => {
  it('2-bus: all power flows over the single line', () => {
    const net: Network = { buses: [bus(0), bus(1)], branches: [branch(0, 0, 1, 0.1)] };
    const r = solveDcPowerFlow(net, [
      { bus: 0, pMW: 100 },
      { bus: 1, pMW: -100 },
    ]);
    expect(r.flowMW.get(0)).toBeCloseTo(100, 6);
    expect(r.islands[0]?.energized).toBe(true);
    expect(r.islands[0]?.slackMW).toBeCloseTo(0, 6);
  });

  it('parallel lines with equal reactance split 50/50', () => {
    const net: Network = {
      buses: [bus(0), bus(1)],
      branches: [branch(0, 0, 1, 0.2), branch(1, 0, 1, 0.2)],
    };
    const r = solveDcPowerFlow(net, [
      { bus: 0, pMW: 100 },
      { bus: 1, pMW: -100 },
    ]);
    expect(r.flowMW.get(0)).toBeCloseTo(50, 6);
    expect(r.flowMW.get(1)).toBeCloseTo(50, 6);
  });

  it('halving one parallel reactance gives a 2:1 split', () => {
    const net: Network = {
      buses: [bus(0), bus(1)],
      branches: [branch(0, 0, 1, 0.1), branch(1, 0, 1, 0.2)],
    };
    const r = solveDcPowerFlow(net, [
      { bus: 0, pMW: 90 },
      { bus: 1, pMW: -90 },
    ]);
    expect(r.flowMW.get(0)).toBeCloseTo(60, 6);
    expect(r.flowMW.get(1)).toBeCloseTo(30, 6);
  });

  it('triangle loop: equal reactances split 2/3 direct, 1/3 around', () => {
    // gen at 0, load at 1, idle corner 2; x equal on all three sides
    const net: Network = {
      buses: [bus(0), bus(1), bus(2)],
      branches: [branch(0, 0, 1, 0.1), branch(1, 0, 2, 0.1), branch(2, 2, 1, 0.1)],
    };
    const r = solveDcPowerFlow(net, [
      { bus: 0, pMW: 90 },
      { bus: 1, pMW: -90 },
    ]);
    expect(r.flowMW.get(0)).toBeCloseTo(60, 5); // direct path: 2/3
    expect(r.flowMW.get(1)).toBeCloseTo(30, 5); // around: 1/3
    expect(r.flowMW.get(2)).toBeCloseTo(30, 5);
  });

  it('reinforcing one corridor re-routes flow across the mesh', () => {
    const mk = (xDirect: number): Network => ({
      buses: [bus(0), bus(1), bus(2)],
      branches: [branch(0, 0, 1, xDirect), branch(1, 0, 2, 0.1), branch(2, 2, 1, 0.1)],
    });
    const inj = [
      { bus: 0, pMW: 90 },
      { bus: 1, pMW: -90 },
    ];
    const before = solveDcPowerFlow(mk(0.1), inj).flowMW.get(1) ?? 0;
    // adding a second circuit on the direct path halves its reactance
    const after = solveDcPowerFlow(mk(0.05), inj).flowMW.get(1) ?? 0;
    expect(after).toBeLessThan(before); // loop path relieved
  });

  it('5-bus mesh: power balances at every bus (KCL property test)', () => {
    const net: Network = {
      buses: [bus(0), bus(1), bus(2), bus(3), bus(4)],
      branches: [
        branch(0, 0, 1, 0.06),
        branch(1, 0, 3, 0.24),
        branch(2, 1, 2, 0.18),
        branch(3, 1, 3, 0.18),
        branch(4, 1, 4, 0.12),
        branch(5, 2, 4, 0.03),
        branch(6, 3, 4, 0.24),
      ],
    };
    const inj = [
      { bus: 0, pMW: 250 },
      { bus: 1, pMW: -80 },
      { bus: 2, pMW: 70 }, // embedded generator
      { bus: 3, pMW: -120 },
      { bus: 4, pMW: -120 },
    ];
    const r = solveDcPowerFlow(net, inj, { slackPreference: [0] });
    // KCL at every non-slack bus: injection = net flow out
    for (const b of [1, 2, 3, 4]) {
      let out = 0;
      for (const br of net.branches) {
        const f = r.flowMW.get(br.id) ?? 0;
        if (br.from === b) out += f;
        if (br.to === b) out -= f;
      }
      const p = inj.find((i) => i.bus === b)?.pMW ?? 0;
      expect(out).toBeCloseTo(p, 6);
    }
    expect(r.islands[0]?.slackMW).toBeCloseTo(0, 6); // balanced case
  });

  it('imbalance is absorbed by the slack', () => {
    const net: Network = { buses: [bus(0), bus(1)], branches: [branch(0, 0, 1, 0.1)] };
    const r = solveDcPowerFlow(net, [{ bus: 1, pMW: -100 }], { slackPreference: [0] });
    expect(r.islands[0]?.slackMW).toBeCloseTo(100, 6); // slack supplies it all
  });

  it('disconnected islands solve independently', () => {
    const net: Network = {
      buses: [bus(0), bus(1), bus(2), bus(3)],
      branches: [branch(0, 0, 1, 0.1), branch(1, 2, 3, 0.1)],
    };
    const r = solveDcPowerFlow(net, [
      { bus: 0, pMW: 50 },
      { bus: 1, pMW: -50 },
      { bus: 2, pMW: 20 },
      { bus: 3, pMW: -20 },
    ]);
    expect(r.islands.length).toBe(2);
    expect(r.flowMW.get(0)).toBeCloseTo(50, 6);
    expect(r.flowMW.get(1)).toBeCloseTo(20, 6);
  });

  it('out-of-service branches carry nothing and can island the network', () => {
    const br = branch(0, 0, 1, 0.1);
    br.inService = false;
    const net: Network = { buses: [bus(0), bus(1)], branches: [br] };
    const r = solveDcPowerFlow(net, [
      { bus: 0, pMW: 50 },
      { bus: 1, pMW: -50 },
    ]);
    expect(r.flowMW.get(0)).toBe(0);
    expect(r.islands.length).toBe(2);
  });

  it('voltage sags along a loaded radial chain and is 0 when de-energized', () => {
    const net: Network = {
      buses: [bus(0), bus(1), bus(2), bus(3), bus(9)],
      branches: [branch(0, 0, 1, 0.1), branch(1, 1, 2, 0.1), branch(2, 2, 3, 0.1)],
    };
    const r = solveDcPowerFlow(
      net,
      [
        { bus: 0, pMW: 300 },
        { bus: 3, pMW: -300 },
      ],
      { slackPreference: [0] },
    );
    const v = (b: number): number => r.voltage.get(b) ?? -1;
    expect(v(0)).toBe(1);
    expect(v(1)).toBeLessThan(v(0));
    expect(v(2)).toBeLessThan(v(1));
    expect(v(3)).toBeLessThan(v(2));
    expect(v(9)).toBe(0); // isolated bus is dead
  });
});

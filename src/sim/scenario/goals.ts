// The early-game goal ladder: ~12 declarative goals that give a new
// operator 15-minute objectives until the RIIO report cards take over.
// The worker checks the CURRENT goal's predicate once per tick (the
// ladder is strictly ordered), fires a celebratory event on completion
// and persists the index in GameState.goalIndex (optional save field —
// additive, no SAVE_VERSION bump). Predicates mirror Tutorial.tsx's
// done(snapshot) pattern and read only a cheap slice of the snapshot.

import type { PlacedAsset } from '../assets';
import type { CouncilState } from '../customers/adoption';
import type { SimSnapshot } from '../protocol';
import { pushEvent, type GameEvent, type GameState } from '../state';

/** The slice of a snapshot the goal predicates read. A SimSnapshot
 *  satisfies everything except `studyRan`, which is a worker-transient
 *  flag (was a connection study run this session?). */
export interface GoalView {
  assets: PlacedAsset[];
  events: GameEvent[];
  councils: Array<[number, CouncilState]>;
  stats: { servedCustomers: number; connectedMW: number };
  inbox: { tenders: Array<{ status: 'open' | 'awarded' | 'lapsed' }> };
  studyRan: boolean;
}

export interface Goal {
  label: string;
  done(v: GoalView): boolean;
  /** Optional "4,210/10,000" style readout for the HUD chip. */
  progress?(v: GoalView): string;
}

const fmt = (n: number): string => n.toLocaleString('en-GB');

const onSupply = (n: number): Goal => ({
  label: `put ${fmt(n)} customers on supply`,
  done: (v) => v.stats.servedCustomers >= n,
  progress: (v) => `${fmt(Math.min(v.stats.servedCustomers, n))}/${fmt(n)}`,
});

export const GOALS: Goal[] = [
  {
    label: 'energize your first customers',
    done: (v) => v.stats.servedCustomers > 0,
  },
  onSupply(1_000),
  {
    label: 'award your first generation tender',
    done: (v) => v.inbox.tenders.some((t) => t.status === 'awarded'),
  },
  {
    label: 'build your first 132 kV circuit',
    done: (v) => v.assets.some((a) => a.kind === 'line' && a.level === 132),
  },
  {
    label: 'run a connection study on an application',
    done: (v) => v.studyRan,
  },
  onSupply(10_000),
  {
    label: 'build a field depot for your crews',
    done: (v) => v.assets.some((a) => a.kind === 'depot'),
  },
  {
    label: 'survive a fault: get a repair restored',
    done: (v) => v.events.some((e) => e.msg.includes('restored')),
  },
  {
    label: 'lift a council past 60 satisfaction',
    done: (v) => v.councils.some(([, c]) => c.satisfaction > 60),
  },
  {
    label: 'underground a line or section',
    done: (v) => v.assets.some((a) => a.kind === 'line' && a.build === 'underground'),
  },
  onSupply(50_000),
  {
    label: 'connect over 500 MW of supply',
    done: (v) => v.stats.connectedMW > 500,
    progress: (v) => `${fmt(Math.min(Math.round(v.stats.connectedMW), 500))}/500 MW`,
  },
];

/** Advance the persisted ladder index past every satisfied goal in
 *  order, pushing one celebratory event per completion. Cheap when
 *  nothing changed (one predicate call). */
export function advanceGoals(state: GameState, view: GoalView): void {
  let ix = state.goalIndex ?? 0;
  while (ix < GOALS.length) {
    const goal = GOALS[ix];
    if (!goal || !goal.done(view)) break;
    pushEvent(state, 'info', `goal complete: ${goal.label}`);
    ix += 1;
    state.goalIndex = ix;
  }
}

/** The snapshot's view of the current goal; undefined once the ladder
 *  is finished or dismissed. */
export function goalStatus(index: number, view: GoalView): SimSnapshot['goal'] {
  const goal = GOALS[index];
  if (!goal) return undefined;
  return {
    index,
    total: GOALS.length,
    label: goal.label,
    ...(goal.progress ? { progress: goal.progress(view) } : {}),
  };
}

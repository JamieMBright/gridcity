// Message protocol between the main thread and the simulation worker.
// The worker owns authoritative game state; the main thread renders snapshots.

export type SimSpeed = 0 | 1 | 4 | 16;

/** Game-minutes advanced per sim tick at 1x speed. Sim runs at 4 ticks/sec. */
export const MINUTES_PER_TICK = 7.5;
export const TICKS_PER_SECOND = 4;

export interface SimSnapshot {
  tick: number;
  /** Game time in minutes since scenario start. */
  simTimeMin: number;
  speed: SimSpeed;
}

export type MainToWorker =
  | { type: 'ping'; t: number }
  | { type: 'start' }
  | { type: 'setSpeed'; speed: SimSpeed };

export type WorkerToMain =
  | { type: 'pong'; t: number }
  | { type: 'snapshot'; snapshot: SimSnapshot }
  | { type: 'fatal'; message: string };

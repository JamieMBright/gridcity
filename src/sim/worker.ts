import {
  MINUTES_PER_TICK,
  TICKS_PER_SECOND,
  type MainToWorker,
  type SimSnapshot,
  type SimSpeed,
  type WorkerToMain,
} from './protocol';

let tick = 0;
let simTimeMin = 0;
let speed: SimSpeed = 1;
let running = false;

function post(msg: WorkerToMain): void {
  self.postMessage(msg);
}

function snapshot(): SimSnapshot {
  return { tick, simTimeMin, speed };
}

function step(): void {
  try {
    if (speed === 0) return;
    tick += 1;
    simTimeMin += MINUTES_PER_TICK * speed;
    post({ type: 'snapshot', snapshot: snapshot() });
  } catch (err) {
    speed = 0;
    post({ type: 'fatal', message: err instanceof Error ? err.message : String(err) });
  }
}

function start(): void {
  if (running) return;
  running = true;
  setInterval(step, 1000 / TICKS_PER_SECOND);
  post({ type: 'snapshot', snapshot: snapshot() });
}

self.onmessage = (e: MessageEvent<MainToWorker>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'ping':
      post({ type: 'pong', t: msg.t });
      break;
    case 'start':
      start();
      break;
    case 'setSpeed':
      speed = msg.speed;
      post({ type: 'snapshot', snapshot: snapshot() });
      break;
  }
};

export {};

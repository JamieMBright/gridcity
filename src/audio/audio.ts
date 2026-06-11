// Lofi soundtrack + UI sounds, all synthesized in WebAudio — no assets.
// A mellow four-chord loop on soft triangle voices under a vinyl-crackle
// noise bed, with a lazy kick/snare; SFX are tiny envelopes. Everything
// honors the persisted music/sfx settings and only starts on a user
// gesture (the start menu button).

export interface AudioSettings {
  musicOn: boolean;
  sfxOn: boolean;
  volume: number; // 0..1
}

const KEY = 'electricity.audio.v1';

export function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { musicOn: true, sfxOn: true, volume: 0.6, ...(JSON.parse(raw) as object) };
  } catch {
    // fall through
  }
  return { musicOn: true, sfxOn: true, volume: 0.6 };
}

let settings = loadAudioSettings();
let ctx: AudioContext | undefined;
let master: GainNode | undefined;
let musicBus: GainNode | undefined;
let crackle: AudioBufferSourceNode | undefined;
let schedulerTimer: ReturnType<typeof setInterval> | undefined;
let nextBarTime = 0;
let barIndex = 0;

function ensureCtx(): AudioContext | undefined {
  if (typeof AudioContext === 'undefined') return undefined;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = settings.volume;
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = settings.musicOn ? 1 : 0;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 2400; // warm, lofi
    musicBus.connect(lpf);
    lpf.connect(master);
  }
  void ctx.resume();
  return ctx;
}

export function getAudioSettings(): AudioSettings {
  return { ...settings };
}

export function updateAudioSettings(patch: Partial<AudioSettings>): AudioSettings {
  settings = { ...settings, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // private mode: play on
  }
  if (master) master.gain.value = settings.volume;
  if (musicBus) musicBus.gain.value = settings.musicOn ? 1 : 0;
  if (settings.musicOn) startMusic();
  return getAudioSettings();
}

// --- music ------------------------------------------------------------------

/** Fmaj7 → Em7 → Dm7 → Cmaj7, voiced low-mid. Frequencies in Hz. */
const CHORDS: number[][] = [
  [174.61, 220.0, 261.63, 329.63],
  [164.81, 196.0, 246.94, 293.66],
  [146.83, 174.61, 220.0, 261.63],
  [130.81, 164.81, 196.0, 246.94],
];
const BAR_SEC = 60 / 72 * 4; // 72 bpm, 4 beats

function voice(at: number, freq: number, dur: number, gain: number): void {
  if (!ctx || !musicBus) return;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  osc.detune.value = (Math.random() - 0.5) * 8; // tape wobble
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.4);
  g.gain.setTargetAtTime(0, at + dur - 0.8, 0.4);
  osc.connect(g);
  g.connect(musicBus);
  osc.start(at);
  osc.stop(at + dur + 1);
}

function drum(at: number, kind: 'kick' | 'snare'): void {
  if (!ctx || !musicBus) return;
  if (kind === 'kick') {
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(110, at);
    osc.frequency.exponentialRampToValueAtTime(40, at + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.16, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
    osc.connect(g);
    g.connect(musicBus);
    osc.start(at);
    osc.stop(at + 0.25);
  } else {
    const buf = noiseBuffer(0.12);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.07, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.12);
    src.connect(bp);
    bp.connect(g);
    g.connect(musicBus);
    src.start(at);
  }
}

let cachedNoise: AudioBuffer | undefined;
function noiseBuffer(sec: number): AudioBuffer | undefined {
  if (!ctx) return undefined;
  if (!cachedNoise || cachedNoise.duration < sec) {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * Math.max(sec, 2)), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    cachedNoise = buf;
  }
  return cachedNoise;
}

function scheduleBar(at: number, idx: number): void {
  const chord = CHORDS[idx % CHORDS.length] ?? [];
  for (const f of chord) voice(at, f, BAR_SEC, 0.045);
  // a sparse top note every other bar
  const top = chord[(idx >> 1) % chord.length];
  if (idx % 2 === 1 && top !== undefined) voice(at + BAR_SEC * 0.5, top * 2, BAR_SEC * 0.45, 0.03);
  drum(at, 'kick');
  drum(at + BAR_SEC * 0.5, 'kick');
  drum(at + BAR_SEC * 0.25, 'snare');
  drum(at + BAR_SEC * 0.75, 'snare');
}

export function startMusic(): void {
  const c = ensureCtx();
  if (!c || !settings.musicOn || schedulerTimer) return;

  // vinyl crackle bed
  if (!crackle && musicBus) {
    const buf = noiseBuffer(2);
    if (buf) {
      crackle = c.createBufferSource();
      crackle.buffer = buf;
      crackle.loop = true;
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 5000;
      const g = c.createGain();
      g.gain.value = 0.012;
      crackle.connect(hp);
      hp.connect(g);
      g.connect(musicBus);
      crackle.start();
    }
  }

  nextBarTime = c.currentTime + 0.1;
  schedulerTimer = setInterval(() => {
    if (!ctx || !settings.musicOn) return;
    while (nextBarTime < ctx.currentTime + 2 * BAR_SEC) {
      scheduleBar(nextBarTime, barIndex++);
      nextBarTime += BAR_SEC;
    }
  }, 500);
}

// --- sfx --------------------------------------------------------------------

export type Sfx = 'click' | 'chime' | 'error';

export function playSfx(kind: Sfx): void {
  if (!settings.sfxOn) return;
  const c = ensureCtx();
  if (!c || !master) return;
  const at = c.currentTime;
  const tone = (freq: number, t0: number, dur: number, gain: number, type: OscillatorType): void => {
    if (!c || !master) return;
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  };
  switch (kind) {
    case 'click':
      tone(660, at, 0.07, 0.08, 'square');
      break;
    case 'chime':
      tone(880, at, 0.25, 0.07, 'sine');
      tone(1320, at + 0.09, 0.3, 0.05, 'sine');
      break;
    case 'error':
      tone(180, at, 0.2, 0.09, 'sawtooth');
      break;
  }
}

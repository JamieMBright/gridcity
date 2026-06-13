import { describe, expect, it } from 'vitest';
import {
  alertVisible,
  categorizeEvent,
  EVENT_CATEGORIES,
  type EventCategory,
} from '../src/app/store';

function ev(msg: string, sev: 'info' | 'warn' | 'bad' = 'info'): { sev: typeof sev; msg: string } {
  return { sev, msg };
}

describe('event categorisation (#30)', () => {
  it('routes faults, planning, weather, market, finance from the copy', () => {
    expect(categorizeEvent(ev('132 kV circuit FAULT on the Harlow radial', 'bad'))).toBe('faults');
    expect(categorizeEvent(ev('Planning consent granted for the solar farm'))).toBe('planning');
    expect(categorizeEvent(ev('Storm Bella makes landfall — 78 mph gusts', 'warn'))).toBe('weather');
    expect(categorizeEvent(ev('Wholesale price spiked to £240/MWh'))).toBe('market');
    expect(categorizeEvent(ev('Ofgem penalty applied: bill up £6/home', 'bad'))).toBe('finance');
  });

  it('every event lands in exactly one of the known buckets', () => {
    const samples = [
      ev('a quiet day'),
      ev('something unlabelled happened', 'bad'),
      ev('tender awarded to a developer'),
      ev('frequency dipped to 49.6 Hz', 'warn'),
    ];
    for (const s of samples) {
      const c = categorizeEvent(s);
      expect(EVENT_CATEGORIES).toContain(c);
    }
  });

  it('an unlabelled BAD event defaults to faults; unlabelled info to market', () => {
    expect(categorizeEvent(ev('???', 'bad'))).toBe('faults');
    expect(categorizeEvent(ev('???', 'info'))).toBe('market');
  });

  it('filtering by a category narrows the rows', () => {
    const events = [
      { seq: 1, ...ev('FAULT cleared', 'bad') },
      { seq: 2, ...ev('price update') },
      { seq: 3, ...ev('storm warning', 'warn') },
    ];
    const active = new Set<EventCategory>(['weather']);
    const rows = events.filter((e) => active.has(categorizeEvent(e)));
    expect(rows.map((r) => r.seq)).toEqual([3]);
  });
});

describe('alert acknowledge / snooze visibility (#39)', () => {
  const e = { seq: 7 };

  it('a fresh alert is visible', () => {
    expect(alertVisible(e, 1000, new Set(), {})).toBe(true);
  });

  it('acknowledging hides it for good', () => {
    expect(alertVisible(e, 1000, new Set([7]), {})).toBe(false);
  });

  it('snoozing hides it until the re-fire minute, then it returns', () => {
    const snoozed = { 7: 1060 }; // snoozed until t=1060
    expect(alertVisible(e, 1000, new Set(), snoozed)).toBe(false); // still snoozed
    expect(alertVisible(e, 1059, new Set(), snoozed)).toBe(false); // one min to go
    expect(alertVisible(e, 1060, new Set(), snoozed)).toBe(true); // re-armed exactly on time
    expect(alertVisible(e, 2000, new Set(), snoozed)).toBe(true); // and after
  });

  it('ack wins over a future snooze', () => {
    expect(alertVisible(e, 1000, new Set([7]), { 7: 9999 })).toBe(false);
  });
});

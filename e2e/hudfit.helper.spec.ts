// Objective HUD-fit gate (owner, 2026-06-18: "a checklist to extract from the
// screengrabs … check each thing"). For desktop + phone-landscape + a narrow
// phone-landscape it extracts every chrome panel's bounding box from the live
// DOM and FAILS on any clip / safe-area breach / overlap — the §A objective
// rules in docs/DESIGN_GATE.md. With SHOTS=1 it also writes grabs for the §B
// holistic styling review.
//   npx playwright test e2e/hudfit.helper.spec.ts          (the objective gate)
//   SHOTS=1 npx playwright test e2e/hudfit.helper.spec.ts  (+ grabs)
import { test, expect, type Page } from '@playwright/test';

interface Box { label: string; x: number; y: number; w: number; h: number; r: number; b: number }
interface Report { VW: number; VH: number; panels: Box[]; clip: string[]; safe: string[]; overlap: string[] }

async function ready(page: Page): Promise<void> {
  await expect
    .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), { timeout: 40_000 })
    .toBe(true);
}

async function bootLondon(page: Page, sai: number): Promise<void> {
  await page.goto('/');
  await ready(page);
  await page.evaluate((s) => {
    const r = document.documentElement.style;
    r.setProperty('--sai-l', s + 'px');
    r.setProperty('--sai-r', s + 'px');
    r.setProperty('--sai-b', Math.round(s * 0.45) + 'px');
    r.setProperty('--sai-t', '0px');
  }, sai);
  if (await page.evaluate(() => window.__ec?.getState().menuOpen)) {
    const cont = page.getByRole('button', { name: 'continue' });
    const ng = page.getByRole('button', { name: /new game/i });
    if (await cont.count()) await cont.first().dispatchEvent('click');
    else if (await ng.count()) {
      await ng.first().dispatchEvent('click');
      const lon = page.getByTitle('power London', { exact: true });
      if (await lon.count()) await lon.first().dispatchEvent('click');
    }
    await expect.poll(async () => page.evaluate(() => window.__ec?.getState().menuOpen)).toBe(false);
    const skip = page.getByRole('button', { name: 'skip', exact: true });
    if (await skip.count()) {
      await skip.dispatchEvent('click');
      const rb = page.getByRole('button', { name: 'rebuild it' });
      if (await rb.count()) await rb.dispatchEvent('click');
    }
  }
  await page.waitForTimeout(1100);
}

async function extract(page: Page): Promise<Report> {
  return page.evaluate(() => {
    const VW = innerWidth, VH = innerHeight;
    const sv = (k: string) => parseInt(getComputedStyle(document.documentElement).getPropertyValue(k)) || 0;
    const saiL = sv('--sai-l'), saiR = sv('--sai-r'), saiB = sv('--sai-b'), saiT = sv('--sai-t');
    const panels: Box[] = [];
    for (const el of Array.from(document.querySelectorAll('div,button'))) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'absolute' && cs.position !== 'fixed') continue;
      if (cs.visibility === 'hidden' || cs.opacity === '0' || cs.display === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || (r.width >= VW - 1 && r.height >= VH - 1)) continue;
      const hasBg = cs.backgroundColor !== 'rgba(0, 0, 0, 0)';
      const hasBd = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none';
      if (!hasBg && !hasBd) continue;
      // keep only the OUTERMOST positioned panel (skip nested children)
      let p = el.parentElement, nested = false;
      while (p) {
        const pc = getComputedStyle(p);
        if ((pc.position === 'absolute' || pc.position === 'fixed') && pc.backgroundColor !== 'rgba(0, 0, 0, 0)') { nested = true; break; }
        p = p.parentElement;
      }
      if (nested) continue;
      const label = (el.getAttribute('data-tour') || el.getAttribute('aria-label') || el.textContent || '?').trim().slice(0, 24).replace(/\s+/g, ' ');
      panels.push({ label, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) });
    }
    const clip: string[] = [], safe: string[] = [], overlap: string[] = [];
    for (const e of panels) {
      if (e.x < -1 || e.y < -1 || e.r > VW + 1 || e.b > VH + 1) clip.push(`"${e.label}" [${e.x},${e.y} ${e.w}x${e.h}] r=${e.r} b=${e.b} vs ${VW}x${VH}`);
      if (e.x < saiL - 1) safe.push(`L "${e.label}" x=${e.x}<${saiL}`);
      if (e.r > VW - saiR + 1) safe.push(`R "${e.label}" r=${e.r}>${VW - saiR}`);
      if (e.b > VH - saiB + 1) safe.push(`B "${e.label}" b=${e.b}>${VH - saiB}`);
      if (e.y < saiT - 1) safe.push(`T "${e.label}" y=${e.y}<${saiT}`);
    }
    for (let i = 0; i < panels.length; i++) for (let j = i + 1; j < panels.length; j++) {
      const a = panels[i]!, c = panels[j]!;
      const ox = Math.max(0, Math.min(a.r, c.r) - Math.max(a.x, c.x));
      const oy = Math.max(0, Math.min(a.b, c.b) - Math.max(a.y, c.y));
      if (ox > 4 && oy > 4) overlap.push(`"${a.label}" ∩ "${c.label}" = ${ox}x${oy}`);
    }
    return { VW, VH, panels, clip, safe, overlap };
  });
}

const VIEWS: Array<{ name: string; w: number; h: number; sai: number; mobile: boolean }> = [
  { name: 'desktop-1280', w: 1280, h: 800, sai: 0, mobile: false },
  { name: 'phone-844', w: 844, h: 390, sai: 47, mobile: true },
  { name: 'phone-narrow-667', w: 667, h: 375, sai: 47, mobile: true },
];

for (const v of VIEWS) {
  test.describe(`HUD fit — ${v.name}`, () => {
    test.use({ viewport: { width: v.w, height: v.h }, hasTouch: v.mobile, isMobile: v.mobile });
    test(`no clip / safe-area / overlap @ ${v.w}x${v.h}`, async ({ page }) => {
      test.setTimeout(120_000);
      await bootLondon(page, v.sai);
      const rep = await extract(page);
      console.log(`\n### ${v.name} ${rep.VW}x${rep.VH} — panels ${rep.panels.length}`);
      for (const p of rep.panels) console.log(`   "${p.label}" [${p.x},${p.y} ${p.w}x${p.h}]`);
      if (rep.clip.length) console.log('  CLIP:', rep.clip.join(' | '));
      if (rep.safe.length) console.log('  SAFE:', rep.safe.join(' | '));
      if (rep.overlap.length) console.log('  OVERLAP:', rep.overlap.join(' | '));
      if (process.env.SHOTS) await page.screenshot({ path: `preview/hudfit-${v.name}.png` });
      expect(rep.clip, 'no element clipped by the viewport').toEqual([]);
      expect(rep.safe, 'no element breaching the safe-area insets').toEqual([]);
      expect(rep.overlap, 'no chrome panels overlapping (resting state)').toEqual([]);
    });
  });
}

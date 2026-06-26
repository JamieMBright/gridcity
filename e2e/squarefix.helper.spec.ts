// Square-menu fix — DESIGN gate grabs (owner item #1). Boots a real game,
// opens the rail panels, and captures TIGHT crops of each panel's INNER
// (map-facing) corner — with map showing AROUND the corner — at desktop AND
// phone-landscape, so the rounded corner can be judged by eye against the
// BEFORE proof (scratchpad/repro-corner-A-current.png = hard square).
//   SHOTS=1 PW_PORT=5206 npx playwright test e2e/squarefix.helper.spec.ts --workers=1
import { test, type Page } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

const OUT = process.env.SQ_OUT ?? '/tmp/review-square';

/** Crop a window straddling one TOP corner of a panel so the map shows on
 *  the outer two sides — the rounded silhouette is then unmistakable. side
 *  picks the map-facing vertical edge (right rail → its LEFT edge faces the
 *  map; left rail → its RIGHT edge). */
async function cornerShot(
  page: Page,
  selector: string,
  name: string,
  innerEdge: 'left' | 'right',
): Promise<boolean> {
  const box = await page.evaluate((sel) => {
    // a [data-tour] can match BOTH a small chip and the wide panel/sheet it
    // opens — take the WIDEST match so we always crop the actual panel
    const els = Array.from(document.querySelectorAll(sel));
    let best: DOMRect | null = null;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (!best || r.width > best.width) best = r;
    }
    if (!best) return null;
    return { x: best.x, y: best.y, w: best.width, h: best.height, r: best.right, b: best.bottom };
  }, selector);
  if (!box || box.h < 12 || box.w < 12) {
    console.log(`MISSING ${name}: selector ${selector} -> ${JSON.stringify(box)}`);
    return false;
  }
  const PAD = 30; // map margin shown outside the corner
  const IN = 70; // how far into the panel the crop reaches
  // the map-facing TOP corner the owner's red arrows pointed at
  const edgeX = innerEdge === 'left' ? box.x : box.r;
  const x = innerEdge === 'left' ? edgeX - PAD : edgeX - IN;
  const clip = {
    x: Math.max(0, Math.round(x)),
    y: Math.max(0, Math.round(box.y) - PAD),
    width: PAD + IN,
    height: PAD + IN,
  };
  await page.screenshot({ path: `${OUT}/${name}.png`, clip });
  console.log(`shot ${name}: ${innerEdge}-edge corner box=[${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.w)}x${Math.round(box.h)}]`);
  return true;
}

test.describe('desktop @ 1280x800', () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test('rail corners read rounded', async ({ page }) => {
    test.setTimeout(180_000);
    await boot(page);

    // pin a substation so the InfoPanel pinned inspector (a primary culprit)
    // docks the top of the right rail; the inbox + bill flex beneath it
    const pinned = await page.evaluate(() => {
      const s = window.__ec?.getState();
      const a = s?.snapshot?.assets?.find((x: { kind: string }) => x.kind === 'sub');
      if (a) {
        s?.setSelected({ assetId: a.id });
        return a.id as number;
      }
      return -1;
    });
    console.log('pinned asset id:', pinned);
    await page.waitForTimeout(1200);

    await page.screenshot({ path: `${OUT}/desktop-full.png` });

    // RIGHT rail panels — their map-facing edge is the LEFT edge
    await cornerShot(page, '[data-tour="bill"]', 'desktop-bill-corner', 'left');
    await cornerShot(page, '[data-tour="inbox"]', 'desktop-inbox-corner', 'left');
    // LEFT rail palette — map-facing edge is the RIGHT edge
    await cornerShot(page, '[data-tour="palette"]', 'desktop-palette-corner', 'right');

    // a tall strip down the right rail's inner edge so every panel's left
    // corners read top-to-bottom
    const ip = await page.evaluate(() => {
      const el = document.querySelector('[data-tour="inbox"]');
      return el ? el.getBoundingClientRect().x : null;
    });
    if (ip !== null) {
      await page.screenshot({
        path: `${OUT}/desktop-right-rail-edge.png`,
        clip: { x: Math.max(0, Math.round(ip) - 26), y: 26, width: 90, height: 748 },
      });
    }
  });
});

test.describe('phone-landscape @ 844x390', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  test('rail + sheet corners read rounded', async ({ page }) => {
    test.setTimeout(180_000);
    await boot(page);
    await page.evaluate(() => {
      const r = document.documentElement.style;
      r.setProperty('--sai-l', '47px');
      r.setProperty('--sai-r', '47px');
      r.setProperty('--sai-b', '20px');
      r.setProperty('--sai-t', '0px');
    });
    await page.waitForTimeout(900);

    await page.screenshot({ path: `${OUT}/phone-full.png` });
    // the always-on mobile BUILD RAIL — narrow, so grab a tall strip of its
    // whole inner (right) edge: both its top + bottom corners read rounded
    const br = await page.evaluate(() => {
      const el = document.querySelector('[data-tour="palette"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    if (br) {
      await page.screenshot({
        path: `${OUT}/phone-buildrail-edge.png`,
        clip: {
          x: Math.max(0, Math.round(br.x) - 16),
          y: Math.max(0, Math.round(br.y) - 14),
          width: Math.round(br.w) + 40,
          height: Math.round(br.h) + 28,
        },
      });
    }

    // open the INBOX sheet (a converted rail panel on its sheetFrame)
    const inboxChip = page.getByRole('button', { name: 'inbox' });
    if (await inboxChip.count()) {
      await inboxChip.first().dispatchEvent('click');
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}/phone-inbox-sheet.png` });
      // the sheet's map-facing edge is its LEFT edge
      await cornerShot(page, '[data-tour="inbox"]', 'phone-inbox-corner', 'left');
    } else {
      console.log('inbox chip not found on phone');
    }
    // open the BILL sheet too
    const billChip = page.getByRole('button', { name: 'bill', exact: true });
    if (await billChip.count()) {
      await billChip.first().dispatchEvent('click');
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}/phone-bill-sheet.png` });
      await cornerShot(page, '[data-tour="bill"]', 'phone-bill-corner', 'left');
    } else {
      console.log('bill chip not found on phone');
    }
  });
});

// Undo/redo (worker snapshot stacks) and the pinned inspector card:
// line inspection, underground rebuilds, auto-connect placement.

import { expect, test } from '@playwright/test';
import { assetCount, boot, clickButton, clickTile, openLand, pause, store } from './helpers';

test.describe('undo/redo', () => {
  test('Ctrl+Z / Ctrl+Y and the HUD buttons walk the build history', async ({ page }) => {
    await boot(page);
    await pause(page);
    const base = await assetCount(page);
    const [a] = await openLand(page, 1);
    if (!a) return;

    await page.evaluate(
      (t) => window.__ec?.sendCommand({ type: 'build', spec: { kind: 'sub', sub: 'grid', x: t.x, y: t.y } }),
      a,
    );
    await expect.poll(() => assetCount(page)).toBe(base + 1);

    await page.keyboard.press('Control+z');
    await expect.poll(() => assetCount(page)).toBe(base);
    await page.keyboard.press('Control+y');
    await expect.poll(() => assetCount(page)).toBe(base + 1);

    await clickButton(page, 'undo');
    await expect.poll(() => assetCount(page)).toBe(base);
    await clickButton(page, 'redo');
    await expect.poll(() => assetCount(page)).toBe(base + 1);
  });
});

test.describe('pinned inspector', () => {
  test('clicking an asset pins its card; a GIS rebuild takes', async ({ page }) => {
    await boot(page);
    await pause(page);
    const [a] = await openLand(page, 1);
    if (!a) return;
    await page.evaluate(
      (t) => window.__ec?.sendCommand({ type: 'build', spec: { kind: 'sub', sub: 'grid', x: t.x, y: t.y } }),
      a,
    );
    await expect
      .poll(() => store<number>(page, `(s) => s.snapshot.assets.filter((x) => x.kind === 'sub').length`))
      .toBeGreaterThan(0);

    await clickButton(page, 'Inspect');
    await expect
      .poll(
        async () => {
          await clickTile(page, a);
          return store<boolean>(page, '(s) => s.selectedAsset !== undefined');
        },
        { timeout: 20_000 },
      )
      .toBe(true);
    await clickButton(page, /rebuild underground/);
    await expect
      .poll(() =>
        store<boolean>(
          page,
          `(s) => s.snapshot.assets.some((x) => x.kind === 'sub' && x.underground === true)`,
        ),
      )
      .toBe(true);
  });

  test('clicking a line span shows loading/headroom and undergrounds it', async ({ page }) => {
    await boot(page);
    await pause(page);
    const [a, b] = await openLand(page, 2);
    if (!a || !b) return;
    await page.evaluate(
      (t) => window.__ec?.sendCommand({ type: 'build', spec: { kind: 'sub', sub: 'grid', x: t.x, y: t.y } }),
      a,
    );
    await page.evaluate(
      (t) => window.__ec?.sendCommand({ type: 'build', spec: { kind: 'sub', sub: 'grid', x: t.x, y: t.y } }),
      b,
    );
    await page.evaluate(
      (ts) =>
        window.__ec?.sendCommand({
          type: 'build',
          spec: {
            kind: 'line',
            level: 132,
            build: 'overhead',
            ax: ts.a.x,
            ay: ts.a.y,
            bx: ts.b.x,
            by: ts.b.y,
          },
        }),
      { a, b },
    );
    await expect
      .poll(() => store<number>(page, `(s) => s.snapshot.assets.filter((x) => x.kind === 'line').length`))
      .toBeGreaterThan(0);

    const mid = { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) };
    await clickButton(page, 'Inspect');
    await expect
      .poll(
        async () => {
          await clickTile(page, mid);
          return store<boolean>(page, '(s) => s.selectedLine !== undefined');
        },
        { timeout: 20_000 },
      )
      .toBe(true);
    await expect(page.getByText('headroom')).toBeVisible();
    await clickButton(page, /underground this line/);
    await expect
      .poll(() =>
        store<boolean>(
          page,
          `(s) => s.snapshot.assets.some((x) => x.kind === 'line' && x.build === 'underground')`,
        ),
      )
      .toBe(true);

    // Escape drops the pin
    await page.keyboard.press('Escape');
    expect(await store<boolean>(page, '(s) => s.selectedLine === undefined')).toBe(true);
  });
});

test.describe("tee'd connections", () => {
  test('the armed line tool tees into a passing same-kV circuit', async ({ page }) => {
    await boot(page);
    await pause(page);
    const base = await assetCount(page);
    const [a, b, c] = await openLand(page, 3);
    if (!a || !b || !c) return;
    for (const t of [a, b, c]) {
      await page.evaluate(
        (p) => window.__ec?.sendCommand({ type: 'build', spec: { kind: 'sub', sub: 'grid', x: p.x, y: p.y } }),
        t,
      );
    }
    await page.evaluate(
      (ts) =>
        window.__ec?.sendCommand({
          type: 'build',
          spec: {
            kind: 'line',
            level: 132,
            build: 'overhead',
            ax: ts.a.x,
            ay: ts.a.y,
            bx: ts.b.x,
            by: ts.b.y,
          },
        }),
      { a, b },
    );
    await expect.poll(() => assetCount(page)).toBe(base + 4);

    const mid = { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) };
    await clickButton(page, '132 kV line');
    // anchor on the third sub, then click mid-span: tee + halves + leg
    await expect
      .poll(
        async () => {
          if ((await page.getByText('click the far end · Esc to stop').count()) === 0) {
            await clickTile(page, c);
            return assetCount(page);
          }
          await clickTile(page, mid);
          return assetCount(page);
        },
        { timeout: 30_000 },
      )
      .toBe(base + 7);
    await expect
      .poll(() =>
        store<number>(
          page,
          `(s) => s.snapshot.assets.filter((x) => x.kind === 'sub' && x.sub === 'tee').length`,
        ),
      )
      .toBe(1);
  });
});

test.describe('auto-connect placement', () => {
  test('the palette toggle arms it; a new sub feeds itself', async ({ page }) => {
    await boot(page);
    await pause(page);
    const base = await assetCount(page);
    const [a, b] = await openLand(page, 2);
    if (!a || !b) return;

    await clickButton(page, /auto-connect on placement/);
    expect(await store<boolean>(page, '(s) => s.autoConnect')).toBe(true);

    await page.evaluate(
      (t) => window.__ec?.sendCommand({ type: 'build', spec: { kind: 'sub', sub: 'grid', x: t.x, y: t.y } }),
      a,
    );
    await expect.poll(() => assetCount(page)).toBe(base + 1);
    // the dist sub arrives WITH its 33 kV feeder from the grid sub
    await page.evaluate(
      (t) =>
        window.__ec?.sendCommand({
          type: 'build',
          spec: { kind: 'sub', sub: 'dist', x: t.x, y: t.y, autoConnect: true },
        }),
      b,
    );
    await expect.poll(() => assetCount(page)).toBe(base + 3);
  });
});

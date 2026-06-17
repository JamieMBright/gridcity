import { expect, test } from '@playwright/test';
import { boot } from './helpers';

// Crash capture + self-heal logging (urgent owner request). Exercises every
// route end to end: a forced React render error → ErrorBoundary fallback +
// Copy diagnostics; a thrown window error → captured + persisted; a sim Web
// Worker crash → captured with source 'worker'. Deterministic: the crashes
// are fired through the dev-only window.__ec test hook (un-fireable in normal
// play / production), and we assert on the persisted error-log ring.

const LOG_KEY = 'ec-error-log-v1';

/** The persisted error-log ring as captured by errorLog. */
async function persistedLog(page: import('@playwright/test').Page): Promise<
  Array<{ message: string; source: string; stack?: string }>
> {
  const raw = await page.evaluate((k) => localStorage.getItem(k), LOG_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as Array<{ message: string; source: string }>) : [];
  } catch {
    return [];
  }
}

test.describe('crash capture + ErrorBoundary', () => {
  test('a render crash shows the dusk fallback with copy + reload', async ({ page }) => {
    await boot(page);

    // force a render-time throw via the dev hook (arms the CrashCanary)
    await page.evaluate(() => window.__ec?.crashRender());

    // the on-brand fallback replaces the app
    const fallback = page.getByTestId('error-boundary');
    await expect(fallback).toBeVisible();
    await expect(page.getByText('Something tripped a fuse')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible();
    const copyBtn = page.getByRole('button', { name: 'Copy diagnostics' });
    await expect(copyBtn).toBeVisible();

    // the boundary captured the render error with a component stack
    await expect
      .poll(async () => (await persistedLog(page)).some((e) => e.source === 'react'))
      .toBe(true);
    const reactErr = (await persistedLog(page)).find((e) => e.source === 'react');
    expect(reactErr?.message).toContain('__crashRender');

    // "Copy diagnostics" toggles to the copied confirmation (clipboard write
    // is granted below; the state flip proves the handler ran)
    await copyBtn.click();
    await expect(page.getByRole('button', { name: 'Copied ✓' })).toBeVisible();

    // "Show details" reveals the stack
    await page.getByRole('button', { name: 'Show details' }).click();
    await expect(page.getByTestId('error-stack')).toBeVisible();
  });

  test('an uncaught window error is captured and persisted', async ({ page }) => {
    await boot(page);

    // throw asynchronously so it reaches the global 'error' handler rather
    // than being caught by the evaluate wrapper
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error('e2e-window-boom');
      }, 0);
    });

    await expect
      .poll(async () =>
        (await persistedLog(page)).some(
          (e) => e.source === 'window' && e.message.includes('e2e-window-boom'),
        ),
      )
      .toBe(true);
  });

  test('an unhandled promise rejection is captured', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      void Promise.reject(new Error('e2e-rejection-boom'));
    });
    await expect
      .poll(async () =>
        (await persistedLog(page)).some(
          (e) => e.source === 'unhandledrejection' && e.message.includes('e2e-rejection-boom'),
        ),
      )
      .toBe(true);
  });

  test('a sim worker crash is captured with source worker', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => window.__ec?.crashWorker());
    await expect
      .poll(async () =>
        (await persistedLog(page)).some(
          (e) => e.source === 'worker' && e.message.includes('__crashTest'),
        ),
      )
      .toBe(true);
  });
});

// grant clipboard so the Copy diagnostics button's navigator.clipboard path
// runs (Chromium needs the permission for a non-user-gesture-ish context).
test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

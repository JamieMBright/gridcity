// Local PRODUCTION-build repro for the London-load crash. Boots the prod
// preview (default scenario = London), then drives "new game -> London", in
// both desktop and iPhone-emulated contexts, capturing real JS exceptions and
// whether the ErrorBoundary "tripped a fuse" fallback appears. Network noise
// (Supabase unreachable in the sandbox) is filtered.
import { chromium, devices } from '@playwright/test';

const URL = process.argv[2] || 'http://localhost:4322/';
const useIphone = process.argv.includes('--iphone');
const BENIGN = /ERR_CERT|Failed to load resource|net::ERR|favicon|supabase\.co|fonts\.|status of [45]\d\d/i;

const browser = await chromium.launch({
  executablePath: '/tmp/chromium',
  args: ['--no-sandbox', '--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, ...(useIphone ? devices['iPhone 13'] : {}) });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}\n${e.stack || ''}`));
page.on('console', (m) => { if (m.type() === 'error' && !BENIGN.test(m.text())) errors.push(`[console] ${m.text()}`); });

await page.goto(URL, { waitUntil: 'load', timeout: 60000 }).catch((e) => errors.push(`[goto] ${e.message}`));
await page.waitForTimeout(9000); // worker boot + default London render
const fuseBoot = await page.locator('text=/tripped a fuse|something went wrong|reload/i').count().catch(() => 0);

let clicked = '';
try {
  const ng = page.getByText(/new game/i).first();
  if (await ng.count()) { await ng.click({ timeout: 5000 }); clicked += 'newgame '; await page.waitForTimeout(1500); }
  const lon = page.getByRole('button', { name: /London/ }).first();
  if (await lon.count()) { await lon.click({ timeout: 5000 }); clicked += 'london '; await page.waitForTimeout(9000); }
} catch (e) { errors.push(`[drive] ${e.message}`); }
const fuseLondon = await page.locator('text=/tripped a fuse|something went wrong|reload/i').count().catch(() => 0);

console.log(`MODE=${useIphone ? 'iphone' : 'desktop'} FALLBACK_after_boot=${fuseBoot} clicked="${clicked}" FALLBACK_after_london=${fuseLondon}`);
console.log('ERRORS:\n' + (errors.join('\n===\n') || '(none)'));
await browser.close();

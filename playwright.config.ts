import { defineConfig } from '@playwright/test';

// Locally/sandboxed, Chromium comes from the @sparticuz/chromium npm package
// (the Playwright CDN is unreachable in some sandboxes) and global-setup
// extracts it to /tmp. On CI the standard `playwright install chromium`
// browser is used instead.
const sandboxChromium = !process.env.CI;

// Port is env-overridable (PW_PORT) so parallel Playwright runs (e.g. several
// background subagents + the main session each taking design screenshots) can
// each take a distinct port instead of all colliding on a single strict port.
const PORT = process.env.PW_PORT ?? '5199';
const BASE = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'e2e',
  ...(sandboxChromium ? { globalSetup: './e2e/global-setup.ts' } : {}),
  // two parallel browsers on 4 cores roughly halves the wall clock;
  // the software-WebGL canvas is CPU-bound but tests share one dev server
  workers: 2,
  // 90s per test: under 2-worker load the software-WebGL canvas + a boot()
  // through the city picker pushes the heavier sim tests (build/undo/time-skip)
  // close to a 60s edge — they passed only on retry. 90s gives headroom so the
  // gate is reliable (a genuinely hung test still fails, just 30s later).
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 1,
  use: {
    baseURL: BASE,
    // small viewport: the canvas renders under software WebGL, and frame
    // cost dominates e2e runtime
    viewport: { width: 1100, height: 700 },
    launchOptions: {
      ...(sandboxChromium ? { executablePath: '/tmp/chromium' } : {}),
      args: [
        '--no-sandbox',
        '--disable-gpu',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--disable-dev-shm-usage',
      ],
    },
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE,
    // ALWAYS a fresh server: a lingering dev server once served a stale
    // module graph and masked real failures. Local runs must behave
    // exactly like a clean-checkout run.
    reuseExistingServer: false,
    timeout: 60_000,
  },
});

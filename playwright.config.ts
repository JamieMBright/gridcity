import { defineConfig } from '@playwright/test';

// Locally/sandboxed, Chromium comes from the @sparticuz/chromium npm package
// (the Playwright CDN is unreachable in some sandboxes) and global-setup
// extracts it to /tmp. On CI the standard `playwright install chromium`
// browser is used instead.
const sandboxChromium = !process.env.CI;

export default defineConfig({
  testDir: 'e2e',
  ...(sandboxChromium ? { globalSetup: './e2e/global-setup.ts' } : {}),
  workers: 1, // WebGL canvas under software rendering: keep it serial
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 1,
  use: {
    baseURL: 'http://localhost:5199',
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
    command: 'npm run dev -- --port 5199 --strictPort',
    url: 'http://localhost:5199',
    // ALWAYS a fresh server: a lingering dev server once served a stale
    // module graph and masked real failures. Local runs must behave
    // exactly like a clean-checkout run.
    reuseExistingServer: false,
    timeout: 60_000,
  },
});

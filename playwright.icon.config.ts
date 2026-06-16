// Worktree-local Playwright config for the icon-frame capture helper ONLY.
// The shared box already had a dev server on 5199 (another agent), so this
// config points at a private server we start ourselves on 5233 and reuses it
// (we own it, and we tear it down after). Bigger viewport for crisper crops.
import { defineConfig } from '@playwright/test';

const sandboxChromium = !process.env.CI;

export default defineConfig({
  testDir: 'e2e',
  ...(sandboxChromium ? { globalSetup: './e2e/global-setup.ts' } : {}),
  workers: 1,
  timeout: 420_000,
  expect: { timeout: 15_000 },
  retries: 0,
  use: {
    baseURL: 'http://localhost:5233',
    viewport: { width: 1280, height: 900 },
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
  // reuse our own private server (started in the shell on 5233)
  webServer: {
    command: 'npm run dev -- --port 5233 --strictPort',
    url: 'http://localhost:5233',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});

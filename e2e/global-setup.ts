// Extracts the npm-packaged Chromium to /tmp/chromium before any test runs.

import chromium from '@sparticuz/chromium';

export default async function globalSetup(): Promise<void> {
  const path = await chromium.executablePath();
  if (path !== '/tmp/chromium') {
    throw new Error(`unexpected chromium path: ${path}`);
  }
}

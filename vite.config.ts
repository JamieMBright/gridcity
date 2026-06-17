/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Build stamp baked into the bundle for crash diagnostics (errorLog reads
// __BUILD_ID__): git short-sha + ISO date, env-overridable for CI/Vercel.
// Best-effort — a checkout without git falls back to 'dev'.
function buildId(): string {
  if (process.env.VITE_BUILD_ID) return process.env.VITE_BUILD_ID;
  try {
    const sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    return `${sha}-${new Date().toISOString().slice(0, 10)}`;
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    // stringified so it injects as a string literal in BOTH the main thread
    // and the worker bundle (worker.format 'es' inherits top-level defines).
    __BUILD_ID__: JSON.stringify(buildId()),
  },
  worker: {
    format: 'es',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});

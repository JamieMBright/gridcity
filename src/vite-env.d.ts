/// <reference types="vite/client" />

// Build stamp injected by Vite's `define` (see vite.config.ts). Declared
// here so it type-checks anywhere it's read (buildInfo.ts / errorLog.ts).
declare const __BUILD_ID__: string;

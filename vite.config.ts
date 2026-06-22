import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Cross-origin isolation headers — required for SharedArrayBuffer (Phase 1 Worker path).
// Harmless for the main-thread vertical slice; keeps the dev/preview server SAB-ready.
const coiHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  server: { headers: coiHeaders },
  preview: { headers: coiHeaders },
  worker: { format: 'es' },
  build: {
    target: 'esnext',
    sourcemap: false, // explicit: never ship sourcemaps (they can embed local absolute paths)
    // No inline module-preload polyfill, so the production HTML has zero inline <script> and a
    // strict `script-src 'self'` CSP holds (the app targets modern WebGPU/WebGL browsers anyway).
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        demo: resolve(__dirname, 'demo.html'),
      },
    },
  },
});

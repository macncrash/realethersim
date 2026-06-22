import { defineConfig } from 'vite';

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
  build: { target: 'esnext' },
});

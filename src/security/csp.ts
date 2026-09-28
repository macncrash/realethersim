// Content-Security-Policy — the single source of truth for every place a CSP is sent:
//   • production: the SHARED Caddy front door on ps0 (~/ethersim/deploy/Caddyfile — authoritative; it
//     also fronts other sites). The sibling repo ethersim-deploy holds only a local mirror of it.
//   • public/_headers (a Cloudflare/Netlify-style mirror, copied into the build output)
//   • vite dev + preview (so a CSP-only bug shows up locally instead of first on the live site —
//     the silent Custom Equation breakage happened precisely because dev sent no CSP)
// test/csp.test.ts asserts the local files contain exactly these strings; after a deploy, confirm the
// live policy with `curl -sI https://ethersim.ai/ | grep -i content-security`.

type Csp = Record<string, string[]>;

export function serializeCsp(csp: Csp): string {
  return Object.entries(csp)
    .map(([directive, sources]) => (sources.length ? `${directive} ${sources.join(' ')}` : directive))
    .join('; ');
}

// The app never evaluates strings as code: no 'unsafe-eval', no inline scripts. Generated or
// user-authored sim code will run only in the sandbox (below), never in this document.
export const APP_CSP_DIRECTIVES: Csp = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"], // inline <style> + Tweakpane/KaTeX inject styles at runtime
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'frame-ancestors': ["'none'"],
  'form-action': ["'none'"],
};
export const APP_CSP = serializeCsp(APP_CSP_DIRECTIVES);

// Dev server only: Vite's HMR client needs a websocket back to the dev server.
export const APP_DEV_CSP = serializeCsp({
  ...APP_CSP_DIRECTIVES,
  'connect-src': [...APP_CSP_DIRECTIVES['connect-src'], 'ws:', 'wss:'],
});

// The sandbox document that will run generated sim code (served from a separate site so a runaway
// sim can't freeze the app). Code may eval here, but it can reach no network, embed nothing, and can
// only be framed by the app. Not deployed yet — see the ETHERSIM Studio plan (Phase 2).
export const SANDBOX_ORIGIN = 'https://sim.holodeck1.ai';
export const APP_ORIGINS = [
  'https://ethersim.ai',
  'https://www.ethersim.ai',
  'https://app1.ethersim.ai',
  'https://app2.ethersim.ai',
  'https://app3.ethersim.ai',
];
export const SANDBOX_CSP_DIRECTIVES: Csp = {
  'default-src': ["'none'"],
  'script-src': ["'unsafe-inline'", "'unsafe-eval'"], // single-file relay + the loader's new Function
  'worker-src': ['blob:'],
  'connect-src': ["'none'"],
  'img-src': ["'none'"],
  'style-src': ["'none'"],
  'font-src': ["'none'"],
  'media-src': ["'none'"],
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'manifest-src': ["'none'"],
  'base-uri': ["'none'"],
  'form-action': ["'none'"],
  'frame-ancestors': APP_ORIGINS,
  sandbox: ['allow-scripts'], // even a top-level visit gets an opaque origin
};
export const SANDBOX_CSP = serializeCsp(SANDBOX_CSP_DIRECTIVES);

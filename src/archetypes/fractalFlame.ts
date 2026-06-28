import type {
  Archetype,
  ArchetypeConfig,
  ArchetypeFactory,
  NodeSpec,
  ParamSpec,
  RenderHint,
  ResolvedParams,
} from '../core/archetype';
import { hslToRgb } from '../core/color';
import { mulberry32, type Rng } from '../state/rng';

// Fractal flames (Scott Draves): the chaos game of an IFS, but each function applies NONLINEAR
// "variations" (sinusoidal, spherical, swirl, horseshoe, julia, …) after its affine map. Where pure
// affine maps give ferns and gaskets, the variations bend the copies into the flowing, glowing,
// organic structures of flame art. A point repeatedly picks a weighted-random function and is moved by
// it; with hundreds of thousands of points the additive density traces the attractor. Optional N-fold
// rotational symmetry (extra rotation transforms) yields mandalas. The flame is chosen by an integer
// seed, so scrubbing it explores a whole family. Colour is a fixed iridescent index gradient (the
// colour buffer uploads once); the structure is the star.
const TAU = Math.PI * 2;
const EPS = 1e-9;

// A flame "function": affine pre-map (a,b,c,d,e,f) + a nonlinear variation, selected by weight p.
interface FFunc {
  a: number; b: number; c: number; d: number; e: number; f: number;
  v: number; // variation id
  p: number; // selection weight
}

// Variation ids — a curated, well-behaved subset of the classic flame variations.
// (id 0 = linear / identity — the unmatched default in variation())
const SINUSOIDAL = 1, SPHERICAL = 2, SWIRL = 3, HORSESHOE = 4, HANDKERCHIEF = 5,
  DISC = 6, SPIRAL = 7, DIAMOND = 8, JULIA = 9, EYEFISH = 10, HYPERBOLIC = 11;
// Radius-PRESERVING / bounded variations only — these keep the vertex structure spread out. The
// strongly origin-contracting ones (spherical, eyefish, spiral, hyperbolic) would collapse a
// symmetric vertex flame back to a point, so they're left out of the random pick.
const PICKABLE = [SINUSOIDAL, SWIRL, HORSESHOE, HANDKERCHIEF, DISC, DIAMOND, JULIA];

// One symmetric "generator": a scale-s rotation translated toward a vertex on a circle of radius rad,
// carrying variation v. Replicating it under the N rotations of the symmetry group gives an N-fold
// symmetric, contractive (s<1 ⇒ bounded), spread-out attractor — reliably a real flame, not a collapsed
// point. (Pure random affines mostly collapse; the N-gon-vertex structure is the robust recipe.)
function buildFlame(seed: number, symmetry: number): { funcs: FFunc[]; cum: number[] } {
  const rng = mulberry32(seed * 2654435761 + 12345);
  const N = Math.max(2, Math.round(symmetry));
  // two generators (a wide one + an inner one, different variations) for richer structure
  const gens = [
    { s: 0.42 + 0.16 * rng(), rad: 0.9 + 0.5 * rng(), rot: (rng() - 0.5) * 2.4, v: PICKABLE[Math.floor(rng() * PICKABLE.length)], a0: rng() * TAU },
    { s: 0.34 + 0.16 * rng(), rad: 0.25 + 0.5 * rng(), rot: (rng() - 0.5) * 2.4, v: PICKABLE[Math.floor(rng() * PICKABLE.length)], a0: rng() * TAU },
  ];
  const funcs: FFunc[] = [];
  for (const g of gens) {
    for (let k = 0; k < N; k++) {
      const ang = g.a0 + (TAU * k) / N; // vertex angle (replicated N-fold ⇒ exact symmetry)
      const rot = g.rot + (TAU * k) / N; // the copy's rotation turns with the vertex
      const ca = g.s * Math.cos(rot);
      const sa = g.s * Math.sin(rot);
      funcs.push({ a: ca, b: -sa, c: sa, d: ca, e: g.rad * Math.cos(ang) * (1 - g.s), f: g.rad * Math.sin(ang) * (1 - g.s), v: g.v, p: 1 });
    }
  }
  const total = funcs.reduce((s, m) => s + m.p, 0);
  const cum: number[] = [];
  let acc = 0;
  for (const m of funcs) {
    acc += m.p / total;
    cum.push(acc);
  }
  cum[cum.length - 1] = 1.0001;
  return { funcs, cum };
}

const PARAM_SPEC: ParamSpec[] = [
  { key: 'flame', label: 'flame seed', min: 1, max: 300, step: 1, default: 3, rebuild: true },
  { key: 'symmetry', label: 'symmetry', min: 2, max: 9, step: 1, default: 5, rebuild: true },
];

// Apply variation v to (x,y), writing into out[0],out[1]. rng only used by stochastic variations.
function variation(v: number, x: number, y: number, rng: Rng, out: Float64Array): void {
  const r2 = x * x + y * y;
  const r = Math.sqrt(r2);
  switch (v) {
    case SINUSOIDAL: out[0] = Math.sin(x); out[1] = Math.sin(y); return;
    case SPHERICAL: { const ir = 1 / (r2 + EPS); out[0] = x * ir; out[1] = y * ir; return; }
    case SWIRL: { const s = Math.sin(r2), c = Math.cos(r2); out[0] = x * s - y * c; out[1] = x * c + y * s; return; }
    case HORSESHOE: { const ir = 1 / (r + EPS); out[0] = (x - y) * (x + y) * ir; out[1] = 2 * x * y * ir; return; }
    case HANDKERCHIEF: { const th = Math.atan2(y, x); out[0] = r * Math.sin(th + r); out[1] = r * Math.cos(th - r); return; }
    case DISC: { const th = Math.atan2(y, x) / Math.PI; const pr = Math.PI * r; out[0] = th * Math.sin(pr); out[1] = th * Math.cos(pr); return; }
    case SPIRAL: { const th = Math.atan2(y, x); const ir = 1 / (r + EPS); out[0] = ir * (Math.cos(th) + Math.sin(r)); out[1] = ir * (Math.sin(th) - Math.cos(r)); return; }
    case DIAMOND: { const th = Math.atan2(y, x); out[0] = Math.sin(th) * Math.cos(r); out[1] = Math.cos(th) * Math.sin(r); return; }
    case JULIA: { const th = Math.atan2(y, x) * 0.5 + (rng() < 0.5 ? 0 : Math.PI); const sr = Math.sqrt(r); out[0] = sr * Math.cos(th); out[1] = sr * Math.sin(th); return; }
    case EYEFISH: { const k = 2 / (r + 1); out[0] = k * x; out[1] = k * y; return; }
    case HYPERBOLIC: { const th = Math.atan2(y, x); out[0] = Math.sin(th) / (r + EPS); out[1] = r * Math.cos(th); return; }
    default: out[0] = x; out[1] = y; return; // LINEAR
  }
}

class FractalFlameArchetype implements Archetype {
  readonly id = 'fractalFlame';
  readonly kind = 'flow' as const;
  readonly particleCount: number;
  private readonly state: Float64Array; // x, y per particle
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly rng: Rng;
  private funcs: FFunc[] = [];
  private cum: number[] = [];
  private scale = 1;
  private cx = 0;
  private cy = 0;
  private readonly scratch = new Float64Array(2);
  private rebuildKey = '';

  constructor(config: ArchetypeConfig) {
    const n = config.particleCount;
    this.particleCount = n;
    this.state = new Float64Array(n * 2);
    this.positions = new Float32Array(n * 3);
    this.colors = new Float32Array(n * 3);
    this.rng = mulberry32(config.seed ^ 0x9e3779b9);
    // Fixed palette by particle index, uploaded once. Each flame seed picks a different base hue, with a
    // NARROW saturated band around it (a wide band would additively wash to white where copies overlap)
    // — so dense cores read pale and sparse edges keep the tint, the iridescent flame look.
    const baseHue = ((Math.round((config.params.flame as number) ?? 3) * 0.137) % 1 + 1) % 1;
    for (let i = 0; i < n; i++) {
      hslToRgb((baseHue + 0.16 * (i / n)) % 1, 0.72, 0.62, this.colors, i * 3);
    }
    this.rebuild(config.params);
  }

  private rebuild(p: ResolvedParams): void {
    const seed = Math.round(p.flame ?? 3);
    const sym = Math.round(p.symmetry ?? 5);
    this.rebuildKey = `${seed},${sym}`;
    const built = buildFlame(seed, sym);
    this.funcs = built.funcs;
    this.cum = built.cum;

    // Estimate the attractor's extent ROBUSTLY (a few sample orbits, transient discarded). Use the
    // 2nd–98th PERCENTILE, not min/max — flame variations fling occasional points far, and raw min/max
    // would blow up the bbox so the real attractor renders as a tiny central blob.
    const srng = mulberry32(seed * 40503 + 99);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let s = 0; s < 30; s++) {
      let x = srng() - 0.5;
      let y = srng() - 0.5;
      for (let it = 0; it < 360; it++) {
        [x, y] = this.iterate(x, y, srng);
        if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 1e4 || Math.abs(y) > 1e4) { x = srng() - 0.5; y = srng() - 0.5; continue; }
        if (it > 30) { xs.push(x); ys.push(y); }
      }
    }
    const pct = (arr: number[], q: number): number => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(arr.length * q)))];
    if (xs.length < 10) {
      this.scale = 1; this.cx = 0; this.cy = 0;
    } else {
      xs.sort((p, q) => p - q);
      ys.sort((p, q) => p - q);
      const x0 = pct(xs, 0.02), x1 = pct(xs, 0.98), y0 = pct(ys, 0.02), y1 = pct(ys, 0.98);
      const range = Math.max(x1 - x0, y1 - y0, 0.1);
      this.scale = 2.6 / range;
      this.cx = (x0 + x1) / 2;
      this.cy = (y0 + y1) / 2;
    }

    // Seed particles ON the attractor (per-particle warm-up) so the first frame is already formed.
    const n = this.particleCount;
    const st = this.state;
    const rng = this.rng;
    for (let i = 0; i < n; i++) {
      let x = rng() - 0.5;
      let y = rng() - 0.5;
      for (let it = 0; it < 25; it++) [x, y] = this.iterate(x, y, rng);
      if (!Number.isFinite(x) || Math.abs(x) > 1e4) { x = 0; y = 0; }
      if (!Number.isFinite(y) || Math.abs(y) > 1e4) { y = 0; }
      st[i * 2] = x;
      st[i * 2 + 1] = y;
    }
    this.syncPositions();
  }

  // One chaos-game step: pick a weighted function, apply its affine then its variation.
  private iterate(x: number, y: number, rng: Rng): [number, number] {
    const cum = this.cum;
    const funcs = this.funcs;
    const K = funcs.length;
    const rv = rng();
    let mi = 0;
    while (mi < K - 1 && rv > cum[mi]) mi++;
    const m = funcs[mi];
    const px = m.a * x + m.b * y + m.e;
    const py = m.c * x + m.d * y + m.f;
    variation(m.v, px, py, rng, this.scratch);
    return [this.scratch[0], this.scratch[1]];
  }

  step(_dt: number, p: ResolvedParams): void {
    const key = `${Math.round(p.flame ?? 3)},${Math.round(p.symmetry ?? 5)}`;
    if (key !== this.rebuildKey) {
      this.rebuild(p);
      return;
    }
    const n = this.particleCount;
    const st = this.state;
    const rng = this.rng;
    for (let i = 0; i < n; i++) {
      const o = i * 2;
      const [nx, ny] = this.iterate(st[o], st[o + 1], rng);
      if (!Number.isFinite(nx) || !Number.isFinite(ny) || Math.abs(nx) > 1e4 || Math.abs(ny) > 1e4) {
        st[o] = rng() - 0.5; // escaped → reseed near the origin; the game pulls it back to the attractor
        st[o + 1] = rng() - 0.5;
      } else {
        st[o] = nx;
        st[o + 1] = ny;
      }
    }
    this.syncPositions();
  }

  private syncPositions(): void {
    const n = this.particleCount;
    const st = this.state;
    const pos = this.positions;
    const s = this.scale;
    const cx = this.cx;
    const cy = this.cy;
    for (let i = 0; i < n; i++) {
      const o = i * 2;
      const po = i * 3;
      let x = (st[o] - cx) * s;
      let y = (st[o + 1] - cy) * s;
      if (!Number.isFinite(x)) x = 0;
      if (!Number.isFinite(y)) y = 0;
      pos[po] = Math.max(-10, Math.min(10, x)); // pin rare outliers just outside the frame (bounded ≪ 50)
      pos[po + 1] = Math.max(-10, Math.min(10, y));
      pos[po + 2] = 0;
    }
  }

  readPositions(): Float32Array {
    return this.positions;
  }
  readColors(): Float32Array {
    return this.colors;
  }
  readState(): Float64Array {
    return this.state;
  }
  loadState(s: Float64Array): void {
    this.state.set(s.subarray(0, this.state.length));
    this.syncPositions();
  }
  getHierarchy(): NodeSpec[] {
    return [{ id: 'root', parentId: null, label: `Flame (${this.funcs.length} maps)`, stateOffset: 0, stateLength: this.state.length }];
  }
  renderHint(): RenderHint {
    return { geometry: 'points', pointSize: 0.006 };
  }
  dispose(): void {
    /* buffers GC with the instance */
  }
}

export const fractalFlameFactory: ArchetypeFactory = {
  id: 'fractalFlame',
  label: 'Fractal Flame',
  category: 'Fractal',
  kind: 'flow',
  params: PARAM_SPEC,
  defaultParticleCount: 150_000,
  particleCountOptions: [60_000, 150_000, 300_000],
  defaultDt: 0.004,
  defaultTrail: 0, // the additive density of the chaos game IS the image
  create: (config) => new FractalFlameArchetype(config),
};

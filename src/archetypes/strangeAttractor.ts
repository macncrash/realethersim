import type {
  Archetype,
  ArchetypeConfig,
  ArchetypeFactory,
  Derivative,
  NodeSpec,
  ParamSpec,
  RenderHint,
  ResolvedParams,
} from '../core/archetype';
import { spectralGradient } from '../core/color';
import { rk4Step } from '../physics/integrators/rk4';
import { mulberry32, type Rng } from '../state/rng';

// A strange-attractor system: one ODE flow shared by an ensemble of particles that differ
// only in initial conditions. The 100k "particles" are a cloud of initial conditions
// collapsing onto the attractor manifold.
export interface AttractorSystem {
  id: string;
  label: string;
  dim: number; // 3 for all classic attractors here
  dt: number; // per-system integration step (set on the global dt when this system is selected)
  defaults: Record<string, number>; // system params (σ, ρ, β …)
  paramSpec: ParamSpec[]; // UI controls for this system
  deriv: Derivative;
  seedPoint: number[]; // canonical on-attractor point (Lyapunov start + center reference)
  sampleInit(out: Float64Array, off: number, rng: Rng): void;
  scale: number; // world-space render scale
  center: [number, number, number]; // subtracted before scaling to recentre the manifold
  pointSize: number;
}

export const LORENZ: AttractorSystem = {
  id: 'lorenz',
  label: 'Lorenz',
  dim: 3,
  dt: 0.005,
  defaults: { sigma: 10, rho: 28, beta: 8 / 3 },
  paramSpec: [
    { key: 'sigma', label: 'σ', min: 0, max: 30, step: 0.1, default: 10 },
    { key: 'rho', label: 'ρ', min: 0, max: 60, step: 0.1, default: 28 },
    { key: 'beta', label: 'β', min: 0, max: 6, step: 0.01, default: 8 / 3 },
  ],
  deriv: (o, x, p) => {
    o[0] = p.sigma * (x[1] - x[0]);
    o[1] = x[0] * (p.rho - x[2]) - x[1];
    o[2] = x[0] * x[1] - p.beta * x[2];
  },
  seedPoint: [0, 1, 1.05],
  sampleInit: (out, off, rng) => {
    out[off] = (rng() * 2 - 1) * 18;
    out[off + 1] = (rng() * 2 - 1) * 24;
    out[off + 2] = rng() * 48;
  },
  scale: 0.06,
  center: [0, 0, 25],
  pointSize: 0.014,
};

export const ROSSLER: AttractorSystem = {
  id: 'rossler',
  label: 'Rössler',
  dim: 3,
  dt: 0.012,
  defaults: { a: 0.2, b: 0.2, c: 5.7 },
  paramSpec: [
    { key: 'a', min: 0, max: 0.5, step: 0.001, default: 0.2 },
    { key: 'b', min: 0, max: 2, step: 0.01, default: 0.2 },
    { key: 'c', min: 1, max: 18, step: 0.1, default: 5.7 },
  ],
  deriv: (o, x, p) => {
    o[0] = -(x[1] + x[2]);
    o[1] = x[0] + p.a * x[1];
    o[2] = p.b + x[2] * (x[0] - p.c);
  },
  seedPoint: [0.1, 0, 0],
  sampleInit: (out, off, rng) => {
    out[off] = (rng() * 2 - 1) * 12;
    out[off + 1] = (rng() * 2 - 1) * 12;
    out[off + 2] = rng() * 24;
  },
  scale: 0.1,
  center: [0, 0, 6],
  pointSize: 0.014,
};

export const AIZAWA: AttractorSystem = {
  id: 'aizawa',
  label: 'Aizawa',
  dim: 3,
  dt: 0.008,
  defaults: { a: 0.95, b: 0.7, c: 0.6, d: 3.5, e: 0.25, f: 0.1 },
  paramSpec: [
    { key: 'a', min: 0, max: 2, step: 0.01, default: 0.95 },
    { key: 'b', min: 0, max: 2, step: 0.01, default: 0.7 },
    { key: 'c', min: 0, max: 2, step: 0.01, default: 0.6 },
    { key: 'd', min: 0, max: 6, step: 0.01, default: 3.5 },
    { key: 'e', min: 0, max: 1, step: 0.01, default: 0.25 },
    { key: 'f', min: 0, max: 1, step: 0.01, default: 0.1 },
  ],
  deriv: (o, x, p) => {
    const xx = x[0];
    const yy = x[1];
    const zz = x[2];
    o[0] = (zz - p.b) * xx - p.d * yy;
    o[1] = p.d * xx + (zz - p.b) * yy;
    o[2] = p.c + p.a * zz - (zz * zz * zz) / 3 - (xx * xx + yy * yy) * (1 + p.e * zz) + p.f * zz * xx * xx * xx;
  },
  seedPoint: [0.1, 0, 0],
  sampleInit: (out, off, rng) => {
    out[off] = (rng() * 2 - 1) * 1.2;
    out[off + 1] = (rng() * 2 - 1) * 1.2;
    out[off + 2] = (rng() * 2 - 1) * 1.4;
  },
  scale: 1.3,
  center: [0, 0, 0.4],
  pointSize: 0.012,
};

export const THOMAS: AttractorSystem = {
  id: 'thomas',
  label: 'Thomas',
  dim: 3,
  dt: 0.03,
  defaults: { b: 0.19 },
  paramSpec: [{ key: 'b', min: 0.05, max: 0.4, step: 0.005, default: 0.19 }],
  deriv: (o, x, p) => {
    o[0] = Math.sin(x[1]) - p.b * x[0];
    o[1] = Math.sin(x[2]) - p.b * x[1];
    o[2] = Math.sin(x[0]) - p.b * x[2];
  },
  seedPoint: [0.1, 0, 0],
  sampleInit: (out, off, rng) => {
    out[off] = (rng() * 2 - 1) * 6;
    out[off + 1] = (rng() * 2 - 1) * 6;
    out[off + 2] = (rng() * 2 - 1) * 6;
  },
  scale: 0.32,
  center: [0, 0, 0],
  pointSize: 0.016,
};

// Auto-build a slider spec spanning ±max(|v|,1) around each default — good enough for exploration.
function autoParams(defaults: Record<string, number>): ParamSpec[] {
  return Object.entries(defaults).map(([key, v]) => {
    const span = Math.max(Math.abs(v), 1);
    return { key, label: key, min: +(v - span).toFixed(4), max: +(v + span).toFixed(4), step: +(span / 100).toFixed(4), default: v };
  });
}

const mid = (r: [number, number]): number => (r[0] + r[1]) / 2;

interface FlowSpec {
  id: string;
  label: string;
  defaults: Record<string, number>;
  deriv: Derivative;
  init: number[];
  dt: number;
  bounds: { x: [number, number]; y: [number, number]; z: [number, number] };
  pointSize?: number;
  spread?: number;
}

// Concise builder: derives render scale/center from the attractor's bounds and seeds a tight
// cloud near a known on-attractor point.
function makeFlow(o: FlowSpec): AttractorSystem {
  const range = Math.max(o.bounds.x[1] - o.bounds.x[0], o.bounds.y[1] - o.bounds.y[0], o.bounds.z[1] - o.bounds.z[0]);
  const scale = 3 / range;
  const spread = o.spread ?? 0.6;
  return {
    id: o.id,
    label: o.label,
    dim: 3,
    dt: o.dt,
    defaults: o.defaults,
    paramSpec: autoParams(o.defaults),
    deriv: o.deriv,
    seedPoint: o.init,
    sampleInit: (out, off, rng) => {
      for (let k = 0; k < 3; k++) out[off + k] = o.init[k] + (rng() - 0.5) * spread;
    },
    scale,
    center: [mid(o.bounds.x), mid(o.bounds.y), mid(o.bounds.z)],
    pointSize: o.pointSize ?? 0.012,
  };
}

// 10 more attractor flows (equations + canonical params verified against the literature).
const NEW_FLOWS: AttractorSystem[] = [
  makeFlow({ id: 'halvorsen', label: 'Halvorsen', defaults: { a: 1.4 }, dt: 0.005, init: [-1.48, -1.51, 2.04], bounds: { x: [-9, 5], y: [-9, 5], z: [-9, 5] },
    deriv: (o, x, p) => { o[0] = -p.a * x[0] - 4 * x[1] - 4 * x[2] - x[1] * x[1]; o[1] = -p.a * x[1] - 4 * x[2] - 4 * x[0] - x[2] * x[2]; o[2] = -p.a * x[2] - 4 * x[0] - 4 * x[1] - x[0] * x[0]; } }),
  makeFlow({ id: 'chen', label: 'Chen', defaults: { a: 35, b: 3, c: 28 }, dt: 0.002, init: [-0.1, 0.5, -0.6], bounds: { x: [-30, 30], y: [-35, 35], z: [0, 60] },
    deriv: (o, x, p) => { o[0] = p.a * (x[1] - x[0]); o[1] = (p.c - p.a) * x[0] - x[0] * x[2] + p.c * x[1]; o[2] = x[0] * x[1] - p.b * x[2]; } }),
  makeFlow({ id: 'dadras', label: 'Dadras', defaults: { p: 3, o: 2.7, r: 1.7, c: 2, e: 9 }, dt: 0.008, init: [1.1, 2.1, -2], bounds: { x: [-25, 25], y: [-12, 12], z: [-15, 15] },
    deriv: (out, x, P) => { out[0] = x[1] - P.p * x[0] + P.o * x[1] * x[2]; out[1] = P.r * x[1] - x[0] * x[2] + x[2]; out[2] = P.c * x[0] * x[1] - P.e * x[2]; } }),
  makeFlow({ id: 'lorenz84', label: 'Lorenz-84', defaults: { a: 0.25, b: 4, F: 8, G: 1 }, dt: 0.01, init: [1, 1, 1], bounds: { x: [-1.5, 3], y: [-3, 3], z: [-3, 3] },
    deriv: (o, x, p) => { o[0] = -x[1] * x[1] - x[2] * x[2] - p.a * x[0] + p.a * p.F; o[1] = x[0] * x[1] - p.b * x[0] * x[2] - x[1] + p.G; o[2] = p.b * x[0] * x[1] + x[0] * x[2] - x[2]; } }),
  makeFlow({ id: 'rabinovich-fabrikant', label: 'Rabinovich–Fabrikant', defaults: { a: 1.1, g: 0.87 }, dt: 0.004, init: [-1, 0, 0.5], spread: 0.15, bounds: { x: [-2.5, 2.5], y: [-2.5, 2.5], z: [0, 1.5] },
    deriv: (o, x, p) => { o[0] = x[1] * (x[2] - 1 + x[0] * x[0]) + p.g * x[0]; o[1] = x[0] * (3 * x[2] + 1 - x[0] * x[0]) + p.g * x[1]; o[2] = -2 * x[2] * (p.a + x[0] * x[1]); } }),
  makeFlow({ id: 'sprott-linz-f', label: 'Sprott-Linz F', defaults: { a: 0.5 }, dt: 0.01, init: [0.1, 0, 0], bounds: { x: [-2.5, 3], y: [-3, 3], z: [0, 6] },
    deriv: (o, x, p) => { o[0] = x[1] + x[2]; o[1] = -x[0] + p.a * x[1]; o[2] = x[0] * x[0] - x[2]; } }),
  makeFlow({ id: 'wang-four-wing', label: 'Wang Four-Wing', defaults: { a: 0.2, b: -0.01, c: -0.4, d: -1 }, dt: 0.01, init: [1, 1, 1], bounds: { x: [-15, 15], y: [-15, 15], z: [-8, 30] },
    deriv: (o, x, p) => { o[0] = p.a * x[0] + x[1] * x[2]; o[1] = p.b * x[0] + p.c * x[1] - x[0] * x[2]; o[2] = -x[2] + p.d * x[0] * x[1]; } }),
  makeFlow({ id: 'bouali', label: 'Bouali', defaults: { a: 3, b: 2.2, c: 1, d: 0.001 }, dt: 0.01, init: [1, 0.1, 0.1], bounds: { x: [-3.5, 3.5], y: [-1, 2], z: [-3, 3] },
    deriv: (o, x, p) => { o[0] = p.a * x[0] * (1 - x[1]) - p.b * x[2]; o[1] = -p.c * x[1] * (1 - x[0] * x[0]); o[2] = p.d * x[0]; } }),
  makeFlow({ id: 'nose-hoover', label: 'Nosé–Hoover', defaults: { a: 1 }, dt: 0.01, init: [0, 5, 0], bounds: { x: [-4, 4], y: [-4, 4], z: [-4, 4] },
    deriv: (o, x, p) => { o[0] = x[1]; o[1] = -x[0] + x[1] * x[2]; o[2] = p.a - x[1] * x[1]; } }),
  makeFlow({ id: 'chua', label: 'Chua (cubic)', defaults: { alpha: 10, beta: 14.2857, c0: -1 / 6, c1: 1 / 16 }, dt: 0.01, init: [0.3, 0, 0], bounds: { x: [-3, 3], y: [-0.6, 0.6], z: [-4, 4] },
    deriv: (o, x, p) => { o[0] = p.alpha * (x[1] - x[0] - (p.c1 * x[0] * x[0] * x[0] + p.c0 * x[0])); o[1] = x[0] - x[1] + x[2]; o[2] = -p.beta * x[1]; } }),
  makeFlow({ id: 'lu', label: 'Lü', defaults: { a: 36, b: 3, c: 20 }, dt: 0.004, init: [-5.23, -5.47, 17.84], spread: 0.5, pointSize: 0.012, bounds: { x: [-23, 23], y: [-25, 25], z: [4, 40] },
    deriv: (o, x, p) => { o[0] = p.a * (x[1] - x[0]); o[1] = p.c * x[1] - x[0] * x[2]; o[2] = x[0] * x[1] - p.b * x[2]; } }),
  makeFlow({ id: 'chen-lee', label: 'Chen-Lee', defaults: { a: 5, b: -10, c: -0.38 }, dt: 0.004, init: [1, 1, 1], spread: 0.5, pointSize: 0.012, bounds: { x: [-15, 15], y: [-12.5, 12.5], z: [4, 14.5] },
    deriv: (o, x, p) => { o[0] = p.a * x[0] - x[1] * x[2]; o[1] = p.b * x[1] + x[0] * x[2]; o[2] = p.c * x[2] + (x[0] * x[1]) / 3; } }),
  makeFlow({ id: 'newton-leipnik', label: 'Newton–Leipnik', defaults: { a: 0.4, b: 0.175 }, dt: 0.01, init: [0.349, 0, -0.16], spread: 0.5, pointSize: 0.012, bounds: { x: [-0.85, 0.85], y: [-0.35, 0.35], z: [-0.12, 0.52] },
    deriv: (o, x, p) => { o[0] = -p.a * x[0] + x[1] + 10 * x[1] * x[2]; o[1] = -x[0] - 0.4 * x[1] + 5 * x[0] * x[2]; o[2] = p.b * x[2] - 5 * x[0] * x[1]; } }),
  makeFlow({ id: 'burke-shaw', label: 'Burke-Shaw', defaults: { s: 10, v: 4.272 }, dt: 0.005, init: [1, 0, 0], spread: 0.5, bounds: { x: [-1.75, 1.75], y: [-2.3, 2.3], z: [-1.95, 1.95] },
    deriv: (o, x, p) => { o[0] = -p.s * (x[0] + x[1]); o[1] = -x[1] - p.s * x[0] * x[2]; o[2] = p.s * x[0] * x[1] + p.v; } }),
  makeFlow({ id: 'rikitake', label: 'Rikitake Dynamo', defaults: { mu: 0.5, a: 5 }, dt: 0.01, init: [1, 0, 0], spread: 0.5, pointSize: 0.012, bounds: { x: [-6, 6], y: [-2.2, 2.2], z: [3.1, 7] },
    deriv: (o, x, p) => { o[0] = -p.mu * x[0] + x[2] * x[1]; o[1] = -p.mu * x[1] + (x[2] - p.a) * x[0]; o[2] = 1 - x[0] * x[1]; } }),
  makeFlow({ id: 'shimizu-morioka', label: 'Shimizu–Morioka', defaults: { a: 0.75, b: 0.45 }, dt: 0.01, init: [1.0228588902751727, -0.35319951514739695, 1.762580127299876], spread: 0.5, pointSize: 0.012, bounds: { x: [-1.45, 1.45], y: [-1.0, 1.0], z: [0, 2.3] },
    deriv: (o, x, p) => { o[0] = x[1]; o[1] = x[0] * (1 - x[2]) - p.a * x[1]; o[2] = -p.b * x[2] + x[0] * x[0]; } }),
  makeFlow({ id: 'rucklidge', label: 'Rucklidge', defaults: { k: 2, a: 6.7 }, dt: 0.01, init: [1, 0, 4.5], spread: 0.5, pointSize: 0.012, bounds: { x: [-10.5, 10.5], y: [-6, 6], z: [0, 15.5] },
    deriv: (o, x, p) => { o[0] = -p.k * x[0] + p.a * x[1] - x[1] * x[2]; o[1] = x[0]; o[2] = -x[2] + x[1] * x[1]; } }),
  makeFlow({ id: 'genesio-tesi', label: 'Genesio–Tesi', defaults: { a: 0.44, b: 1.1, c: 1.0 }, dt: 0.01, init: [0.2, 0, 0], spread: 0.3, pointSize: 0.012, bounds: { x: [-0.4916, 1.1918], y: [-0.6184, 0.9167], z: [-0.7572, 0.9078] },
    deriv: (o, x, p) => { o[0] = x[1]; o[1] = x[2]; o[2] = -p.c * x[0] - p.b * x[1] - p.a * x[2] + x[0] * x[0]; } }),
  makeFlow({ id: 'arneodo', label: 'Arneodo', defaults: { a: 5.5, b: 3.5 }, dt: 0.01, init: [2.564, -3.389, -6.501], spread: 0.5, pointSize: 0.012, bounds: { x: [-3.6, 3.6], y: [-6.1, 6.1], z: [-11.5, 11.5] },
    deriv: (o, x, p) => { o[0] = x[1]; o[1] = x[2]; o[2] = p.a * x[0] - p.b * x[1] - x[2] - x[0] * x[0] * x[0]; } }),
  makeFlow({ id: 'finance', label: 'Finance', defaults: { a: 0.001, b: 0.2, c: 1.1 }, dt: 0.02, init: [1.1232, 0.973, -0.5738], spread: 0.5, pointSize: 0.012, bounds: { x: [-3.1, 3.1], y: [-1.9, 3.1], z: [-1.55, 1.55] },
    deriv: (o, x, p) => { o[0] = x[2] + (x[1] - p.a) * x[0]; o[1] = 1 - p.b * x[1] - x[0] * x[0]; o[2] = -x[0] - p.c * x[2]; } }),
  makeFlow({ id: 'sprott-b', label: 'Sprott B', defaults: { s: 1 }, dt: 0.01, init: [0.5, 0.1, 0], spread: 0.5, pointSize: 0.012, bounds: { x: [-7.5, 7], y: [-4, 4], z: [-7.5, 7] },
    deriv: (o, x, p) => { o[0] = p.s * (x[1] * x[2]); o[1] = p.s * (x[0] - x[1]); o[2] = p.s * (1 - x[0] * x[1]); } }),
  makeFlow({ id: 'hindmarsh-rose', label: 'Hindmarsh–Rose', defaults: { a: 1, b: 3, c: 1, d: 5, s: 4, xr: -1.6, r: 0.006, I: 3.2 }, dt: 0.05, init: [-1.1, -5.1, 3.1], spread: 0.5, pointSize: 0.012, bounds: { x: [-1.4, 1.9], y: [-7.2, 0.8], z: [2.8, 3.4] },
    deriv: (o, x, p) => { o[0] = x[1] - p.a * x[0] * x[0] * x[0] + p.b * x[0] * x[0] - x[2] + p.I; o[1] = p.c - p.d * x[0] * x[0] - x[1]; o[2] = p.r * (p.s * (x[0] - p.xr) - x[2]); } }),
  makeFlow({ id: 'sakarya', label: 'Sakarya', defaults: { a: 0.4, b: 0.3 }, dt: 0.01, init: [3.22, 1.54, 4.31], spread: 0.5, pointSize: 0.012, bounds: { x: [-34, 36], y: [-19, 19], z: [-14, 18] },
    deriv: (o, x, p) => { o[0] = -x[0] + x[1] + x[1] * x[2]; o[1] = -x[0] - x[1] + p.a * x[0] * x[2]; o[2] = x[2] - p.b * x[0] * x[1]; } }),
];

export const SYSTEMS: Record<string, AttractorSystem> = {
  lorenz: LORENZ,
  rossler: ROSSLER,
  aizawa: AIZAWA,
  thomas: THOMAS,
  ...Object.fromEntries(NEW_FLOWS.map((s) => [s.id, s])),
};

class StrangeAttractorArchetype implements Archetype {
  readonly kind = 'flow' as const;
  readonly particleCount: number;
  readonly id: string;

  private readonly system: AttractorSystem;
  private readonly dim: number;
  private readonly state: Float64Array; // SoA-by-particle: [p0_x,p0_y,p0_z, p1_x, …]
  private readonly positions: Float32Array; // particleCount*3, render-space
  private readonly colors: Float32Array;

  constructor(system: AttractorSystem, config: ArchetypeConfig) {
    this.system = system;
    this.id = system.id;
    this.dim = system.dim;
    this.particleCount = config.particleCount;

    const n = this.particleCount;
    this.state = new Float64Array(n * this.dim);
    this.positions = new Float32Array(n * 3);
    this.colors = new Float32Array(n * 3);

    const rng = mulberry32(config.seed);
    for (let i = 0; i < n; i++) {
      system.sampleInit(this.state, i * this.dim, rng);
    }
    spectralGradient(n, this.colors);
    this.syncPositions();
  }

  step(dt: number, p: ResolvedParams): void {
    const { state, dim, system } = this;
    const n = this.particleCount;
    for (let i = 0; i < n; i++) {
      const off = i * dim;
      rk4Step(state, off, dim, system.deriv, p, dt);
    }
    this.syncPositions();
  }

  private syncPositions(): void {
    const { state, positions, dim, system } = this;
    const [cx, cy, cz] = system.center;
    const s = system.scale;
    const n = this.particleCount;
    for (let i = 0; i < n; i++) {
      const so = i * dim;
      const po = i * 3;
      // Guard against blow-ups (e.g. dt too large): re-seed a stuck particle to the seed point.
      const x = state[so];
      if (!Number.isFinite(x)) {
        state[so] = system.seedPoint[0];
        state[so + 1] = system.seedPoint[1];
        state[so + 2] = system.seedPoint[2];
      }
      positions[po] = (state[so] - cx) * s;
      positions[po + 1] = (state[so + 1] - cy) * s;
      positions[po + 2] = (state[so + 2] - cz) * s;
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
    return [
      {
        id: 'root',
        parentId: null,
        label: this.system.label,
        stateOffset: 0,
        stateLength: this.state.length,
        params: { ...this.system.defaults },
      },
    ];
  }

  renderHint(): RenderHint {
    return { geometry: 'points', pointSize: this.system.pointSize };
  }

  dispose(): void {
    /* buffers are GC'd with the instance; nothing external to release in the slice */
  }
}

export function makeAttractorFactory(system: AttractorSystem): ArchetypeFactory {
  return {
    id: system.id,
    label: system.label,
    category: 'Attractor',
    kind: 'flow',
    params: system.paramSpec,
    defaultParticleCount: 100_000,
    defaultDt: system.dt,
    create: (config) => new StrangeAttractorArchetype(system, config),
  };
}

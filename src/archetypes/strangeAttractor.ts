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

export const SYSTEMS: Record<string, AttractorSystem> = {
  lorenz: LORENZ,
  rossler: ROSSLER,
  aizawa: AIZAWA,
  thomas: THOMAS,
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
    kind: 'flow',
    params: system.paramSpec,
    defaultParticleCount: 100_000,
    create: (config) => new StrangeAttractorArchetype(system, config),
  };
}

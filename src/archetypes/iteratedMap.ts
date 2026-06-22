import type {
  Archetype,
  ArchetypeConfig,
  ArchetypeFactory,
  NodeSpec,
  ParamSpec,
  RenderHint,
  ResolvedParams,
} from '../core/archetype';
import { spectralGradient } from '../core/color';
import { mulberry32 } from '../state/rng';

// Iterated maps (the `kind:'map'` path): each particle is a point repeatedly pushed through a
// discrete map x_{n+1}=f(x_n). 100k particles seeded near the basin all settle onto the attractor,
// so the cloud always renders the famous map image; trails add the connecting filaments. 2D maps
// render in the z=0 plane; some (Pickover) are 3D. No dt — `defaultDt` only paces the accumulator.

// out and x are dim-length; iterate writes the next state into out (may read all of x first).
type MapFn = (out: Float64Array, x: Float64Array, p: ResolvedParams) => void;

export interface MapSystem {
  id: string;
  label: string;
  dim: number; // 2 or 3
  iterate: MapFn;
  defaults: Record<string, number>;
  paramSpec: ParamSpec[];
  init: number[];
  spread: number; // initial cloud radius around init (must stay inside the basin of attraction)
  scale: number;
  center: [number, number, number];
  pointSize: number;
  dt: number; // accumulator pacing only
}

function autoParams(defaults: Record<string, number>): ParamSpec[] {
  return Object.entries(defaults).map(([key, v]) => {
    const span = Math.max(Math.abs(v), 1);
    return { key, label: key, min: +(v - span).toFixed(4), max: +(v + span).toFixed(4), step: +(span / 100).toFixed(4), default: v };
  });
}

const mid = (r: [number, number]): number => (r[0] + r[1]) / 2;

interface MapSpec {
  id: string;
  label: string;
  dim?: number;
  iterate: MapFn;
  defaults: Record<string, number>;
  init: number[];
  bounds: { x: [number, number]; y: [number, number]; z?: [number, number] };
  spread?: number;
  pointSize?: number;
}

function makeMap(o: MapSpec): MapSystem {
  const dim = o.dim ?? 2;
  const zr = o.bounds.z ?? [0, 0];
  const range = Math.max(o.bounds.x[1] - o.bounds.x[0], o.bounds.y[1] - o.bounds.y[0], zr[1] - zr[0] || 0.0001);
  return {
    id: o.id,
    label: o.label,
    dim,
    iterate: o.iterate,
    defaults: o.defaults,
    paramSpec: autoParams(o.defaults),
    init: o.init,
    spread: o.spread ?? 0.1,
    scale: 3 / range,
    center: [mid(o.bounds.x), mid(o.bounds.y), o.bounds.z ? mid(o.bounds.z) : 0],
    pointSize: o.pointSize ?? 0.01,
    dt: 0.004,
  };
}

const sign = Math.sign;
const gm = (a: number, v: number): number => a * v + (2 * (1 - a) * v * v) / (1 + v * v); // Gumowski–Mira f(x)

export const MAP_SYSTEMS: Record<string, MapSystem> = Object.fromEntries(
  [
    makeMap({ id: 'clifford', label: 'Clifford', defaults: { a: -1.4, b: 1.7, c: 1, d: 0.7 }, init: [0.1, 0.1], bounds: { x: [-2.4, 2.4], y: [-2.4, 2.4] },
      iterate: (o, x, p) => { o[0] = Math.sin(p.a * x[1]) + p.c * Math.cos(p.a * x[0]); o[1] = Math.sin(p.b * x[0]) + p.d * Math.cos(p.b * x[1]); } }),
    makeMap({ id: 'de-jong', label: 'de Jong', defaults: { a: 1.4, b: -2.3, c: 2.4, d: -2.1 }, init: [0.1, 0.1], bounds: { x: [-2, 2], y: [-2, 2] },
      iterate: (o, x, p) => { o[0] = Math.sin(p.a * x[1]) - Math.cos(p.b * x[0]); o[1] = Math.sin(p.c * x[0]) - Math.cos(p.d * x[1]); } }),
    makeMap({ id: 'svensson', label: 'Svensson', defaults: { a: 1.4, b: 1.56, c: 1.4, d: -6.56 }, init: [0.1, 0.1], bounds: { x: [-7.6, 7.6], y: [-2.5, 2.5] },
      iterate: (o, x, p) => { o[0] = p.d * Math.sin(p.a * x[0]) - Math.sin(p.b * x[1]); o[1] = p.c * Math.cos(p.a * x[0]) + Math.cos(p.b * x[1]); } }),
    makeMap({ id: 'hopalong', label: 'Hopalong', defaults: { a: 0.4, b: 1, c: 0 }, init: [0, 0], spread: 0.5, bounds: { x: [-30, 30], y: [-30, 30] },
      iterate: (o, x, p) => { o[0] = x[1] - sign(x[0]) * Math.sqrt(Math.abs(p.b * x[0] - p.c)); o[1] = p.a - x[0]; } }),
    makeMap({ id: 'gumowski-mira', label: 'Gumowski–Mira', defaults: { a: -0.2, b: 1 }, init: [1, 1], spread: 0.3, bounds: { x: [-20, 20], y: [-20, 20] },
      iterate: (o, x, p) => { o[0] = p.b * x[1] + gm(p.a, x[0]); o[1] = -x[0] + gm(p.a, o[0]); } }),
    makeMap({ id: 'tinkerbell', label: 'Tinkerbell', defaults: { a: 0.9, b: -0.6013, c: 2, d: 0.5 }, init: [-0.72, -0.64], spread: 0.02, bounds: { x: [-1.4, 0.6], y: [-1.8, 0.4] },
      iterate: (o, x, p) => { o[0] = x[0] * x[0] - x[1] * x[1] + p.a * x[0] + p.b * x[1]; o[1] = 2 * x[0] * x[1] + p.c * x[0] + p.d * x[1]; } }),
    makeMap({ id: 'ikeda', label: 'Ikeda', defaults: { u: 0.918 }, init: [0.1, 0.1], spread: 0.3, bounds: { x: [-0.6, 2.1], y: [-2.6, 1] },
      iterate: (o, x, p) => { const t = 0.4 - 6.0 / (1 + x[0] * x[0] + x[1] * x[1]); o[0] = 1 + p.u * (x[0] * Math.cos(t) - x[1] * Math.sin(t)); o[1] = p.u * (x[0] * Math.sin(t) + x[1] * Math.cos(t)); } }),
    makeMap({ id: 'henon', label: 'Hénon', defaults: { a: 1.4, b: 0.3 }, init: [0.1, 0.1], spread: 0.05, bounds: { x: [-1.5, 1.5], y: [-0.45, 0.45] },
      iterate: (o, x, p) => { o[0] = 1 - p.a * x[0] * x[0] + x[1]; o[1] = p.b * x[0]; } }),
    makeMap({ id: 'bedhead', label: 'Bedhead', defaults: { a: 0.65343, b: 0.7345345 }, init: [1, 1], spread: 0.1, bounds: { x: [-1.2, 1.6], y: [-1, 2.4] },
      iterate: (o, x, p) => { o[0] = Math.sin((x[0] * x[1]) / p.b) * x[1] + Math.cos(p.a * x[0] - x[1]); o[1] = x[0] + Math.sin(x[1]) / p.b; } }),
    makeMap({ id: 'pickover', label: 'Pickover 3D', dim: 3, defaults: { a: 2.24, b: 0.43, c: -0.65, d: -2.43, e: 1 }, init: [0.1, 0.1, 0.1], spread: 0.2, bounds: { x: [-2.2, 2.2], y: [-2, 2], z: [-1, 1] },
      iterate: (o, x, p) => { o[0] = Math.sin(p.a * x[1]) - x[2] * Math.cos(p.b * x[0]); o[1] = x[2] * Math.sin(p.c * x[0]) - Math.cos(p.d * x[1]); o[2] = p.e * Math.sin(x[0]); } }),
  ].map((s) => [s.id, s]),
);

const MAXDIM = 3;
const _x = new Float64Array(MAXDIM);
const _out = new Float64Array(MAXDIM);

class IteratedMapArchetype implements Archetype {
  readonly kind = 'map' as const;
  readonly particleCount: number;
  readonly id: string;

  private readonly system: MapSystem;
  private readonly dim: number;
  private readonly state: Float64Array;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;

  constructor(system: MapSystem, config: ArchetypeConfig) {
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
      const off = i * this.dim;
      for (let k = 0; k < this.dim; k++) this.state[off + k] = system.init[k] + (rng() - 0.5) * system.spread;
    }
    spectralGradient(n, this.colors);
    this.syncPositions();
  }

  step(_dt: number, p: ResolvedParams): void {
    const { state, dim, system } = this;
    const n = this.particleCount;
    for (let i = 0; i < n; i++) {
      const off = i * dim;
      for (let k = 0; k < dim; k++) _x[k] = state[off + k];
      system.iterate(_out, _x, p);
      for (let k = 0; k < dim; k++) state[off + k] = _out[k];
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
      // Escapers (some maps have bounded basins) get reseeded to keep the cloud alive.
      if (!Number.isFinite(state[so]) || !Number.isFinite(state[so + 1])) {
        for (let k = 0; k < dim; k++) state[so + k] = system.init[k];
      }
      positions[po] = (state[so] - cx) * s;
      positions[po + 1] = (state[so + 1] - cy) * s;
      positions[po + 2] = dim > 2 ? (state[so + 2] - cz) * s : 0;
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
    return [{ id: 'root', parentId: null, label: this.system.label, stateOffset: 0, stateLength: this.state.length, params: { ...this.system.defaults } }];
  }

  renderHint(): RenderHint {
    return { geometry: 'points', pointSize: this.system.pointSize };
  }

  dispose(): void {
    /* buffers GC with the instance */
  }
}

export function makeMapFactory(system: MapSystem): ArchetypeFactory {
  return {
    id: system.id,
    label: system.label,
    category: 'Map',
    kind: 'map',
    params: system.paramSpec,
    defaultParticleCount: 100_000,
    defaultDt: system.dt,
    create: (config) => new IteratedMapArchetype(system, config),
  };
}

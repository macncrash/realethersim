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

// Parametric geometry: a formula maps an index (or a (u,v) grid cell) to a 3D point, sampled into a
// glowing point cloud. Covers Fibonacci/phyllotaxis sequences and classic parametric surfaces
// (torus, Klein bottle, Möbius, seashell, superformula). Static between parameter changes — step()
// recomputes only when a slider moves — so dragging a shape knob reshapes it live, no rebuild.
const TAU = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5)); // golden angle ≈ 2.39996 rad

// Normalized (u,v) ∈ [0,1]² for grid-sampled surfaces (W×W from the particle count).
function uv(i: number, n: number): [number, number] {
  const W = Math.max(2, Math.round(Math.sqrt(n)));
  return [(i % W) / (W - 1), Math.floor(i / W) / (W - 1)];
}

// 1-D superformula radius (Gielis): r(φ) = (|cos(mφ/4)/a|^n2 + |sin(mφ/4)/b|^n3)^(-1/n1)
function superR(angle: number, m: number, n1: number, n2: number, n3: number): number {
  const t = (m * angle) / 4;
  const a = Math.pow(Math.abs(Math.cos(t)), n2);
  const b = Math.pow(Math.abs(Math.sin(t)), n3);
  const s = a + b;
  if (s < 1e-6) return 0;
  return Math.min(Math.pow(s, -1 / Math.max(n1, 1e-3)), 4);
}

export interface ParamSurface {
  id: string;
  label: string;
  defaultParticleCount: number;
  scale: number;
  pointSize: number;
  params: ParamSpec[];
  position: (i: number, n: number, p: ResolvedParams, out: Float32Array, o: number) => void;
}

export const PARAMETRIC_SYSTEMS: Record<string, ParamSurface> = {
  fibonacci: {
    id: 'fibonacci', label: 'Fibonacci Sphere', defaultParticleCount: 120_000, scale: 1.45, pointSize: 0.01,
    params: [
      { key: 'twist', label: 'twist', min: 0, max: 4, step: 0.01, default: 1 },
      { key: 'squash', label: 'squash', min: 0.3, max: 1.6, step: 0.01, default: 1 },
    ],
    position: (i, n, p, out, o) => {
      const y = 1 - (2 * (i + 0.5)) / n; // -1 → 1
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = i * GOLDEN * p.twist;
      out[o] = r * Math.cos(th);
      out[o + 1] = y * p.squash;
      out[o + 2] = r * Math.sin(th);
    },
  },
  torus: {
    id: 'torus', label: 'Torus', defaultParticleCount: 160_000, scale: 0.55, pointSize: 0.008,
    params: [
      { key: 'R', label: 'R (ring)', min: 1, max: 3, step: 0.01, default: 2 },
      { key: 'r', label: 'r (tube)', min: 0.2, max: 1.4, step: 0.01, default: 0.8 },
    ],
    position: (i, n, p, out, o) => {
      const [a, b] = uv(i, n);
      const u = a * TAU;
      const v = b * TAU;
      const w = p.R + p.r * Math.cos(v);
      out[o] = w * Math.cos(u);
      out[o + 1] = p.r * Math.sin(v);
      out[o + 2] = w * Math.sin(u);
    },
  },
  klein: {
    id: 'klein', label: 'Klein Bottle', defaultParticleCount: 200_000, scale: 0.42, pointSize: 0.008,
    params: [{ key: 'size', label: 'size', min: 1.5, max: 4, step: 0.01, default: 3 }],
    position: (i, n, p, out, o) => {
      const [a, b] = uv(i, n);
      const u = a * TAU;
      const v = b * TAU;
      const c2 = Math.cos(u / 2);
      const s2 = Math.sin(u / 2);
      const sv = Math.sin(v);
      const s2v = Math.sin(2 * v);
      const w = p.size + c2 * sv - s2 * s2v; // figure-8 immersion
      out[o] = w * Math.cos(u);
      out[o + 1] = s2 * sv + c2 * s2v;
      out[o + 2] = w * Math.sin(u);
    },
  },
  mobius: {
    id: 'mobius', label: 'Möbius Strip', defaultParticleCount: 120_000, scale: 1.0, pointSize: 0.008,
    params: [
      { key: 'width', label: 'width', min: 0.2, max: 1.6, step: 0.01, default: 0.9 },
      { key: 'twists', label: 'half-twists', min: 1, max: 6, step: 1, default: 1 },
    ],
    position: (i, n, p, out, o) => {
      const [a, b] = uv(i, n);
      const u = a * TAU;
      const v = (b * 2 - 1) * p.width; // [-width, width]
      const h = (p.twists * u) / 2;
      const rad = 1.6 + v * 0.5 * Math.cos(h);
      out[o] = rad * Math.cos(u);
      out[o + 1] = v * 0.5 * Math.sin(h);
      out[o + 2] = rad * Math.sin(u);
    },
  },
  seashell: {
    id: 'seashell', label: 'Seashell', defaultParticleCount: 200_000, scale: 0.5, pointSize: 0.008,
    params: [
      { key: 'turns', label: 'turns', min: 2, max: 8, step: 0.1, default: 5 },
      { key: 'taper', label: 'taper', min: 0.4, max: 1.6, step: 0.01, default: 1 },
    ],
    position: (i, n, p, out, o) => {
      const [a, b] = uv(i, n);
      const u = a * Math.PI * p.turns; // along the spiral
      const v = b * TAU; // around the tube
      const e = Math.exp(u / (p.turns * Math.PI));
      const cs = Math.cos(v / 2) ** 2;
      // logarithmic-spiral shell (z = up)
      out[o] = 2 * (1 - e) * Math.cos(u) * cs;
      out[o + 1] = (1 - Math.exp((2 * u) / (p.turns * Math.PI)) - Math.sin(v) + e * Math.sin(v)) * p.taper;
      out[o + 2] = 2 * (e - 1) * Math.sin(u) * cs;
    },
  },
  superformula: {
    id: 'superformula', label: 'Superformula', defaultParticleCount: 200_000, scale: 1.15, pointSize: 0.008,
    params: [
      { key: 'm', label: 'symmetry m', min: 1, max: 14, step: 1, default: 7 },
      { key: 'n1', label: 'n₁', min: 0.1, max: 4, step: 0.01, default: 0.3 },
      { key: 'n2', label: 'n₂', min: 0.1, max: 4, step: 0.01, default: 1.7 },
      { key: 'n3', label: 'n₃', min: 0.1, max: 4, step: 0.01, default: 1.7 },
    ],
    position: (i, n, p, out, o) => {
      const [a, b] = uv(i, n);
      const phi = a * TAU - Math.PI; // [-π, π]
      const theta = b * Math.PI - Math.PI / 2; // [-π/2, π/2]
      const r1 = superR(phi, p.m, p.n1, p.n2, p.n3);
      const r2 = superR(theta, p.m, p.n1, p.n2, p.n3);
      const ct = r2 * Math.cos(theta);
      out[o] = r1 * Math.cos(phi) * ct;
      out[o + 1] = r2 * Math.sin(theta);
      out[o + 2] = r1 * Math.sin(phi) * ct;
    },
  },
};

class ParametricArchetype implements Archetype {
  readonly kind = 'flow' as const;
  readonly id: string;
  readonly particleCount: number;

  private readonly sys: ParamSurface;
  private readonly scale: number;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly state = new Float64Array(1); // no dynamic state; deterministic from params
  private last = '';

  constructor(sys: ParamSurface, config: ArchetypeConfig) {
    this.sys = sys;
    this.id = sys.id;
    this.particleCount = config.particleCount;
    this.scale = sys.scale;
    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    spectralGradient(this.particleCount, this.colors);
    this.rebuild(config.params);
  }

  private rebuild(p: ResolvedParams): void {
    const n = this.particleCount;
    const s = this.scale;
    const pos = this.positions;
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      this.sys.position(i, n, p, pos, o);
      pos[o] *= s;
      pos[o + 1] *= s;
      pos[o + 2] *= s;
    }
    this.last = this.sys.params.map((ps) => p[ps.key]).join(',');
  }

  step(_dt: number, p: ResolvedParams): void {
    // recompute only when a shape parameter actually changed (live, no full rebuild)
    const key = this.sys.params.map((ps) => p[ps.key]).join(',');
    if (key !== this.last) this.rebuild(p);
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
  loadState(): void {
    /* deterministic from params — nothing to restore */
  }
  getHierarchy(): NodeSpec[] {
    return [{ id: 'root', parentId: null, label: this.sys.label, stateOffset: 0, stateLength: 0 }];
  }
  renderHint(): RenderHint {
    return { geometry: 'points', pointSize: this.sys.pointSize };
  }
  dispose(): void {
    /* buffers GC with the instance */
  }
}

export function makeParametricFactory(sys: ParamSurface): ArchetypeFactory {
  return {
    id: sys.id,
    label: sys.label,
    category: 'Parametric',
    kind: 'flow',
    params: sys.params,
    defaultParticleCount: sys.defaultParticleCount,
    particleCountOptions: [40_000, 120_000, 200_000, 360_000],
    defaultDt: 0.016,
    defaultTrail: 0, // static surfaces — trails are meaningless and 200k×160 tanks fps
    create: (config) => new ParametricArchetype(sys, config),
  };
}

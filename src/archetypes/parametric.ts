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

// Sweep a circular tube of radius `rad` along a space curve. C(t) is the centreline, dC(t) its
// tangent. Index i is split into (around-the-tube, along-the-curve); a fixed up-vector frame avoids
// the cost of parallel transport (a closed knot tolerates the mild twist this introduces).
function sweepTube(
  i: number,
  n: number,
  rad: number,
  out: Float32Array,
  o: number,
  C: (t: number) => [number, number, number],
  dC: (t: number) => [number, number, number],
): void {
  const around = 24;
  const alongCount = Math.max(1, Math.floor(n / around));
  const ai = i % around;
  const t = (Math.floor(i / around) / alongCount) * TAU;
  const v = (ai / around) * TAU;
  const c = C(t);
  const d = dC(t);
  let tx = d[0], ty = d[1], tz = d[2];
  const tl = Math.hypot(tx, ty, tz) || 1;
  tx /= tl; ty /= tl; tz /= tl;
  // N = normalize(up × T); swap up away from T to keep the cross product well-conditioned
  let ux = 0, uy = 1, uz = 0;
  if (Math.abs(ty) > 0.9) { ux = 1; uy = 0; uz = 0; }
  let nx = uy * tz - uz * ty, ny = uz * tx - ux * tz, nz = ux * ty - uy * tx;
  const nl = Math.hypot(nx, ny, nz) || 1;
  nx /= nl; ny /= nl; nz /= nl;
  const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx; // B = T × N
  const cv = Math.cos(v), sv = Math.sin(v);
  out[o] = c[0] + rad * (cv * nx + sv * bx);
  out[o + 1] = c[1] + rad * (cv * ny + sv * by);
  out[o + 2] = c[2] + rad * (cv * nz + sv * bz);
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
  sunflower: {
    id: 'sunflower', label: 'Sunflower', defaultParticleCount: 120_000, scale: 1.5, pointSize: 0.01,
    params: [
      { key: 'dome', label: 'dome', min: 0, max: 1.5, step: 0.01, default: 0.5 },
      { key: 'spread', label: 'spread', min: 0.6, max: 1.6, step: 0.01, default: 1 },
    ],
    // Vogel's model — the flat phyllotaxis seed head (golden-angle spiral), gently domed into 3D.
    position: (i, n, p, out, o) => {
      const r = Math.sqrt((i + 0.5) / n); // equal-area radius
      const th = i * GOLDEN;
      const rr = r * p.spread;
      out[o] = rr * Math.cos(th);
      out[o + 1] = p.dome * (1 - r * r) - 0.2; // gentle central dome
      out[o + 2] = rr * Math.sin(th);
    },
  },
  torusknot: {
    id: 'torusknot', label: 'Torus Knot', defaultParticleCount: 144_000, scale: 0.5, pointSize: 0.007,
    params: [
      { key: 'p', label: 'p (longit.)', min: 1, max: 9, step: 1, default: 2 },
      { key: 'q', label: 'q (merid.)', min: 1, max: 9, step: 1, default: 3 },
      { key: 'tube', label: 'thickness', min: 0.05, max: 0.6, step: 0.01, default: 0.28 },
    ],
    // (p,q) torus knot swept into a solid tube — p=2,q=3 is the trefoil. coprime p,q ⇒ a true knot.
    position: (i, n, pp, out, o) => {
      sweepTube(i, n, pp.tube, out, o, (t) => {
        const w = 2 + Math.cos(pp.q * t);
        return [w * Math.cos(pp.p * t), -Math.sin(pp.q * t), w * Math.sin(pp.p * t)];
      }, (t) => {
        const cqt = Math.cos(pp.q * t), sqt = Math.sin(pp.q * t);
        const cpt = Math.cos(pp.p * t), spt = Math.sin(pp.p * t);
        const w = 2 + cqt;
        return [
          -pp.q * sqt * cpt - pp.p * w * spt,
          -pp.q * cqt,
          -pp.q * sqt * spt + pp.p * w * cpt,
        ];
      });
    },
  },
  lissajous: {
    id: 'lissajous', label: 'Lissajous Curve', defaultParticleCount: 120_000, scale: 1.5, pointSize: 0.006,
    params: [
      { key: 'a', label: 'a', min: 1, max: 8, step: 1, default: 3 },
      { key: 'b', label: 'b', min: 1, max: 8, step: 1, default: 2 },
      { key: 'c', label: 'c', min: 1, max: 8, step: 1, default: 4 },
      { key: 'phase', label: 'phase', min: 0, max: Math.PI, step: 0.01, default: Math.PI / 2 },
      { key: 'tube', label: 'thickness', min: 0.02, max: 0.2, step: 0.005, default: 0.07 },
    ],
    // 3D Lissajous: three sinusoids at integer frequencies — the higher-dimensional cousin of the
    // oscilloscope figures. Closes into a knot when a:b:c are coprime. Swept into a solid tube.
    position: (i, n, p, out, o) => {
      sweepTube(
        i, n, p.tube, out, o,
        (t) => [Math.sin(p.a * t + p.phase), Math.sin(p.b * t), Math.sin(p.c * t)],
        (t) => [p.a * Math.cos(p.a * t + p.phase), p.b * Math.cos(p.b * t), p.c * Math.cos(p.c * t)],
      );
    },
  },
  dini: {
    id: 'dini', label: "Dini's Surface", defaultParticleCount: 160_000, scale: 0.42, pointSize: 0.008,
    params: [
      { key: 'twist', label: 'twist', min: 0.05, max: 1.2, step: 0.01, default: 0.3 },
      { key: 'turns', label: 'turns', min: 1, max: 5, step: 0.1, default: 2.5 },
    ],
    // The twisted pseudosphere — a surface of constant negative curvature spiralling up an axis.
    position: (i, n, p, out, o) => {
      const [a, b] = uv(i, n);
      const u = a * p.turns * TAU;
      const v = 0.12 + b * (1.45 - 0.12); // (0.12, 1.45) keeps ln(tan(v/2)) finite
      const sv = Math.sin(v);
      out[o] = Math.cos(u) * sv;
      out[o + 1] = Math.cos(v) + Math.log(Math.tan(v / 2)) + p.twist * u - 1; // up (centred funnel)
      out[o + 2] = Math.sin(u) * sv;
    },
  },
  harmonic: {
    id: 'harmonic', label: 'Harmonic Sphere', defaultParticleCount: 160_000, scale: 1.3, pointSize: 0.008,
    params: [
      { key: 'lobesU', label: 'lobes φ', min: 1, max: 10, step: 1, default: 4 },
      { key: 'lobesV', label: 'lobes θ', min: 1, max: 10, step: 1, default: 5 },
      { key: 'amp', label: 'amplitude', min: 0, max: 0.7, step: 0.01, default: 0.35 },
    ],
    // A sphere whose radius is modulated by a product of sinusoids — the look of a spherical-harmonic
    // mode: petals, sea-urchins, bumpy planets.
    position: (i, n, p, out, o) => {
      const [a, b] = uv(i, n);
      const phi = a * TAU;
      const theta = b * Math.PI;
      const st = Math.sin(theta);
      const r = 1 + p.amp * Math.sin(p.lobesU * phi) * Math.sin(p.lobesV * theta);
      out[o] = r * st * Math.cos(phi);
      out[o + 1] = r * Math.cos(theta);
      out[o + 2] = r * st * Math.sin(phi);
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

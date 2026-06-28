import type {
  Archetype,
  ArchetypeConfig,
  ArchetypeFactory,
  NodeSpec,
  ParamSpec,
  RenderHint,
  ResolvedParams,
} from '../core/archetype';

// Circular Chladni plate / vibrating drumhead. The standing waves of a circular membrane fixed at its
// rim are the Bessel eigenmodes uₘₙ(r,θ) = Jₘ(λₘₙ·r)·cos(mθ), where λₘₙ is the n-th positive zero of the
// Bessel function Jₘ (so the rim r=1 is a node, Jₘ(λₘₙ)=0). The nodal set — where the membrane stands
// still and the "sand" collects — is m straight diameters (cos mθ = 0) plus n concentric circles (the
// interior zeros of Jₘ). Sampled as a sunflower (phyllotaxis) disk of points displaced by y = u·cos(ωt)
// (the mode breathing in time) and coloured ONCE by |u| so the nodal figure (dark) is always visible.
// Bessel is evaluated only on a mode change; per frame is just a cheap cos(ωt) scale. Bounded ∀t.
const TAU = Math.PI * 2;
const SCALE = 2.5; // disk radius in render units

// --- Bessel Jₙ(x) — Abramowitz & Stegun rational/asymptotic J0,J1 (err < 1e-7, stable ∀x) + recurrence ---
function besselJ0(x: number): number {
  const ax = Math.abs(x);
  if (ax < 8) {
    const y = x * x;
    const p1 = 57568490574 + y * (-13362590354 + y * (651619640.7 + y * (-11214424.18 + y * (77392.33017 + y * -184.9052456))));
    const p2 = 57568490411 + y * (1029532985 + y * (9494680.718 + y * (59272.64853 + y * (267.8532712 + y))));
    return p1 / p2;
  }
  const z = 8 / ax;
  const y = z * z;
  const xx = ax - 0.785398164;
  const p1 = 1 + y * (-0.1098628627e-2 + y * (0.2734510407e-4 + y * (-0.2073370639e-5 + y * 0.2093887211e-6)));
  const p2 = -0.1562499995e-1 + y * (0.1430488765e-3 + y * (-0.6911147651e-5 + y * (0.7621095161e-6 + y * -0.934935152e-7)));
  return Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * p1 - z * Math.sin(xx) * p2);
}
function besselJ1(x: number): number {
  const ax = Math.abs(x);
  let ans: number;
  if (ax < 8) {
    const y = x * x;
    const p1 = x * (72362614232 + y * (-7895059235 + y * (242396853.1 + y * (-2972611.439 + y * (15704.4826 + y * -30.16036606)))));
    const p2 = 144725228442 + y * (2300535178 + y * (18583304.74 + y * (99447.43394 + y * (376.9991397 + y))));
    ans = p1 / p2;
  } else {
    const z = 8 / ax;
    const y = z * z;
    const xx = ax - 2.356194491;
    const p1 = 1 + y * (0.183105e-2 + y * (-0.3516396496e-4 + y * (0.2457520174e-5 + y * -0.240337019e-6)));
    const p2 = 0.04687499995 + y * (-0.2002690873e-3 + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)));
    ans = Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * p1 - z * Math.sin(xx) * p2);
    if (x < 0) ans = -ans;
  }
  return ans;
}
// Jₙ(x) via the Numerical-Recipes `bessj` scheme: stable upward recurrence for x>n, Miller's downward
// recurrence (with renormalisation) for x≤n.
function besselJn(n: number, x: number): number {
  if (n === 0) return besselJ0(x);
  if (n === 1) return besselJ1(x);
  const ax = Math.abs(x);
  if (ax === 0) return 0;
  let ans: number;
  if (ax > n) {
    const tox = 2 / ax;
    let bjm = besselJ0(ax);
    let bj = besselJ1(ax);
    for (let j = 1; j < n; j++) {
      const bjp = j * tox * bj - bjm;
      bjm = bj;
      bj = bjp;
    }
    ans = bj;
  } else {
    const tox = 2 / ax;
    const m = 2 * Math.floor((n + Math.floor(Math.sqrt(40 * n))) / 2);
    let jsum = 0;
    let bjp = 0;
    let bj = 1;
    let sum = 0;
    let bjn = 0;
    for (let j = m; j > 0; j--) {
      const bjm = j * tox * bj - bjp;
      bjp = bj;
      bj = bjm;
      if (Math.abs(bj) > 1e10) {
        bj *= 1e-10;
        bjp *= 1e-10;
        bjn *= 1e-10;
        sum *= 1e-10;
      }
      if (jsum) sum += bj;
      jsum = jsum ? 0 : 1;
      if (j === n) bjn = bjp;
    }
    sum = 2 * sum - bj; // normalisation: Σ even-order = J0 + 2(J2+J4+…) = 1
    ans = bjn / sum;
  }
  return x < 0 && (n & 1) ? -ans : ans;
}
// The k-th positive zero of Jₘ (k ≥ 1): McMahon asymptotic guess, refined by Newton (Jₘ' from neighbours).
function besselJzero(m: number, k: number): number {
  const b = (k + m / 2 - 0.25) * Math.PI;
  let x = b - (4 * m * m - 1) / (8 * b);
  for (let it = 0; it < 10; it++) {
    const j = besselJn(m, x);
    const jp = m === 0 ? -besselJn(1, x) : 0.5 * (besselJn(m - 1, x) - besselJn(m + 1, x));
    if (jp === 0) break;
    const dx = j / jp;
    x -= dx;
    if (Math.abs(dx) < 1e-12) break;
  }
  return x;
}

const PARAM_SPEC: ParamSpec[] = [
  { key: 'circles', label: 'radial nodes n', min: 0, max: 8, step: 1, default: 3, rebuild: true }, // concentric nodal circles
  { key: 'diameters', label: 'angular nodes m', min: 0, max: 7, step: 1, default: 5, rebuild: true }, // nodal diameters
  { key: 'relief', label: 'relief', min: 0, max: 1.5, step: 0.02, default: 0.7 },
  { key: 'speed', label: 'frequency', min: 0, max: 4, step: 0.05, default: 1.6 },
];

class DrumheadArchetype implements Archetype {
  readonly id = 'drumhead';
  readonly kind = 'flow' as const;
  readonly particleCount: number;
  private readonly px: Float64Array; // fixed disk x (render units)
  private readonly pz: Float64Array; // fixed disk z
  private readonly u0: Float64Array; // eigenmode amplitude at each point (full amplitude)
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private relief = 0.7;
  private speed = 1.6;
  private t = 0;
  private modeKey = '';

  constructor(config: ArchetypeConfig) {
    const n = config.particleCount;
    this.particleCount = n;
    this.px = new Float64Array(n);
    this.pz = new Float64Array(n);
    this.u0 = new Float64Array(n);
    this.positions = new Float32Array(n * 3);
    this.colors = new Float32Array(n * 3);
    this.rebuild(config.params);
  }

  // Recompute the eigenmode + colours (only on a mode change — Bessel is evaluated here, not per frame).
  private rebuild(p: ResolvedParams): void {
    const nCircles = Math.round(p.circles ?? 3);
    const m = Math.round(p.diameters ?? 5);
    this.modeKey = `${nCircles},${m}`;
    const lambda = besselJzero(m, nCircles + 1); // (nCircles+1)-th zero ⇒ nCircles interior nodal rings
    const n = this.particleCount;
    let umax = 1e-6;
    // Area-uniform POLAR grid (rings × spokes, spokes ∝ circumference) — aligned with the nodal
    // structure so the m diameters and n circles read as crisp curves (a phyllotaxis spiral smears them).
    const rings = Math.max(14, Math.round(Math.sqrt(n / Math.PI)));
    let i = 0;
    for (let j = 0; j < rings && i < n; j++) {
      const rr = (j + 0.5) / rings; // radius fraction in (0,1)
      const spokes = Math.max(3, Math.round(TAU * (j + 0.5)));
      for (let k = 0; k < spokes && i < n; k++, i++) {
        const th = (k / spokes) * TAU;
        this.px[i] = rr * Math.cos(th) * SCALE;
        this.pz[i] = rr * Math.sin(th) * SCALE;
        const u = besselJn(m, lambda * rr) * Math.cos(m * th);
        this.u0[i] = u;
        const a = Math.abs(u);
        if (a > umax) umax = a;
      }
    }
    for (; i < n; i++) {
      this.px[i] = 0; // any leftover points sit at the centre (J_m(0)=0 for m>0 → a node, stays dark)
      this.pz[i] = 0;
      this.u0[i] = besselJn(m, 0);
    }
    // colour once by normalised |u|: the antinode lobes glow gold, the nodal lines (m diameters + n
    // circles) stay dark — so the mode's structure reads as a luminous rippled membrane.
    const col = this.colors;
    for (let i = 0; i < n; i++) {
      const a = Math.min(1, (Math.abs(this.u0[i]) / umax) * 1.35);
      col[i * 3] = 0.06 + 0.94 * a; // warm gold ramp
      col[i * 3 + 1] = 0.05 + 0.62 * a;
      col[i * 3 + 2] = 0.02 + 0.16 * a;
    }
    this.syncPositions();
  }

  private syncPositions(): void {
    const osc = Math.cos(this.speed * this.t) * this.relief;
    const pos = this.positions;
    for (let i = 0; i < this.particleCount; i++) {
      const o = i * 3;
      pos[o] = this.px[i];
      pos[o + 1] = this.u0[i] * osc; // membrane height, breathing in time
      pos[o + 2] = this.pz[i];
    }
  }

  step(dt: number, p: ResolvedParams): void {
    const nextKey = `${Math.round(p.circles ?? 3)},${Math.round(p.diameters ?? 5)}`;
    if (nextKey !== this.modeKey) {
      this.modeKey = nextKey;
      this.relief = p.relief ?? 0.7;
      this.speed = p.speed ?? 1.6;
      this.rebuild(p);
      return;
    }
    this.relief = p.relief ?? 0.7;
    this.speed = p.speed ?? 1.6;
    this.t += dt;
    this.syncPositions();
  }

  readPositions(): Float32Array {
    return this.positions;
  }
  readColors(): Float32Array {
    return this.colors;
  }
  readState(): Float64Array {
    return new Float64Array([this.t]);
  }
  loadState(s: Float64Array): void {
    this.t = s[0] ?? 0;
    this.syncPositions();
  }
  getHierarchy(): NodeSpec[] {
    return [{ id: 'root', parentId: null, label: 'Drumhead mode', stateOffset: 0, stateLength: 1 }];
  }
  renderHint(): RenderHint {
    return { geometry: 'points', pointSize: 0.01 };
  }
  dispose(): void {
    /* buffers GC with the instance */
  }
}

export const drumheadFactory: ArchetypeFactory = {
  id: 'drumhead',
  label: 'Circular Chladni Plate',
  category: 'Field',
  kind: 'flow',
  params: PARAM_SPEC,
  defaultParticleCount: 60_000,
  particleCountOptions: [20_000, 60_000, 120_000],
  defaultDt: 0.016,
  defaultTrail: 0, // the membrane surface IS the visual
  create: (config) => new DrumheadArchetype(config),
};

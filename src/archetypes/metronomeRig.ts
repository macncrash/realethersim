// The mechanics behind Huygens' Metronomes (metronomes.ts): N metronome pendulums standing on one
// platform that can roll, slide and/or turn. Nothing connects the metronomes but the platform. Each
// swing pushes the platform a little, and the platform's motion pushes every pendulum back. Following
// Pantaleone (2002), each metronome is a physical pendulum with a van der Pol escapement; here the
// platform has three degrees of freedom (x, y, and a turn φ about its centre) instead of one.
//
//   pendulum i:  θ̈ᵢ = −ωᵢ² sin θᵢ − ε((θᵢ/θ₀)² − 1) θ̇ᵢ − β cos θᵢ (eᵢ · q̈)
//   platform:    G q̈ = −γ D q̇ − m r Σ (θ̈ᵢ cos θᵢ − θ̇ᵢ² sin θᵢ) eᵢ
//
// q = (X, Y, φ), D = diag(M, M, J), and eᵢ = (uₓ, u_y, p × u) is how metronome i's swing direction u
// (in the platform's plane, at position p) pulls on each degree of freedom. β = m r / I = ω²/g for a
// physical pendulum. Substituting θ̈ᵢ makes the platform equation a 3 × 3 linear system,
// (D − m r β Σ cos²θᵢ eᵢ eᵢᵀ) q̈ = rhs, which is solved exactly at every RK4 stage. Platform rotation
// is small, so its geometry is linearised; the pendulum angles are not.

export const G = 9.81;
export const SPACING = 0.12; // m between metronomes on the platform
export const METRO_MASS = 0.15; // kg, a whole metronome (case + pendulum)
export const MR = 2e-3; // kg·m, the pendulum's first moment m·r about its pivot
export const THETA0 = 0.35; // rad: the escapement holds the swing near 2θ₀ ≈ 40°

export const enum Freedom { Roll = 0, Slide = 1, Spin = 2, SlideSpin = 3 }
export const enum Headings { Aligned = 0, Crossed = 1, Random = 2 }

export interface RigParams {
  bpm: number; // base tempo, ticks per minute (two ticks per swing period)
  spread: number; // tempo spread, percent (standard deviation)
  platformMass: number; // platform mass ÷ total metronome mass
  friction: number; // platform friction rate, 1/s
  drive: number; // escapement strength ε, 1/s
  freedom: number;
}

export class MetronomeRig {
  readonly n: number;
  readonly cols: number;
  readonly rows: number;
  readonly px: Float64Array; readonly py: Float64Array; // positions on the platform, m, centred
  readonly ux: Float64Array; readonly uy: Float64Array; // swing directions, platform frame
  readonly detune: Float64Array; // standard-normal tempo offsets (scaled by the spread knob)
  readonly s: Float64Array; // θ₀…θₙ₋₁, θ̇₀…, then X, Y, φ, Ẋ, Ẏ, φ̇
  readonly omega: Float64Array;
  private readonly k1: Float64Array; private readonly k2: Float64Array; private readonly k3: Float64Array; private readonly k4: Float64Array; private readonly tmp: Float64Array;
  private readonly f: Float64Array; private readonly cs: Float64Array;
  p: RigParams;
  mTot = 0; J = 0; beta = 0; t = 0;
  private plateMass = 0; private plateJ0 = 0; private metroJ = 0;

  constructor(n: number, headings: number, rng: () => number, p: RigParams) {
    this.n = n;
    this.cols = Math.ceil(Math.sqrt(n)); this.rows = Math.ceil(n / this.cols);
    this.px = new Float64Array(n); this.py = new Float64Array(n); this.ux = new Float64Array(n); this.uy = new Float64Array(n);
    this.detune = new Float64Array(n); this.omega = new Float64Array(n);
    this.s = new Float64Array(2 * n + 6);
    const L = 2 * n + 6;
    this.k1 = new Float64Array(L); this.k2 = new Float64Array(L); this.k3 = new Float64Array(L); this.k4 = new Float64Array(L); this.tmp = new Float64Array(L);
    this.f = new Float64Array(n); this.cs = new Float64Array(n);
    const gauss = () => { const u = Math.max(rng(), 1e-12), v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    for (let i = 0; i < n; i++) {
      const c = i % this.cols, r = Math.floor(i / this.cols);
      this.px[i] = (c - (this.cols - 1) / 2) * SPACING; this.py[i] = (r - (this.rows - 1) / 2) * SPACING;
      const a = headings === Headings.Random ? rng() * 2 * Math.PI : headings === Headings.Crossed && (c + r) % 2 ? Math.PI / 2 : 0;
      this.ux[i] = Math.cos(a); this.uy[i] = Math.sin(a);
      this.detune[i] = gauss();
      this.metroJ += METRO_MASS * (this.px[i] ** 2 + this.py[i] ** 2);
    }
    this.p = p; this.setParams(p);
    const w0 = (2 * Math.PI * p.bpm) / 120;
    for (let i = 0; i < n; i++) { // released at random phases, on the limit cycle
      const ph = rng() * 2 * Math.PI, A = 2 * THETA0;
      this.s[i] = A * Math.cos(ph); this.s[n + i] = -A * w0 * Math.sin(ph);
    }
  }

  setParams(p: RigParams): void {
    this.p = p;
    const w0 = (2 * Math.PI * p.bpm) / 120;
    for (let i = 0; i < this.n; i++) this.omega[i] = w0 * (1 + (p.spread / 100) * this.detune[i]);
    this.beta = (w0 * w0) / G; // m r / I for a physical pendulum ticking at the base tempo
    const metros = this.n * METRO_MASS;
    this.plateMass = p.platformMass * metros;
    const Lx = this.cols * SPACING, Ly = this.rows * SPACING;
    this.plateJ0 = (this.plateMass * (Lx * Lx + Ly * Ly)) / 12;
    this.mTot = this.plateMass + metros;
    this.J = this.plateJ0 + this.metroJ;
  }

  /** Which platform degrees of freedom are free: [x, y, φ]. */
  free(): [boolean, boolean, boolean] {
    const f = this.p.freedom;
    return [f !== Freedom.Spin, f === Freedom.Slide || f === Freedom.SlideSpin, f === Freedom.Spin || f === Freedom.SlideSpin];
  }

  private deriv(out: Float64Array, x: Float64Array): void {
    const n = this.n, { drive, friction } = this.p, beta = this.beta, f = this.f, cs = this.cs;
    const [fx, fy, fp] = this.free();
    // G = D − m r β Σ c² e eᵀ, rhs = −γ D q̇ − m r Σ (fᵢ c − θ̇² s) e
    let g00 = this.mTot, g01 = 0, g02 = 0, g11 = this.mTot, g12 = 0, g22 = this.J;
    const vX = x[2 * n + 3], vY = x[2 * n + 4], vP = x[2 * n + 5];
    let r0 = -friction * this.mTot * vX, r1 = -friction * this.mTot * vY, r2 = -friction * this.J * vP;
    const k = MR * beta;
    for (let i = 0; i < n; i++) {
      const th = x[i], w = x[n + i], c = Math.cos(th), s = Math.sin(th), q = th / THETA0;
      f[i] = -this.omega[i] * this.omega[i] * s - drive * (q * q - 1) * w;
      cs[i] = c;
      const ex = this.ux[i], ey = this.uy[i], ep = this.px[i] * this.uy[i] - this.py[i] * this.ux[i], c2 = k * c * c;
      g00 -= c2 * ex * ex; g01 -= c2 * ex * ey; g02 -= c2 * ex * ep; g11 -= c2 * ey * ey; g12 -= c2 * ey * ep; g22 -= c2 * ep * ep;
      const push = MR * (f[i] * c - w * w * s);
      r0 -= push * ex; r1 -= push * ey; r2 -= push * ep;
    }
    // Locked degrees of freedom: identity row and column, zero acceleration.
    if (!fx) { g00 = 1; g01 = 0; g02 = 0; r0 = 0; }
    if (!fy) { g11 = 1; g01 = 0; g12 = 0; r1 = 0; }
    if (!fp) { g22 = 1; g02 = 0; g12 = 0; r2 = 0; }
    // Solve the symmetric 3 × 3 by Cramer's rule.
    const c00 = g11 * g22 - g12 * g12, c01 = g02 * g12 - g01 * g22, c02 = g01 * g12 - g02 * g11;
    const det = g00 * c00 + g01 * c01 + g02 * c02;
    const c11 = g00 * g22 - g02 * g02, c12 = g01 * g02 - g00 * g12, c22 = g00 * g11 - g01 * g01;
    const aX = (c00 * r0 + c01 * r1 + c02 * r2) / det, aY = (c01 * r0 + c11 * r1 + c12 * r2) / det, aP = (c02 * r0 + c12 * r1 + c22 * r2) / det;
    for (let i = 0; i < n; i++) {
      const ep = this.px[i] * this.uy[i] - this.py[i] * this.ux[i];
      out[i] = x[n + i];
      out[n + i] = f[i] - beta * cs[i] * (this.ux[i] * aX + this.uy[i] * aY + ep * aP);
    }
    out[2 * n] = vX; out[2 * n + 1] = vY; out[2 * n + 2] = vP;
    out[2 * n + 3] = aX; out[2 * n + 4] = aY; out[2 * n + 5] = aP;
  }

  step(h: number): void {
    const s = this.s, t = this.tmp, L = s.length, { k1, k2, k3, k4 } = this;
    this.deriv(k1, s);
    for (let j = 0; j < L; j++) t[j] = s[j] + 0.5 * h * k1[j];
    this.deriv(k2, t);
    for (let j = 0; j < L; j++) t[j] = s[j] + 0.5 * h * k2[j];
    this.deriv(k3, t);
    for (let j = 0; j < L; j++) t[j] = s[j] + h * k3[j];
    this.deriv(k4, t);
    for (let j = 0; j < L; j++) s[j] += (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
    this.t += h;
  }

  /** Advance by `T` seconds in steps no longer than `hMax`. */
  advance(T: number, hMax = 0.004): void {
    const k = Math.max(1, Math.ceil(T / hMax)), h = T / k;
    for (let j = 0; j < k; j++) this.step(h);
  }

  /** Phase of metronome i on its swing, from θ and θ̇. */
  phase(i: number): number { return Math.atan2(-this.s[this.n + i] / this.omega[i], this.s[i]); }

  /** Kuramoto order parameter r = |⟨e^{iφ}⟩| over a subset (default: all), and its angle. */
  order(which?: (i: number) => boolean): { r: number; psi: number } {
    let c = 0, sn = 0, m = 0;
    for (let i = 0; i < this.n; i++) { if (which && !which(i)) continue; const ph = this.phase(i); c += Math.cos(ph); sn += Math.sin(ph); m++; }
    return m ? { r: Math.hypot(c, sn) / m, psi: Math.atan2(sn, c) } : { r: 0, psi: 0 };
  }

  /** The platform's momentum along x plus every pendulum's (conserved when friction is 0 and x is free). */
  momentumX(): number {
    const n = this.n; let P = this.mTot * this.s[2 * n + 3];
    for (let i = 0; i < n; i++) P += MR * this.s[n + i] * Math.cos(this.s[i]) * this.ux[i];
    return P;
  }
}

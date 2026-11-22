import type {
  Archetype,
  ArchetypeConfig,
  ArchetypeFactory,
  NodeSpec,
  RenderHint,
  ResolvedParams,
} from '../core/archetype';
import { mulberry32 } from '../state/rng';

// Hodgkin–Huxley Axon — a nerve impulse running down the squid giant axon. In 1952 Hodgkin and Huxley wrote
// down how sodium and potassium channels open and close with voltage, solved their equations by hand
// calculator, and got the shape of the action potential and the speed it travels: 18.8 m/s, against 21.2 m/s
// measured. Here the same equations run along an 8 cm axon, cut into 800 pieces joined by the axon's own
// resistance. A stimulus at the end lifts the voltage; sodium channels open, the inside swings positive, the
// current spreads to the next stretch and sets it off. Thicker axons conduct faster, as the square root of
// the radius. Wrap the axon in myelin and the impulse jumps from gap to gap (saltatory conduction), far
// faster for the same width, which is how vertebrate nerves stay thin. Warm it and it speeds up, until near
// 30 °C the sodium channels close too soon and the impulse fails. Stimulate both ends and the two impulses
// meet and annihilate: each runs into the other's refractory wake. (Hodgkin & Huxley 1952; Huxley & Stämpfli 1949.)
const LEN = 8; // cm
const NC = 800; // compartments
const DX = LEN / NC; // cm
const DT = 0.01; // ms
const RI = 35.4; // axoplasm resistivity, Ω·cm
const G_NA = 120, G_K = 36, G_L = 0.3, E_NA = 50, E_K = -77, E_L = -54.387; // mS/cm², mV
const NODE_EVERY = 20; // myelinated: a node every 20 compartments (2 mm)
const MYELIN_CM = 0.01, MYELIN_GL = 0.003; // a myelinated stretch: capacitance and leak cut a hundredfold
const STIM_MS = 0.5, STIM_CELLS = 5; // a 0.5 ms pulse into the end compartments, strong enough for any radius:
const stimDensity = (radiusUm: number): number => 300 + 12 * radiusUm; // µA/cm², growing with the axon's own conductance
const X0 = -2.4, XS = 4.8 / LEN; // render: the axon along x
const TUBE = 0.16; // drawn radius (not to scale)

const vtrap = (x: number, y: number): number => (Math.abs(x / y) < 1e-6 ? y * (1 - x / y / 2) : x / (Math.exp(x / y) - 1));
const rates = (v: number): [number, number, number, number, number, number] => [
  0.1 * vtrap(-(v + 40), 10), 4 * Math.exp(-(v + 65) / 18), // m
  0.07 * Math.exp(-(v + 65) / 20), 1 / (1 + Math.exp(-(v + 35) / 10)), // h
  0.01 * vtrap(-(v + 55), 10), 0.125 * Math.exp(-(v + 65) / 80), // n
];

/** The cable: V, m, h, n per compartment, stepped with exact exponential gating and an implicit voltage step. */
export class HHCable {
  readonly v = new Float64Array(NC); readonly m = new Float64Array(NC); readonly h = new Float64Array(NC); readonly n = new Float64Array(NC);
  readonly node = new Uint8Array(NC); // 1 where there are channels
  t = 0;
  private readonly a = new Float64Array(NC); private readonly b = new Float64Array(NC); private readonly c = new Float64Array(NC); private readonly d = new Float64Array(NC);
  /** upward crossings of 0 mV: the last time at each of two probe points */
  crossA = NaN; crossB = NaN; private readonly probeA = Math.round(NC * 0.25); private readonly probeB = Math.round(NC * 0.75);
  constructor(public radiusUm: number, public tempC: number, public myelin: boolean) { this.setMyelin(myelin); this.rest(); }
  setMyelin(on: boolean): void { this.myelin = on; for (let i = 0; i < NC; i++) this.node[i] = !on || i % NODE_EVERY === 0 || i < STIM_CELLS || i >= NC - STIM_CELLS ? 1 : 0; }
  rest(): void {
    const r = rates(-65);
    this.v.fill(-65); this.m.fill(r[0] / (r[0] + r[1])); this.h.fill(r[2] / (r[2] + r[3])); this.n.fill(r[4] / (r[4] + r[5]));
    this.t = 0; this.crossA = this.crossB = NaN;
  }
  /** conduction velocity between the probes, m/s (cm/ms × 10) */
  velocity(): number { return this.crossB > this.crossA ? ((this.probeB - this.probeA) * DX / (this.crossB - this.crossA)) * 10 : NaN; }
  step(stim: (i: number, t: number) => number): void {
    const phi = 3 ** ((this.tempC - 6.3) / 10), N = NC, v = this.v;
    const r = (this.radiusUm * 1e-4) / (2 * RI) * 1000 / (DX * DX); // axial coupling, µA/cm² per mV
    for (let i = 0; i < N; i++) { // gating: x ← x∞ + (x − x∞)·e^{−dt/τ}
      if (!this.node[i]) continue;
      const q = rates(v[i]);
      for (let g = 0; g < 3; g++) {
        const al = q[2 * g] * phi, be = q[2 * g + 1] * phi, inf = al / (al + be), e = Math.exp(-DT * (al + be));
        const arr = g === 0 ? this.m : g === 1 ? this.h : this.n;
        arr[i] = inf + (arr[i] - inf) * e;
      }
    }
    for (let i = 0; i < N; i++) { // Cm(V' − V)/dt = r(neighbours) − G(V' − E) + I: implicit in V, one tridiagonal solve
      let cm = 1, G = G_L, GE = G_L * E_L;
      if (this.node[i]) {
        const gna = G_NA * this.m[i] ** 3 * this.h[i], gk = G_K * this.n[i] ** 4;
        G += gna + gk; GE += gna * E_NA + gk * E_K;
      } else { cm = MYELIN_CM; G = MYELIN_GL; GE = MYELIN_GL * E_L; }
      const left = i > 0 ? r : 0, right = i < N - 1 ? r : 0; // sealed ends
      this.a[i] = -left; this.c[i] = -right;
      this.b[i] = cm / DT + G + left + right;
      this.d[i] = (cm / DT) * v[i] + GE + stim(i, this.t);
    }
    for (let i = 1; i < N; i++) { const w = this.a[i] / this.b[i - 1]; this.b[i] -= w * this.c[i - 1]; this.d[i] -= w * this.d[i - 1]; }
    const before = [v[this.probeA], v[this.probeB]];
    v[N - 1] = this.d[N - 1] / this.b[N - 1];
    for (let i = N - 2; i >= 0; i--) v[i] = (this.d[i] - this.c[i] * v[i + 1]) / this.b[i];
    this.t += DT;
    if (before[0] < 0 && v[this.probeA] >= 0) this.crossA = this.t;
    if (before[1] < 0 && v[this.probeB] >= 0) this.crossB = this.t;
  }
}

/** the stimulus: 0.5 ms at the start of every `interval` ms, at the left end, or both ends */
export const endStimulus = (both: boolean, interval: number, radiusUm: number) => { const amp = stimDensity(radiusUm); return (i: number, t: number): number =>
  t % interval < STIM_MS && (i < STIM_CELLS || (both && i >= NC - STIM_CELLS)) ? amp : 0; };

class AxonArchetype implements Archetype {
  readonly id = 'axon';
  readonly kind = 'flow' as const;
  readonly particleCount: number;
  readonly cable: HHCable;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly cell: Uint16Array; private readonly ang: Float32Array; private readonly rad: Float32Array; private readonly role: Uint8Array; // 0 membrane, 1 sheath, 2 trace, 3 a hot spark (colours are fixed; state shows by position)
  private both = false; private interval = 7; private speed = 1;
  private readonly hotFrom: number; private readonly hotU: Float32Array; // the sparks: fixed fractions along the active stretch
  private readonly cdf = new Float64Array(NC + 1);
  private readonly state: Float64Array;

  constructor(config: ArchetypeConfig) {
    const rng = mulberry32((config.seed ^ 0x45d9f3b) >>> 0);
    const p = config.params;
    this.cable = new HHCable(p.radiusUm ?? 238, p.tempC ?? 18.5, (p.myelin ?? 0) === 1);
    const N = Math.max(8192, config.particleCount);
    this.particleCount = N;
    this.positions = new Float32Array(N * 3); this.colors = new Float32Array(N * 3);
    this.cell = new Uint16Array(N); this.ang = new Float32Array(N); this.rad = new Float32Array(N); this.role = new Uint8Array(N);
    const nTrace = Math.floor(N * 0.12), nSheath = Math.floor(N * 0.2), nHot = Math.floor(N * 0.22);
    this.hotFrom = N - nHot; this.hotU = new Float32Array(nHot);
    for (let i = 0; i < nHot; i++) this.hotU[i] = (i + rng()) / nHot;
    for (let i = 0; i < N; i++) {
      this.cell[i] = Math.min(NC - 1, Math.floor(rng() * NC)); this.ang[i] = rng() * Math.PI * 2; this.rad[i] = 0.92 + 0.16 * rng();
      this.role[i] = i < nTrace ? 2 : i < nTrace + nSheath ? 1 : i >= this.hotFrom ? 3 : 0;
      const o = i * 3, r = this.role[i], c = r === 2 ? [0.5, 1.6, 2.0] : r === 1 ? [0.6, 0.58, 0.5] : r === 3 ? [2.9, 2.1, 0.8] : [0.16, 0.42, 1.25];
      this.colors[o] = c[0]; this.colors[o + 1] = c[1]; this.colors[o + 2] = c[2];
      if (this.role[i] === 2) this.cell[i] = Math.floor((i / nTrace) * NC);
    }
    this.state = new Float64Array(4 * NC + 1);
    this.readParams(p);
    this.sync();
  }

  private readParams(p: ResolvedParams): void {
    this.cable.radiusUm = p.radiusUm ?? 238;
    this.cable.tempC = p.tempC ?? 18.5;
    const my = (p.myelin ?? 0) === 1;
    if (my !== this.cable.myelin) this.cable.setMyelin(my);
    const both = (p.stimulus ?? 0) === 1;
    if (both !== this.both) { this.both = both; this.cable.rest(); }
    this.interval = p.intervalMs ?? 7; this.speed = p.speed ?? 1;
  }

  private sync(): void {
    const pos = this.positions, c = this.cable, park = (o: number) => { pos[o] = 0; pos[o + 1] = -46; pos[o + 2] = 0; };
    // the sparks go where the membrane is depolarised, more where it has swung further: an inverse-CDF over
    // max(0, V + 50); their number follows the total, so a fading impulse thins out
    const cdf = this.cdf;
    for (let k = 0; k < NC; k++) cdf[k + 1] = cdf[k] + Math.max(0, c.v[k] + 50);
    const total = cdf[NC], nHot = this.particleCount - this.hotFrom, used = Math.min(nHot, Math.round((total / 9000) * nHot));
    let k = 0;
    for (let h = 0; h < nHot; h++) {
      const o = (this.hotFrom + h) * 3;
      if (h >= used) { park(o); continue; }
      const at = this.hotU[h] * total;
      while (k < NC - 1 && cdf[k + 1] < at) k++;
      const a = this.ang[this.hotFrom + h], rr = TUBE * (1.05 + 0.25 * this.rad[this.hotFrom + h]) * (1 + Math.max(0, (c.v[k] + 65) / 115) * 0.35);
      pos[o] = X0 + (k + 0.5) * DX * XS; pos[o + 1] = rr * Math.cos(a) - 0.25; pos[o + 2] = rr * Math.sin(a);
    }
    for (let i = 0; i < this.hotFrom; i++) {
      const kk = this.cell[i], v = c.v[kk], x = X0 + (kk + 0.5) * DX * XS, o = i * 3, role = this.role[i];
      if (role === 2) { pos[o] = x; pos[o + 1] = 0.55 + ((v + 70) / 120) * 0.7; pos[o + 2] = 0; continue; } // the trace: V along the axon, above it
      if (role === 1 && (!c.myelin || c.node[kk])) { park(o); continue; } // no sheath here
      const bulge = role === 1 ? 1.55 : 1 + Math.max(0, (v + 65) / 115) * 0.35, rr = TUBE * this.rad[i] * bulge, a = this.ang[i];
      pos[o] = x + (rng01(i) - 0.5) * DX * XS; pos[o + 1] = rr * Math.cos(a) - 0.25; pos[o + 2] = rr * Math.sin(a);
    }
  }

  step(_dt: number, p: ResolvedParams): void {
    this.readParams(p);
    const stim = endStimulus(this.both, this.interval, this.cable.radiusUm), steps = Math.max(1, Math.round(4 * this.speed)); // 0.04 ms of nerve a frame at speed 1
    for (let s = 0; s < steps; s++) this.cable.step(stim);
    this.sync();
  }

  readPositions(): Float32Array { return this.positions; }
  readColors(): Float32Array { return this.colors; }
  readState(): Float64Array {
    const c = this.cable, s = this.state;
    s.set(c.v, 0); s.set(c.m, NC); s.set(c.h, 2 * NC); s.set(c.n, 3 * NC); s[4 * NC] = c.t;
    return s;
  }
  loadState(s: Float64Array): void {
    if (s.length < 4 * NC + 1) return;
    const c = this.cable;
    c.v.set(s.subarray(0, NC)); c.m.set(s.subarray(NC, 2 * NC)); c.h.set(s.subarray(2 * NC, 3 * NC)); c.n.set(s.subarray(3 * NC, 4 * NC)); c.t = s[4 * NC];
    this.sync();
  }
  getHierarchy(): NodeSpec[] {
    return [{ id: 'root', parentId: null, label: `Hodgkin–Huxley axon · ${NC} compartments · ${LEN} cm`, stateOffset: 0, stateLength: 4 * NC + 1 }];
  }
  renderHint(): RenderHint { return { geometry: 'points', pointSize: 0.006 }; }
  dispose(): void { /* buffers GC with the instance */ }
}

const rng01 = (i: number): number => { let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };

export const axonFactory: ArchetypeFactory = {
  id: 'axon',
  label: 'Hodgkin–Huxley Axon',
  category: 'Neural',
  kind: 'flow',
  params: [
    { key: 'radiusUm', label: 'axon radius (µm)', min: 50, max: 500, step: 1, default: 238 },
    { key: 'tempC', label: 'temperature (°C)', min: 6.3, max: 35, step: 0.1, default: 18.5 },
    { key: 'myelin', label: 'axon', min: 0, max: 1, step: 1, default: 0, options: { bare: 0, myelinated: 1 } },
    { key: 'stimulus', label: 'stimulus', min: 0, max: 1, step: 1, default: 0, options: { 'left end': 0, 'both ends (collision)': 1 } },
    { key: 'intervalMs', label: 'stimulus every (ms)', min: 4, max: 40, step: 0.5, default: 7 },
    { key: 'speed', label: 'speed', min: 0.25, max: 4, step: 0.25, default: 1 },
  ],
  defaultParticleCount: 80_000,
  particleCountOptions: [40_000, 80_000, 160_000],
  defaultDt: 0.016,
  defaultTrail: 0,
  bloom: 0.6,
  create: (config) => new AxonArchetype(config),
};

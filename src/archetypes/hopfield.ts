import type {
  Archetype,
  ArchetypeConfig,
  ArchetypeFactory,
  NodeSpec,
  RenderHint,
  ResolvedParams,
} from '../core/archetype';
import { mulberry32 } from '../state/rng';

// Hopfield Memory — a network that remembers by settling. 1024 neurons, each on (amber) or off (blue), every
// one connected to every other. Storing a pattern is Hebb's rule, "cells that fire together wire together":
// each pair's connection grows when the pattern has them alike and shrinks when it has them different. To
// recall, start from a damaged copy and let neurons, one at a time, take the side their inputs vote for. The
// network's energy can only go down, so it rolls into the nearest valley, and the valleys are the memories.
// Store too many and the valleys merge: past about 0.14 patterns per neuron (138 here) recall collapses into
// noise. The bars on the right are the overlap with each stored pattern; the small picture is the pattern
// being recalled, and the mark under a bar shows which one that is. "Pictures" stores six drawings, which overlap one another, so they interfere far sooner
// than random patterns do. (Hopfield 1982; Amit, Gutfreund and Sompolinsky 1985.)
const SIDE = 32, N = SIDE * SIDE;
const GRID_X = -1.0, CELL = 0.078; // the network's square, centred at (GRID_X, 0)
const THUMB_X = 1.55, THUMB_Y = 0.78, THUMB_CELL = 0.022;
const BARS_X = 1.0, BARS_W = 1.15, BARS_Y = -0.15, BARS_H = 0.95, BARS_SHOWN = 24;
const HOLD = 90; // frames to show a finished recall before the next cue

/** Six drawings on the 32 × 32 grid, ±1. */
export function pictures(): Int8Array[] {
  const draw = (f: (x: number, y: number) => boolean): Int8Array => {
    const p = new Int8Array(N);
    for (let i = 0; i < N; i++) { const x = (i % SIDE) - 15.5, y = 15.5 - Math.floor(i / SIDE); p[i] = f(x, y) ? 1 : -1; }
    return p;
  };
  return [
    draw((x, y) => { const r = Math.hypot(x, y); return r > 7 && r < 13; }), // a ring
    draw((x, y) => Math.abs(x - y) < 4 || Math.abs(x + y) < 4), // a cross
    draw((x, y) => (Math.floor((x + 16) / 8) + Math.floor((y + 16) / 8)) % 2 === 0), // a checkerboard
    draw((x, y) => Math.max(Math.abs(x), Math.abs(y)) % 8 < 4), // nested squares
    draw((x, y) => y < 9 && y > -12 && Math.abs(x) < (9 - y) * 0.6), // a triangle
    draw((x, y) => { const r = Math.hypot(x, y); return (r < 14 && r > 11) || Math.hypot(x + 5, y - 4) < 2.6 || Math.hypot(x - 5, y - 4) < 2.6 || (y < -2 && y > -8 && Math.hypot(x, y + 1) < 8 && Math.hypot(x, y + 1) > 5.5); }), // a smile
  ];
}

/** P random ±1 patterns. */
export function randomPatterns(P: number, rng: () => number): Int8Array[] {
  return Array.from({ length: P }, () => { const p = new Int8Array(N); for (let i = 0; i < N; i++) p[i] = rng() < 0.5 ? 1 : -1; return p; });
}

/** The network. Hebb's rule w_ij = (1/N) Σ_μ ξᵢ^μ ξⱼ^μ (no self-connection) is never built as a matrix: a neuron's
 *  input is Σ_μ ξᵢ^μ (m_μ − ξᵢ^μ sᵢ/N), with m_μ = (1/N) Σⱼ ξⱼ^μ sⱼ the overlaps, kept up to date at each flip. */
export class HopfieldNet {
  readonly s = new Int8Array(N);
  readonly m: Float64Array;
  constructor(readonly patterns: Int8Array[], private readonly rng: () => number) { this.m = new Float64Array(patterns.length); }
  set(state: Int8Array): void { this.s.set(state); this.recount(); }
  recount(): void { for (let u = 0; u < this.patterns.length; u++) { let a = 0; const p = this.patterns[u]; for (let i = 0; i < N; i++) a += p[i] * this.s[i]; this.m[u] = a / N; } }
  /** pattern `u`, with each neuron flipped with probability `noise` */
  cue(u: number, noise: number): void { const p = this.patterns[u]; for (let i = 0; i < N; i++) this.s[i] = this.rng() < noise ? -p[i] as -1 | 1 : p[i]; this.recount(); }
  field(i: number): number { let h = 0; const si = this.s[i]; for (let u = 0; u < this.patterns.length; u++) { const x = this.patterns[u][i]; h += x * (this.m[u] - (x * si) / N); } return h; }
  /** E = −½ Σ_{i≠j} w_ij sᵢ sⱼ = −(N/2) Σ_μ m_μ² + P/2 */
  energy(): number { let e = 0; for (const v of this.m) e += v * v; return -0.5 * N * e + 0.5 * this.patterns.length; }
  /** one asynchronous update of neuron i (at temperature T, Glauber; T = 0 takes the sign); returns whether it flipped */
  update(i: number, T: number): boolean {
    const h = this.field(i);
    const next: -1 | 1 = T > 0 ? (this.rng() < 1 / (1 + Math.exp((-2 * h) / T)) ? 1 : -1) : h > 0 ? 1 : h < 0 ? -1 : (this.s[i] as -1 | 1);
    if (next === this.s[i]) return false;
    this.s[i] = next;
    for (let u = 0; u < this.patterns.length; u++) this.m[u] += (2 * next * this.patterns[u][i]) / N;
    return true;
  }
  /** a sweep: every neuron once, in random order; returns the number of flips */
  sweep(T: number): number {
    const order = new Uint16Array(N); for (let i = 0; i < N; i++) order[i] = i;
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
    let flips = 0; for (let k = 0; k < N; k++) if (this.update(order[k], T)) flips++;
    return flips;
  }
}

class HopfieldArchetype implements Archetype {
  readonly id = 'hopfield';
  readonly kind = 'flow' as const;
  readonly particleCount: number;
  readonly net: HopfieldNet;
  private readonly rng: () => number;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  // Colours are fixed, so each neuron has an amber "on" set and a blue "off" set of particles, and the one it
  // isn't showing parks off-frame. The same goes for the picture of the pattern being recalled.
  private readonly per: number; // particles per neuron, per state
  private readonly thumb: number; // where the picture's particles start (two per pixel)
  private readonly bars: number; private readonly perBar: number; private readonly mark: number; // bars, then the cue mark
  private readonly jx: Float32Array; private readonly jy: Float32Array;
  private noise = 0.3; private temp = 0; private speed = 1;
  private cueIdx = 0; private held = 0; private settled = false; private quiet = 0; private cursor = 0;
  private readonly order = new Uint16Array(N);

  constructor(config: ArchetypeConfig) {
    this.rng = mulberry32((config.seed ^ 0x165667b1) >>> 0);
    const set = Math.round(config.params.set ?? 0), P = Math.round(config.params.patterns ?? 20);
    this.net = new HopfieldNet(set === 1 ? pictures() : randomPatterns(P, this.rng), this.rng);
    const count = Math.max(N * 16 + 8192, config.particleCount);
    this.particleCount = count;
    this.positions = new Float32Array(count * 3); this.colors = new Float32Array(count * 3);
    this.per = Math.floor((count - 2 * N - 6000) / (2 * N));
    this.thumb = 2 * N * this.per;
    this.bars = this.thumb + 2 * N;
    this.perBar = Math.floor((count - this.bars - 600) / BARS_SHOWN);
    this.mark = this.bars + this.perBar * BARS_SHOWN;
    this.jx = new Float32Array(count); this.jy = new Float32Array(count);
    for (let i = 0; i < count; i++) { this.jx[i] = (this.rng() - 0.5) * CELL * 0.8; this.jy[i] = (this.rng() - 0.5) * CELL * 0.8; }
    const col = this.colors, paint = (k: number, r: number, g: number, b: number) => { col[k * 3] = r; col[k * 3 + 1] = g; col[k * 3 + 2] = b; };
    for (let k = 0; k < this.thumb; k++) if (Math.floor(k / this.per) % 2 === 0) paint(k, 3.2, 1.7, 0.4); else paint(k, 0.08, 0.22, 0.85);
    for (let k = this.thumb; k < this.bars; k++) if ((k - this.thumb) % 2 === 0) paint(k, 4, 2.2, 0.5); else paint(k, 0.08, 0.22, 0.75);
    for (let k = this.bars; k < this.mark; k++) paint(k, 1.6, 1.9, 2.8);
    for (let k = this.mark; k < count; k++) paint(k, 2.6, 1.7, 0.4);
    for (let i = 0; i < N; i++) this.order[i] = i;
    this.readParams(config.params);
    this.newCue();
    this.sync();
  }

  private readParams(p: ResolvedParams): void { this.noise = p.noise ?? 0.3; this.temp = p.temperature ?? 0; this.speed = p.speed ?? 1; }

  private newCue(): void {
    this.net.cue(this.cueIdx, this.noise);
    this.settled = false; this.held = 0; this.quiet = 0; this.cursor = N;
  }

  private advance(): void { // a slice of a sweep: each frame updates N/16 neurons × speed
    const budget = Math.round((N / 16) * this.speed);
    for (let b = 0; b < budget && !this.settled; b++) {
      if (this.cursor >= N) { // a new sweep, in a fresh random order
        for (let i = N - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); const t = this.order[i]; this.order[i] = this.order[j]; this.order[j] = t; }
        this.cursor = 0;
      }
      const i = this.order[this.cursor++];
      if (this.net.update(i, this.temp)) this.quiet = 0; else this.quiet++;
      if (this.quiet >= N || (this.temp > 0 && this.quiet >= N / 4)) this.settled = true; // a whole sweep with no flip (warm: a quarter sweep)
    }
    if (this.settled && ++this.held > HOLD) { this.cueIdx = (this.cueIdx + 1) % Math.min(this.net.patterns.length, BARS_SHOWN); this.newCue(); }
  }

  private sync(): void {
    const pos = this.positions, s = this.net.s, put = (k: number, x: number, y: number) => { pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = 0; };
    for (let i = 0; i < N; i++) { // the network: neuron i's "on" set is block 2i, its "off" set block 2i + 1
      const cx = GRID_X + ((i % SIDE) - 15.5) * CELL, cy = (15.5 - Math.floor(i / SIDE)) * CELL, shown = s[i] > 0 ? 0 : 1;
      for (let st = 0; st < 2; st++) {
        const from = (2 * i + st) * this.per;
        for (let q = 0; q < this.per; q++) { const k = from + q; if (st === shown) put(k, cx + this.jx[k], cy + this.jy[k]); else put(k, 0, -46); }
      }
    }
    const target = this.net.patterns[this.cueIdx];
    for (let i = 0; i < N; i++) { // the pattern being recalled
      const x = THUMB_X + ((i % SIDE) - 15.5) * THUMB_CELL, y = THUMB_Y + (15.5 - Math.floor(i / SIDE)) * THUMB_CELL, k = this.thumb + 2 * i;
      if (target[i] > 0) { put(k, x, y); put(k + 1, 0, -46); } else { put(k, 0, -46); put(k + 1, x, y); }
    }
    const shown = Math.min(BARS_SHOWN, this.net.patterns.length), slot = BARS_W / shown, base = BARS_Y - BARS_H / 2; // as many slots as patterns shown
    for (let u = 0; u < BARS_SHOWN; u++) { // overlap bars, from the baseline up (or down, for the inverse pattern)
      const m = u < shown ? this.net.m[u] : 0;
      for (let q = 0; q < this.perBar; q++) {
        const k = this.bars + u * this.perBar + q, f = q / this.perBar;
        if (u < shown) put(k, BARS_X + (u + 0.15 + (0.7 * ((q * 7) % 11)) / 10) * slot, base + f * m * BARS_H); else put(k, 0, -46);
      }
    }
    const marks = this.particleCount - this.mark; // the cue mark: a short bar under the pattern being recalled
    for (let q = 0; q < marks; q++) put(this.mark + q, BARS_X + (this.cueIdx + 0.1 + 0.8 * (q / marks)) * slot, base - 0.05 - 0.02 * ((q * 13) % 3));
  }

  step(_dt: number, p: ResolvedParams): void {
    this.readParams(p);
    this.advance();
    this.sync();
  }

  readPositions(): Float32Array { return this.positions; }
  readColors(): Float32Array { return this.colors; }
  readState(): Float64Array { const out = new Float64Array(N + 1); for (let i = 0; i < N; i++) out[i] = this.net.s[i]; out[N] = this.cueIdx; return out; }
  loadState(s: Float64Array): void {
    if (s.length < N + 1) return;
    for (let i = 0; i < N; i++) this.net.s[i] = s[i] > 0 ? 1 : -1;
    this.cueIdx = Math.min(Math.max(0, Math.round(s[N])), this.net.patterns.length - 1);
    this.net.recount(); this.settled = false; this.quiet = 0; this.sync();
  }
  getHierarchy(): NodeSpec[] {
    return [{ id: 'root', parentId: null, label: `Hopfield network · ${N} neurons · ${this.net.patterns.length} patterns (α = ${(this.net.patterns.length / N).toFixed(3)})`, stateOffset: 0, stateLength: N + 1 }];
  }
  renderHint(): RenderHint { return { geometry: 'points', pointSize: 0.009 }; }
  dispose(): void { /* buffers GC with the instance */ }
}

export const hopfieldFactory: ArchetypeFactory = {
  id: 'hopfield',
  label: 'Hopfield Memory',
  category: 'Neural',
  kind: 'flow',
  params: [
    { key: 'set', label: 'memories', min: 0, max: 1, step: 1, default: 1, rebuild: true, options: { 'random patterns': 0, 'six pictures': 1 } },
    { key: 'patterns', label: 'random patterns stored', min: 1, max: 300, step: 1, default: 40, rebuild: true },
    { key: 'noise', label: 'cue damage', min: 0, max: 0.5, step: 0.01, default: 0.3 },
    { key: 'temperature', label: 'temperature', min: 0, max: 1, step: 0.01, default: 0 },
    { key: 'speed', label: 'speed', min: 0.25, max: 4, step: 0.25, default: 1 },
  ],
  defaultParticleCount: 48_000,
  particleCountOptions: [48_000],
  defaultDt: 0.016,
  defaultTrail: 0,
  bloom: 0.5,
  create: (config) => new HopfieldArchetype(config),
};

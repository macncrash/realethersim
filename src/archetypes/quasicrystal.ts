import type {
  Archetype,
  ArchetypeConfig,
  ArchetypeFactory,
  NodeSpec,
  RenderHint,
  ResolvedParams,
} from '../core/archetype';
import { mulberry32 } from '../state/rng';

// Quasicrystal Multigrid — de Bruijn's construction, opened up beyond Penrose. Take N families of evenly
// spaced parallel lines, at angles πk/N; every crossing of two lines becomes one rhombus, and the rhombi fit
// together into a tiling with 2N-fold symmetry that never repeats. Three families give an ordinary periodic
// tiling (stacked cubes); four give the octagonal Ammann–Beenker tiling, five Penrose's, six a dodecagonal
// one, seven a 14-fold one. Switch the view to diffraction and the same tiles turn into the pattern a crystal
// would scatter: the vertices' Fourier transform. The periodic tiling gives spots on a lattice; the
// quasicrystals give spots just as sharp, with the "forbidden" symmetry no lattice can have. That is what
// Shechtman saw in 1982 in an aluminium–manganese alloy, ten-fold spots no crystal was supposed to make.
// (de Bruijn 1981; Ammann, Beenker 1982; Shechtman et al. 1984.)
const TAU = Math.PI * 2;
const R_TILES = 15; // patch radius, in tile edges
const KEEP = 2.45; // patch radius, in render units
const K_MAX = 7.2; // diffraction: |k| range shown (radians per tile edge)
const GRID = 151; // diffraction: k-grid cells per side
const R_WIN = 11; // diffraction: Gaussian window on the vertices (tile edges)

export interface Rhomb { corners: [number, number][]; type: number } // type: the rhombus angle in units of π/N

/** The dual of an N-grid (directions πk/N), kept to tiles whose centres lie within `radius` tile edges. */
export function multigridTiles(N: number, radius: number): { rhombi: Rhomb[]; vx: Float64Array; vy: Float64Array } {
  const e: [number, number][] = [];
  for (let k = 0; k < N; k++) e.push([Math.cos((Math.PI * k) / N), Math.sin((Math.PI * k) / N)]);
  // offsets near-equal, so the patch is centred on a rosette, and perturbed so no three lines meet at a point
  const gamma = e.map((_, k) => 0.2 + (k - (N - 1) / 2) * 0.0113);
  const M = Math.ceil((2.6 * radius) / N) + 3; // lines needed: a tile's centre sits at about (N/2)·r
  const rhombi: Rhomb[] = [];
  const seen = new Set<string>();
  for (let k = 0; k < N; k++) {
    for (let l = k + 1; l < N; l++) {
      const det = e[k][0] * e[l][1] - e[k][1] * e[l][0];
      const d = l - k, type = Math.min(d, N - d);
      for (let i = -M; i <= M; i++) {
        for (let j = -M; j <= M; j++) {
          const a = i - gamma[k], b = j - gamma[l];
          const rx = (a * e[l][1] - b * e[k][1]) / det, ry = (b * e[k][0] - a * e[l][0]) / det;
          let ox = 0, oy = 0; // Σ_{m≠k,l} ⌊eₘ·r + γₘ⌋ eₘ
          for (let m = 0; m < N; m++) {
            if (m === k || m === l) continue;
            const km = Math.floor(e[m][0] * rx + e[m][1] * ry + gamma[m]);
            ox += km * e[m][0]; oy += km * e[m][1];
          }
          const corners: [number, number][] = [
            [ox + (i - 1) * e[k][0] + (j - 1) * e[l][0], oy + (i - 1) * e[k][1] + (j - 1) * e[l][1]],
            [ox + i * e[k][0] + (j - 1) * e[l][0], oy + i * e[k][1] + (j - 1) * e[l][1]],
            [ox + i * e[k][0] + j * e[l][0], oy + i * e[k][1] + j * e[l][1]],
            [ox + (i - 1) * e[k][0] + j * e[l][0], oy + (i - 1) * e[k][1] + j * e[l][1]],
          ];
          const cx = (corners[0][0] + corners[2][0]) / 2, cy = (corners[0][1] + corners[2][1]) / 2;
          if (Math.hypot(cx, cy) > radius) continue;
          const key = `${Math.round(cx * 256)},${Math.round(cy * 256)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          rhombi.push({ corners, type });
        }
      }
    }
  }
  // the centre of the patch is not the origin of the dual: move it there
  let sx = 0, sy = 0;
  for (const r of rhombi) { sx += r.corners[0][0] + r.corners[2][0]; sy += r.corners[0][1] + r.corners[2][1]; }
  sx /= 2 * Math.max(1, rhombi.length); sy /= 2 * Math.max(1, rhombi.length);
  const verts = new Map<string, [number, number]>();
  for (const r of rhombi) {
    for (const c of r.corners) { c[0] -= sx; c[1] -= sy; verts.set(`${Math.round(c[0] * 4096)},${Math.round(c[1] * 4096)}`, [c[0], c[1]]); }
  }
  const vx = new Float64Array(verts.size), vy = new Float64Array(verts.size);
  let n = 0;
  for (const [x, y] of verts.values()) { vx[n] = x; vy[n] = y; n++; }
  return { rhombi, vx, vy };
}

/** |Σⱼ wⱼ e^{ik·rⱼ}|² / (Σⱼ wⱼ)² on a G×G grid of k in [−kMax, kMax]², with a Gaussian window of width `win`. */
export function diffraction(vx: Float64Array, vy: Float64Array, kMax: number, G: number, win: number): Float64Array {
  const keep: number[] = [];
  for (let j = 0; j < vx.length; j++) if (Math.hypot(vx[j], vy[j]) < win * 2.5) keep.push(j);
  const n = keep.length, w = new Float64Array(n), cx = new Float64Array(G * n), sx = new Float64Array(G * n), cy = new Float64Array(G * n), sy = new Float64Array(G * n);
  let wsum = 0;
  keep.forEach((j, q) => { w[q] = Math.exp(-(vx[j] ** 2 + vy[j] ** 2) / (win * win)); wsum += w[q]; });
  for (let a = 0; a < G; a++) {
    const k = -kMax + (2 * kMax * a) / (G - 1);
    keep.forEach((j, q) => { cx[a * n + q] = Math.cos(k * vx[j]); sx[a * n + q] = Math.sin(k * vx[j]); cy[a * n + q] = Math.cos(k * vy[j]); sy[a * n + q] = Math.sin(k * vy[j]); });
  }
  const out = new Float64Array(G * G);
  for (let b = 0; b < G; b++) {
    const oy = b * n;
    for (let a = 0; a < G; a++) {
      const ox = a * n;
      let re = 0, im = 0;
      for (let q = 0; q < n; q++) {
        const c1 = cx[ox + q], s1 = sx[ox + q], c2 = cy[oy + q], s2 = sy[oy + q], wq = w[q];
        re += wq * (c1 * c2 - s1 * s2); im += wq * (s1 * c2 + c1 * s2);
      }
      out[b * G + a] = (re * re + im * im) / (wsum * wsum);
    }
  }
  return out;
}

// tile colours by rhombus angle (type 1 = the thinnest), bright enough for bloom
const PALETTE: [number, number, number][] = [[0.4, 1.5, 2.8], [2.7, 1.3, 0.4], [0.6, 2.4, 1.0], [2.4, 0.6, 1.9], [2.6, 2.2, 0.8], [1.2, 1.0, 2.8], [2.2, 2.2, 2.2]];

class QuasicrystalArchetype implements Archetype {
  readonly id = 'quasicrystal';
  readonly kind = 'flow' as const;
  readonly particleCount: number;
  readonly grids: number;
  readonly rhombi: Rhomb[];
  readonly vx: Float64Array; readonly vy: Float64Array;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly nTile: number; // particles [0, nTile) draw the tiles, the rest the diffraction pattern (colours are fixed)
  private readonly bx: Float32Array; private readonly by: Float32Array; // each particle's place in its own picture
  private speed = 0.5; private view = 0; private t = 0; private mix = 0;

  constructor(config: ArchetypeConfig) {
    const rng = mulberry32((config.seed ^ 0x2c1b3c6d) >>> 0);
    this.grids = Math.round(config.params.grids ?? 4);
    const { rhombi, vx, vy } = multigridTiles(this.grids, R_TILES);
    this.rhombi = rhombi; this.vx = vx; this.vy = vy;
    const N = Math.max(4096, config.particleCount);
    this.particleCount = N;
    this.positions = new Float32Array(N * 3); this.colors = new Float32Array(N * 3);
    this.bx = new Float32Array(N); this.by = new Float32Array(N);
    const nTile = (this.nTile = Math.floor(N * 0.55)), col = this.colors;

    // the tiles: points along every edge
    const s = KEEP / R_TILES, perEdge = Math.max(3, Math.floor(nTile / Math.max(1, rhombi.length * 4)));
    let idx = 0;
    for (const r of rhombi) {
      const c = PALETTE[(r.type - 1) % PALETTE.length];
      for (let edge = 0; edge < 4; edge++) {
        const A = r.corners[edge], B = r.corners[(edge + 1) % 4];
        for (let p = 0; p < perEdge && idx < nTile; p++, idx++) {
          const f = p / perEdge, j = 0.8 + 0.4 * rng();
          this.bx[idx] = (A[0] + (B[0] - A[0]) * f) * s; this.by[idx] = (A[1] + (B[1] - A[1]) * f) * s;
          col[idx * 3] = c[0] * j; col[idx * 3 + 1] = c[1] * j; col[idx * 3 + 2] = c[2] * j;
        }
      }
    }
    for (; idx < nTile; idx++) { this.bx[idx] = 0; this.by[idx] = -46; } // spare budget parks off-frame, dark

    // the diffraction pattern: particles shared out over the k-grid by √intensity, the forward beam left out
    const I = diffraction(vx, vy, K_MAX, GRID, R_WIN), cell = (2 * K_MAX) / (GRID - 1), ks = KEEP / K_MAX;
    let top = 0;
    for (let q = 0; q < I.length; q++) { const a = q % GRID, b = (q / GRID) | 0, k = Math.hypot(-K_MAX + a * cell, -K_MAX + b * cell); if (k > 0.6 && k < K_MAX) top = Math.max(top, I[q]); }
    const weight = new Float64Array(I.length);
    let total = 0;
    for (let q = 0; q < I.length; q++) {
      const a = q % GRID, b = (q / GRID) | 0, k = Math.hypot(-K_MAX + a * cell, -K_MAX + b * cell);
      const rel = I[q] / top;
      weight[q] = k > 0.6 && k < K_MAX && rel > 2e-3 ? Math.sqrt(rel) : 0; // a round aperture, so the square grid's corners don't show
      total += weight[q];
    }
    let acc = 0, q = 0;
    const nD = N - nTile;
    for (let d = 0; d < nD; d++) {
      const i = nTile + d, at = ((d + 0.5) / nD) * total;
      while (q < I.length - 1 && acc + weight[q] < at) { acc += weight[q]; q++; }
      const a = q % GRID, b = (q / GRID) | 0, rel = Math.min(1, I[q] / top);
      const r = Math.sqrt(-2 * Math.log(1 - rng() * 0.999)) * 0.35 * cell, th = TAU * rng(); // a Gaussian blur of a third of a cell
      this.bx[i] = (-K_MAX + a * cell + r * Math.cos(th)) * ks; this.by[i] = (-K_MAX + b * cell + r * Math.sin(th)) * ks;
      const g = 0.35 + 2.4 * rel ** 0.45;
      col[i * 3] = g * 0.8; col[i * 3 + 1] = g * 0.95; col[i * 3 + 2] = g * 1.25;
    }
    this.readParams(config.params);
    this.mix = this.view;
    this.sync();
  }

  private readParams(p: ResolvedParams): void {
    this.speed = p.speed ?? 0.5;
    this.view = p.view === 1 ? 1 : 0;
  }

  private sync(): void { // the change of view: the tiles fly outward and away while the spots open out from the centre
    const pos = this.positions, u = this.mix * this.mix * (3 - 2 * this.mix);
    const ang = this.t * this.speed * 0.06, ca = Math.cos(ang), sa = Math.sin(ang);
    const tileScale = 1 + 2.5 * u, spotScale = 0.15 + 0.85 * u;
    for (let i = 0; i < this.particleCount; i++) {
      const o = i * 3, tile = i < this.nTile;
      if ((tile && u >= 1) || (!tile && u <= 0) || this.by[i] < -40) { pos[o] = 0; pos[o + 1] = -46; pos[o + 2] = 0; continue; }
      const k = tile ? tileScale : spotScale, x = this.bx[i] * k, y = this.by[i] * k;
      pos[o] = x * ca - y * sa; pos[o + 1] = x * sa + y * ca; pos[o + 2] = 0;
    }
  }

  step(dt: number, p: ResolvedParams): void {
    this.readParams(p);
    this.t += dt;
    const target = this.view, d = target - this.mix; // ease between the tiles and their diffraction over about a second
    this.mix = Math.abs(d) < 1e-3 ? target : this.mix + Math.sign(d) * Math.min(Math.abs(d), dt * 1.1);
    this.sync();
  }

  readPositions(): Float32Array { return this.positions; }
  readColors(): Float32Array { return this.colors; }
  readState(): Float64Array { return new Float64Array([this.t, this.mix]); }
  loadState(s: Float64Array): void { this.t = s[0] ?? 0; this.mix = s[1] ?? 0; this.sync(); }
  getHierarchy(): NodeSpec[] {
    return [{ id: 'root', parentId: null, label: `${this.grids}-grid quasicrystal · ${this.rhombi.length} tiles · ${2 * this.grids}-fold`, stateOffset: 0, stateLength: 2 }];
  }
  renderHint(): RenderHint { return { geometry: 'points', pointSize: 0.005 }; }
  dispose(): void { /* buffers GC with the instance */ }
}

export const quasicrystalFactory: ArchetypeFactory = {
  id: 'quasicrystal',
  label: 'Quasicrystal Multigrid',
  category: 'Tiling',
  kind: 'flow',
  params: [
    { key: 'grids', label: 'grids (symmetry)', min: 3, max: 7, step: 1, default: 4, rebuild: true, options: { '3 · 6-fold, periodic': 3, '4 · 8-fold, Ammann–Beenker': 4, '5 · 10-fold, Penrose': 5, '6 · 12-fold': 6, '7 · 14-fold': 7 } },
    { key: 'view', label: 'view', min: 0, max: 1, step: 1, default: 0, options: { tiles: 0, diffraction: 1 } },
    { key: 'speed', label: 'rotation', min: 0, max: 3, step: 0.05, default: 0.5 },
  ],
  defaultParticleCount: 120_000,
  particleCountOptions: [120_000],
  defaultDt: 0.016,
  defaultTrail: 0,
  bloom: 0.5,
  create: (config) => new QuasicrystalArchetype(config),
};

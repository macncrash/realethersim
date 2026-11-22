import type {
  Archetype,
  ArchetypeConfig,
  ArchetypeFactory,
  NodeSpec,
  RenderHint,
  ResolvedParams,
} from '../core/archetype';
import { mulberry32 } from '../state/rng';

// Pinwheel Tiling — a tiling whose tiles point in infinitely many directions. John Conway found the rule and
// Charles Radin proved what it does (1994): a right triangle with legs 1 and 2 splits into five copies of
// itself, each √5 times smaller. Each copy points θ = arctan ½ away from the edge of the parent it lies along,
// some turned one way and some, being mirror images, the other; and θ is not a rational fraction of a turn.
// So every generation brings tiles in directions no earlier one had: about two new ones (mod 180°) each time,
// never closing up. In the limit the directions fill the circle evenly, and the tiling has, on average, every
// rotational symmetry at once, though each tile is the same triangle. Tiles are coloured by the direction of
// their long edge. The ring on the right holds one dot per tile at that angle, so its spokes are the
// directions in use, brighter where more tiles share one. A searchlight sweeps the angles and lights every
// tile pointing that way, wherever it is. (Conway's construction; Radin 1994.)
const PATCH_W = 1.6; // half-width of the 2 × 1 rectangle, render units
const CX = -0.85; // where the rectangle sits; the ring sits to its right
const RING_X = 1.6, RING_R = 0.55;

export type Tri = [number, number, number, number, number, number]; // A (angle θ), B (the right angle), C, as x,y pairs

/** One generation: each triangle into five, √5 times smaller. */
export function pinwheelChildren(t: Tri): Tri[] {
  const [ax, ay, bx, by, cx, cy] = t;
  // D, the foot of the altitude from B onto AC
  const ux = cx - ax, uy = cy - ay, f = ((bx - ax) * ux + (by - ay) * uy) / (ux * ux + uy * uy), dx = ax + f * ux, dy = ay + f * uy;
  // BDC is one copy (its θ is at B). ABD is twice as big: its midpoints cut off a copy at A and one at B, and
  // leave a rectangle D·M1·M3·M2, cut along the diagonal D–M3 so the two halves are mirror images of each
  // other. That mix of hands is what makes the turns by θ add up instead of cancelling.
  const m1x = (ax + dx) / 2, m1y = (ay + dy) / 2, m2x = (dx + bx) / 2, m2y = (dy + by) / 2, m3x = (ax + bx) / 2, m3y = (ay + by) / 2;
  return [
    [bx, by, dx, dy, cx, cy],
    [ax, ay, m1x, m1y, m3x, m3y],
    [m3x, m3y, m2x, m2y, bx, by],
    [dx, dy, m1x, m1y, m3x, m3y],
    [m3x, m3y, m2x, m2y, dx, dy],
  ];
}

/** The 2 × 1 rectangle (two triangles), subdivided `levels` times. */
export function pinwheelPatch(levels: number): Tri[] {
  let tris: Tri[] = [[-1, -0.5, 1, -0.5, 1, 0.5], [1, 0.5, -1, 0.5, -1, -0.5]];
  for (let n = 0; n < levels; n++) tris = tris.flatMap(pinwheelChildren);
  return tris;
}

/** The direction of a tile's long edge (A→C), in [0, 2π). */
export const tileAngle = (t: Tri): number => { const a = Math.atan2(t[5] - t[1], t[4] - t[0]); return a < 0 ? a + 2 * Math.PI : a; };

const hue = (h: number): [number, number, number] => { // h in [0, 1): a bright rainbow for bloom
  const k = (n: number) => (n + h * 6) % 6, f = (n: number) => 1 - Math.max(0, Math.min(k(n), 4 - k(n), 1));
  return [f(5), f(3), f(1)];
};

class PinwheelArchetype implements Archetype {
  readonly id = 'pinwheel';
  readonly kind = 'flow' as const;
  readonly particleCount: number;
  readonly levels: number;
  readonly tiles: Tri[];
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly nLight: number; // the searchlight's own particles, at the end of the buffer (colours are fixed)
  private readonly byAngle: Int32Array; private readonly sortedAngle: Float64Array; // tiles in order of direction
  private speed = 1; private t = 0;

  constructor(config: ArchetypeConfig) {
    const rng = mulberry32((config.seed ^ 0x7feb352d) >>> 0);
    this.levels = Math.round(config.params.levels ?? 5);
    this.tiles = pinwheelPatch(this.levels);
    const N = Math.max(4096, config.particleCount);
    this.particleCount = N;
    this.positions = new Float32Array(N * 3); this.colors = new Float32Array(N * 3);
    const col = this.colors;
    this.nLight = Math.floor(N * 0.18);
    const ringShare = Math.min(this.tiles.length * 4, Math.floor(N * 0.1)); // ring dots, up to four per tile
    const edgeBudget = N - ringShare - this.nLight, per = Math.max(1, Math.floor(edgeBudget / (this.tiles.length * 3)));
    let idx = 0;
    for (const tri of this.tiles) {
      const a = tileAngle(tri), [r, g, b] = hue(a / (2 * Math.PI));
      const pts: [number, number][] = [[tri[0], tri[1]], [tri[2], tri[3]], [tri[4], tri[5]]];
      for (let e = 0; e < 3; e++) {
        const P = pts[e], Q = pts[(e + 1) % 3];
        for (let p = 0; p < per && idx < edgeBudget; p++, idx++) {
          const f = (p + rng() * 0.3) / per, o = idx * 3;
          this.positions[o] = CX + (P[0] + (Q[0] - P[0]) * f) * PATCH_W; this.positions[o + 1] = (P[1] + (Q[1] - P[1]) * f) * PATCH_W;
          col[o] = 0.15 + 0.85 * r; col[o + 1] = 0.15 + 0.85 * g; col[o + 2] = 0.15 + 0.85 * b;
        }
      }
    }
    for (; idx < edgeBudget; idx++) this.positions[idx * 3 + 1] = -46; // spare budget off-frame, dark
    for (let k = 0; k < ringShare; k++, idx++) { // the ring: one dot per tile at its angle (several particles a tile at low levels)
      const tri = this.tiles[k % this.tiles.length], a = tileAngle(tri), [r, g, b] = hue(a / (2 * Math.PI)), rr = RING_R * (1 + (rng() - 0.5) * 0.05), o = idx * 3;
      this.positions[o] = RING_X + rr * Math.cos(a); this.positions[o + 1] = rr * Math.sin(a);
      col[o] = 0.4 + 2 * r; col[o + 1] = 0.4 + 2 * g; col[o + 2] = 0.4 + 2 * b;
    }
    for (; idx < N; idx++) { const o = idx * 3; col[o] = 1.9; col[o + 1] = 1.75; col[o + 2] = 1.45; } // the searchlight: warm white
    const order = this.tiles.map((t, i) => [tileAngle(t), i] as const).sort((p, q) => p[0] - q[0]);
    this.byAngle = Int32Array.from(order, (o) => o[1]); this.sortedAngle = Float64Array.from(order, (o) => o[0]);
    this.readParams(config.params);
    this.shade();
  }

  private readParams(p: ResolvedParams): void { this.speed = p.speed ?? 1; }

  private shade(): void { // the searchlight: its particles go onto the edges of every tile within 2° of its angle
    const pos = this.positions, start = this.particleCount - this.nLight, W = (2 * Math.PI) / 180;
    const sweep = (this.t * this.speed * 0.35) % (2 * Math.PI), lit: number[] = [];
    if (this.speed > 0) {
      for (let k = 0; k < this.sortedAngle.length; k++) { let d = Math.abs(this.sortedAngle[k] - sweep); if (d > Math.PI) d = 2 * Math.PI - d; if (d < W) lit.push(this.byAngle[k]); }
    }
    const per = lit.length ? Math.max(3, Math.floor(this.nLight / lit.length)) : 0;
    for (let j = 0; j < this.nLight; j++) {
      const o = (start + j) * 3, which = per ? Math.floor(j / per) : lit.length;
      if (which >= lit.length) { pos[o] = 0; pos[o + 1] = -46; pos[o + 2] = 0; continue; }
      const t = this.tiles[lit[which]], f = ((j % per) / per) * 3, e = Math.floor(f), u = f - e;
      const x0 = t[e * 2], y0 = t[e * 2 + 1], x1 = t[((e + 1) % 3) * 2], y1 = t[((e + 1) % 3) * 2 + 1];
      pos[o] = CX + (x0 + (x1 - x0) * u) * PATCH_W; pos[o + 1] = (y0 + (y1 - y0) * u) * PATCH_W; pos[o + 2] = 0.01;
    }
  }

  step(dt: number, p: ResolvedParams): void {
    this.readParams(p);
    this.t += dt;
    this.shade();
  }

  readPositions(): Float32Array { return this.positions; }
  readColors(): Float32Array { return this.colors; }
  readState(): Float64Array { return new Float64Array([this.t]); }
  loadState(s: Float64Array): void { this.t = s[0] ?? 0; this.shade(); }
  getHierarchy(): NodeSpec[] {
    return [{ id: 'root', parentId: null, label: `pinwheel tiling · ${this.levels} generations · ${this.tiles.length} tiles`, stateOffset: 0, stateLength: 1 }];
  }
  renderHint(): RenderHint { return { geometry: 'points', pointSize: 0.005 }; }
  dispose(): void { /* buffers GC with the instance */ }
}

export const pinwheelFactory: ArchetypeFactory = {
  id: 'pinwheel',
  label: 'Pinwheel Tiling',
  category: 'Tiling',
  kind: 'flow',
  params: [
    { key: 'levels', label: 'generations', min: 1, max: 6, step: 1, default: 5, rebuild: true },
    { key: 'speed', label: 'searchlight', min: 0, max: 3, step: 0.05, default: 1 },
  ],
  defaultParticleCount: 160_000,
  particleCountOptions: [160_000],
  defaultDt: 0.016,
  defaultTrail: 0,
  bloom: 0.5,
  create: (config) => new PinwheelArchetype(config),
};

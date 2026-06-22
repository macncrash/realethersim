import type {
  Archetype,
  ArchetypeConfig,
  ArchetypeFactory,
  NodeSpec,
  ParamSpec,
  RenderHint,
  ResolvedParams,
} from '../core/archetype';
import { hslToRgb } from '../core/color';
import { mulberry32, type Rng } from '../state/rng';

// Diffusion-Limited Aggregation: random-walking "dust" particles wander a toroidal grid until they
// touch the growing cluster, then freeze in place. Starting from a single seed, this builds a
// branching, self-similar dendrite (fractal dimension ≈ 1.71) — the pattern behind coral, lightning,
// frost, and mineral deposits. The cluster is the grid; walkers are invisible drivers. Stuck cells
// are lifted into the render plane (empty cells hidden below), so growth shows via position — which
// works on the CPU path even though colours upload only once (coloured by radius: core → tips).
const EXTENT = 3;
const TAU = Math.PI * 2;
const LAUNCH = 0.46; // walkers respawn within this fraction of W around centre (near the frontier)
const HIDDEN_Y = -30; // empty cells parked below the camera (off-screen, |y| stays render-bounded)
const NEI = [
  [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1],
];

const PARAM_SPEC: ParamSpec[] = [
  { key: 'stickiness', label: 'stickiness', min: 0.05, max: 1, step: 0.05, default: 1 },
  { key: 'walkers', label: 'walkers', min: 2000, max: 40000, step: 1000, default: 8000, options: { '4k': 4000, '8k': 8000, '16k': 16000 }, rebuild: true },
];

class DlaArchetype implements Archetype {
  readonly kind = 'flow' as const;
  readonly particleCount: number;
  readonly id = 'dla';

  private readonly W: number;
  private readonly M: number; // walker count
  private readonly grid: Float32Array; // 0 empty, 1 stuck
  private readonly walk: Float64Array; // walker x,y (grid coords)
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly rng: Rng;

  constructor(config: ArchetypeConfig) {
    const w = Math.max(64, Math.round(Math.sqrt(config.particleCount)));
    this.W = w;
    this.particleCount = w * w;
    this.M = Math.max(1000, Math.round(config.params.walkers ?? 8000));
    this.grid = new Float32Array(w * w);
    this.walk = new Float64Array(this.M * 2);
    this.positions = new Float32Array(w * w * 3);
    this.colors = new Float32Array(w * w * 3);
    this.rng = mulberry32(config.seed);

    this.grid[(w >> 1) * w + (w >> 1)] = 1; // seed at centre
    for (let i = 0; i < this.M; i++) this.respawn(i);

    // Static colours by radius from centre (core warm → tips cool); revealed as cells become stuck.
    const cx = w / 2;
    const maxR = w * 0.5;
    for (let y = 0; y < w; y++) {
      for (let x = 0; x < w; x++) {
        const r = Math.min(1, Math.hypot(x - cx, y - cx) / maxR);
        hslToRgb(0.08 + 0.62 * r, 0.85, 0.6, this.colors, (y * w + x) * 3);
      }
    }
    this.syncPositions();
  }

  private respawn(i: number): void {
    // Launch within a disk around centre (near the growing cluster) so growth is both fast and
    // sparse — the condition for branching DLA dendrites rather than a solid blob.
    const a = this.rng() * TAU;
    const rad = Math.sqrt(this.rng()) * LAUNCH * this.W;
    const w = this.W;
    this.walk[i * 2] = (((w / 2 + Math.cos(a) * rad) % w) + w) % w;
    this.walk[i * 2 + 1] = (((w / 2 + Math.sin(a) * rad) % w) + w) % w;
  }

  step(_dt: number, p: ResolvedParams): void {
    const w = this.W;
    const g = this.grid;
    const walk = this.walk;
    const rng = this.rng;
    const stick = p.stickiness ?? 1;

    for (let i = 0; i < this.M; i++) {
      let wx = walk[i * 2] | 0;
      let wy = walk[i * 2 + 1] | 0;
      const ci = wy * w + wx;
      if (g[ci] > 0) {
        this.respawn(i);
        continue;
      }
      let adj = false;
      for (let k = 0; k < 8; k++) {
        const nx = (wx + NEI[k][0] + w) % w;
        const ny = (wy + NEI[k][1] + w) % w;
        if (g[ny * w + nx] > 0) {
          adj = true;
          break;
        }
      }
      if (adj && rng() < stick) {
        g[ci] = 1;
        this.respawn(i);
        continue;
      }
      const dir = (rng() * 8) | 0;
      wx = (wx + NEI[dir][0] + w) % w;
      wy = (wy + NEI[dir][1] + w) % w;
      walk[i * 2] = wx;
      walk[i * 2 + 1] = wy;
    }
    this.syncPositions();
  }

  private syncPositions(): void {
    const w = this.W;
    const g = this.grid;
    const pos = this.positions;
    const cell = EXTENT / (w - 1);
    const half = EXTENT / 2;
    for (let i = 0; i < w * w; i++) {
      const o = i * 3;
      pos[o] = (i % w) * cell - half;
      pos[o + 1] = g[i] > 0 ? 0 : HIDDEN_Y;
      pos[o + 2] = ((i / w) | 0) * cell - half;
    }
  }

  readPositions(): Float32Array {
    return this.positions;
  }
  readColors(): Float32Array {
    return this.colors;
  }
  readState(): Float64Array {
    return Float64Array.from(this.grid);
  }
  loadState(s: Float64Array): void {
    this.grid.set(s.subarray(0, this.grid.length));
    this.syncPositions();
  }
  getHierarchy(): NodeSpec[] {
    return [{ id: 'root', parentId: null, label: `DLA ${this.W}² (${this.M} walkers)`, stateOffset: 0, stateLength: this.particleCount }];
  }
  renderHint(): RenderHint {
    return { geometry: 'points', pointSize: 0.02 };
  }
  dispose(): void {
    /* buffers GC with the instance */
  }
}

export const dlaFactory: ArchetypeFactory = {
  id: 'dla',
  label: 'Diffusion-Limited Aggregation',
  category: 'Fractal',
  kind: 'flow',
  params: PARAM_SPEC,
  defaultParticleCount: 16_384,
  particleCountOptions: [16_384, 40_000, 65_536],
  defaultDt: 0.016,
  create: (config) => new DlaArchetype(config),
};

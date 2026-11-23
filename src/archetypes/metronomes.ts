import type {
  Archetype,
  ArchetypeConfig,
  ArchetypeFactory,
  NodeSpec,
  RenderHint,
  ResolvedParams,
} from '../core/archetype';
import { hslToRgb } from '../core/color';
import { mulberry32 } from '../state/rng';
import { Freedom, Headings, MetronomeRig, SPACING, type RigParams } from './metronomeRig';

// Huygens' Metronomes — spontaneous synchronisation you can walk around. In 1665 Christiaan Huygens, ill
// in bed, noticed that two pendulum clocks hanging from the same beam always ended up swinging exactly
// opposite each other, whatever he did to disturb them. The clocks were "talking" through tiny motions of
// the beam. Put metronomes on a board that can roll, and the same quiet conversation pulls dozens of them
// from a clatter into one beat. Nothing connects them but the platform: every swing nudges it, and its
// motion nudges every pendulum back. Here up to 400 metronomes stand on a platform that can roll one way,
// slide any way, spin on a pin, or slide and spin, and the knobs set what decides whether they agree:
// how heavy and how sticky the platform is, how mistuned the metronomes are, their tempo, how hard the
// escapements drive, and which ways they face. Above the platform, a phase ring shows every metronome's
// place in its swing, in a frame turning with the average one, so a synchronised crowd stands still in a
// clump; the arrow is the Kuramoto order parameter r, and the chart records r (in step) and r₂ (in step
// or exactly opposite). The platform shakes only a few millimetres, so the shake is magnified until it
// spans about 3% of the platform's width (×6 for the default hundred, nearly true size for two); the
// pendulum swings are true. Mechanics: metronomeRig.ts (Pantaleone 2002, generalised to three platform
// degrees of freedom; RK4 with the platform's accelerations solved exactly at every stage).

// The platform shakes about ±6 mm whatever its size, so the shake is drawn as a share of the platform's
// width: magnified until it spans about ±3% of it, and never shrunk below true size.
const SHAKE_FRAC = 0.03;
const SHAKE_REF = 0.0062; // m, the shake of a synchronised crowd at the default tempo
const PLATE_T = 0.045; // render thickness of the plate; it hangs below y = 0, the rollers sit under it
const WIDTH = 2.3; // render width of the largest platform side
const RING_R = 0.42;
const HIST = 400; // chart samples
const HIST_DT = 0.25; // seconds of sim time per chart sample

const hsl = (h: number, s: number, l: number): [number, number, number] => {
  const o = new Float32Array(3); hslToRgb(((h % 1) + 1) % 1, s, l, o, 0); return [o[0], o[1], o[2]];
};

class MetronomesArchetype implements Archetype {
  readonly id = 'metronomes';
  readonly kind = 'flow' as const;
  readonly particleCount: number;
  readonly rig: MetronomeRig;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private speed = 1;
  // Geometry, render space. The platform's top is at y = 0; physics (x, y) maps to render (x, z).
  private readonly sp: number; // render spacing between metronomes
  private readonly unitsPerM: number;
  private readonly caseH: number;
  private readonly rollerR = 0.07;
  private readonly floorY: number;
  // Particle ranges
  private readonly plat0: number; private readonly plat1: number; // fixed to the platform (cases, plate)
  private readonly platLocal: Float32Array;
  private readonly sw0: number; private readonly sw1: number; // on the pendulum rods: metronome, along rod, across, out
  private readonly swM: Int32Array; private readonly swR: Float32Array; private readonly swP: Float32Array; private readonly swN: Float32Array;
  private readonly roll0: number; private readonly roll1: number; private readonly rollS: Float32Array; private readonly rollA: Float32Array; private readonly rollX: Float32Array; // rollers: along z, angle, which roller x
  private readonly ball0: number; private readonly ball1: number; private readonly ballLocal: Float32Array; // four ball casters, offsets from each centre
  private readonly pin0: number; private readonly pin1: number;
  private readonly dot0: number; private readonly dotK: number; private readonly dotJ: Float32Array;
  private readonly arrow0: number; private readonly arrow1: number;
  private readonly hist0: number; private readonly histR = new Float32Array(HIST); private readonly histR2 = new Float32Array(HIST); private histN = 0; private histAcc = 0;
  private readonly pivotA: Float32Array; private readonly pivotN: Float32Array; private readonly pivotY: number; private readonly rodL: number;
  private readonly prevPh: Float64Array; private ref = 0; // the frame turning with the average metronome
  private readonly panelZ: number; private readonly panelY: number; private readonly ringX: number; private readonly chartX0: number; private readonly chartX1: number;
  private r = 0; private r2 = 0;
  private zoom = 1; // how much larger the platform's shake is drawn
  private readonly drift = new Float64Array(3); // the platform's slow drift (X, Y, φ), followed over a few seconds and drawn true size

  constructor(config: ArchetypeConfig) {
    const p = config.params, rng = mulberry32((config.seed ^ 0x51ed270b) >>> 0);
    const n = Math.round(p.count ?? 100), headings = Math.round(p.headings ?? 0);
    this.rig = new MetronomeRig(n, headings, rng, this.rigParams(p));
    const { cols, rows } = this.rig;
    this.sp = Math.min(0.5, WIDTH / Math.max(cols, rows));
    this.unitsPerM = this.sp / SPACING;
    this.caseH = 1.45 * this.sp;
    this.floorY = -PLATE_T - 2 * this.rollerR;
    this.zoom = Math.max(1, (SHAKE_FRAC * Math.max(cols, rows) * SPACING) / SHAKE_REF);
    const N = Math.max(60_000, config.particleCount);
    this.particleCount = N;
    this.positions = new Float32Array(N * 3); this.colors = new Float32Array(N * 3);
    const pos = this.positions, col = this.colors;
    const setC = (i: number, c: [number, number, number], k = 1) => { col[i * 3] = c[0] * k; col[i * 3 + 1] = c[1] * k; col[i * 3 + 2] = c[2] * k; };
    const Wx = cols * this.sp, Wz = rows * this.sp;
    this.panelZ = -(Wz / 2 + 0.55); this.panelY = this.caseH * 1.25 + RING_R + 0.25;
    this.ringX = -0.95; this.chartX0 = -0.35; this.chartX1 = 1.45;

    // Colours: what clusters together should look alike. Aligned: by where it stands (opposite sides,
    // opposite hues); crossed: warm for one heading, cool for the other; random: by heading.
    const hue = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const az = Math.atan2(this.rig.py[i], this.rig.px[i]) / (2 * Math.PI);
      hue[i] = headings === Headings.Random ? Math.atan2(this.rig.uy[i], this.rig.ux[i]) / (2 * Math.PI)
        : headings === Headings.Crossed ? (Math.abs(this.rig.ux[i]) > 0.5 ? 0.06 + 0.08 * az : 0.55 + 0.08 * az) : az;
    }

    // Budget
    const fixedBudget = 34_000 + 24 * n;
    const perMetro = Math.max(120, Math.floor((N - fixedBudget) / n));
    const caseShare = Math.floor(perMetro * 0.62), rodShare = Math.floor(perMetro * 0.14), weightShare = perMetro - caseShare - rodShare;

    // --- platform-fixed particles: plate, then the cases ---
    let idx = 0;
    this.plat0 = 0;
    const local: number[] = [];
    const steel: [number, number, number] = [0.42, 0.45, 0.5];
    const plateT = PLATE_T, margin = this.sp * 0.35, Px = Wx / 2 + margin, Pz = Wz / 2 + margin;
    const plateCount = 9000;
    for (let k = 0; k < plateCount; k++, idx++) {
      const u = rng(), v = rng();
      let x: number, y: number, z: number;
      if (k < plateCount * 0.45) { x = (u * 2 - 1) * Px; z = (v * 2 - 1) * Pz; y = -0.002; } // top
      else { // edges and the slab's sides
        const per = 2 * (Px + Pz), s = u * per * 2; const t = s % per;
        if (t < 2 * Px) { x = -Px + t; z = s < per ? -Pz : Pz; } else { x = s < per ? -Px : Px; z = -Pz + (t - 2 * Px); }
        y = -v * plateT;
      }
      local.push(x, y, z); setC(idx, steel, k < plateCount * 0.45 ? 0.35 : 0.9);
    }
    const brass: [number, number, number] = [0.85, 0.66, 0.32];
    this.pivotA = new Float32Array(n * 2); this.pivotN = new Float32Array(n * 2); // swing axis a, face normal n (render x, z)
    const bw = 0.72 * this.sp, bd = 0.56 * this.sp, tw = 0.26 * this.sp, td = 0.28 * this.sp, H = this.caseH;
    this.pivotY = 0.16 * H; this.rodL = 1.0 * H;
    for (let i = 0; i < n; i++) {
      const cx = this.rig.px[i] * this.unitsPerM, cz = this.rig.py[i] * this.unitsPerM;
      const ax = this.rig.ux[i], az = this.rig.uy[i], nx = -az, nz = ax;
      this.pivotA[i * 2] = ax; this.pivotA[i * 2 + 1] = az; this.pivotN[i * 2] = nx; this.pivotN[i * 2 + 1] = nz;
      for (let k = 0; k < caseShare; k++, idx++) {
        // a frustum: its eight edges bright, its faces filled and shaded as if lit from the front left
        const h = k % 4 === 0 ? Math.floor(rng() * 2) : rng(), w = bw + (tw - bw) * h, d = bd + (td - bd) * h, y = h * H;
        let a: number, b: number, shade: number;
        if (k % 4 === 0) { const s2 = rng() - 0.5; if (rng() < 0.5) { a = s2 * w; b = (rng() < 0.5 ? 0.5 : -0.5) * d; } else { a = (rng() < 0.5 ? 0.5 : -0.5) * w; b = s2 * d; } shade = 0.95; } // top and bottom rims
        else if (k % 4 === 1) { const e = Math.floor(rng() * 4); a = (e & 1 ? 0.5 : -0.5) * w; b = (e & 2 ? 0.5 : -0.5) * d; shade = 0.95; } // the four slanted edges
        else { const f = Math.floor(rng() * 4), s2 = rng() - 0.5; if (f < 2) { a = s2 * w; b = (f ? 0.5 : -0.5) * d; shade = f ? 0.55 : 0.22; } else { a = (f === 3 ? 0.5 : -0.5) * w; b = s2 * d; shade = f === 3 ? 0.3 : 0.42; } } // faces: front, back, sides
        local.push(cx + a * ax + b * nx, y, cz + a * az + b * nz);
        setC(idx, brass, shade);
      }
      for (let k = 0; k < 24; k++, idx++) { // the tempo scale on the front face, behind the rod
        const y = H * (0.3 + 0.6 * (k / 23)), d = bd + (td - bd) * (y / H);
        local.push(cx + (rng() - 0.5) * 0.08 * this.sp * ax + (0.5 * d + 0.003) * nx, y, cz + (rng() - 0.5) * 0.08 * this.sp * az + (0.5 * d + 0.003) * nz);
        setC(idx, [0.95, 0.9, 0.75], 0.6);
      }
    }
    this.plat1 = idx;
    this.platLocal = Float32Array.from(local);

    // --- pendulum rods and their sliding weights ---
    this.sw0 = idx;
    const swCount = n * (rodShare + weightShare);
    this.swM = new Int32Array(swCount); this.swR = new Float32Array(swCount); this.swP = new Float32Array(swCount); this.swN = new Float32Array(swCount);
    let q = 0;
    const silver: [number, number, number] = [0.85, 0.88, 0.95];
    for (let i = 0; i < n; i++) {
      const c = hsl(hue[i], 0.85, 0.6);
      for (let k = 0; k < rodShare; k++, q++, idx++) { this.swM[q] = i; this.swR[q] = -0.08 * this.rodL + rng() * 1.08 * this.rodL; this.swP[q] = (rng() - 0.5) * 0.006; this.swN[q] = 0.012 * this.sp; setC(idx, silver, 0.4); }
      for (let k = 0; k < weightShare; k++, q++, idx++) { // a small block two-thirds up the rod
        this.swM[q] = i; this.swR[q] = 0.62 * this.rodL + (rng() - 0.5) * 0.14 * this.sp; this.swP[q] = (rng() - 0.5) * 0.12 * this.sp; this.swN[q] = 0.012 * this.sp + rng() * 0.06 * this.sp; setC(idx, c, 1.5);
      }
    }
    this.sw1 = idx;

    // --- rollers (rolls), ball casters (slides), a pin (spins) ---
    this.roll0 = idx;
    const rollCount = 5000; this.rollS = new Float32Array(rollCount); this.rollA = new Float32Array(rollCount); this.rollX = new Float32Array(rollCount);
    for (let k = 0; k < rollCount; k++, idx++) {
      const stripe = k % 5 === 0;
      this.rollS[k] = (rng() * 2 - 1) * (Pz + 0.05);
      this.rollA[k] = stripe ? Math.floor(rng() * 3) * ((2 * Math.PI) / 3) : rng() * 2 * Math.PI;
      this.rollX[k] = (k & 1 ? 1 : -1) * Px * 0.62;
      setC(idx, stripe ? [0.9, 0.9, 0.95] : [0.35, 0.37, 0.42], stripe ? 1 : 0.8);
    }
    this.roll1 = idx;
    this.ball0 = idx;
    const ballCount = 2400; this.ballLocal = new Float32Array(ballCount * 3);
    for (let k = 0; k < ballCount; k++, idx++) {
      const c = k % 4, z = rng() * 2 - 1, t = rng() * 2 * Math.PI, s = Math.sqrt(1 - z * z), R = this.rollerR;
      this.ballLocal[k * 3] = (c & 1 ? 1 : -1) * Px * 0.75 + R * s * Math.cos(t); this.ballLocal[k * 3 + 1] = -PLATE_T - R + R * z; this.ballLocal[k * 3 + 2] = (c & 2 ? 1 : -1) * Pz * 0.75 + R * s * Math.sin(t);
      setC(idx, [0.6, 0.62, 0.7], 0.7);
    }
    this.ball1 = idx;
    this.pin0 = idx;
    for (let k = 0; k < 900; k++, idx++) { const t = rng() * 2 * Math.PI, y = this.floorY + rng() * (-this.floorY); pos[idx * 3] = 0.05 * Math.cos(t); pos[idx * 3 + 1] = y; pos[idx * 3 + 2] = 0.05 * Math.sin(t); setC(idx, [0.75, 0.75, 0.8], 0.8); }
    this.pin1 = idx;

    // --- the floor: a faint grid, so the platform's motion has something to be measured against ---
    const gridR = 2.8;
    for (let k = 0; k < 9000; k++, idx++) {
      const line = Math.round((rng() * 2 - 1) * 11) * 0.25, s = (rng() * 2 - 1) * gridR;
      const o = idx * 3; if (k & 1) { pos[o] = line; pos[o + 2] = s; } else { pos[o] = s; pos[o + 2] = line; } pos[o + 1] = this.floorY;
      setC(idx, [0.25, 0.3, 0.4], 0.45);
    }

    // --- the phase panel: a ring of dots, the order-parameter arrow, and the sync chart ---
    for (let k = 0; k < 900; k++, idx++) { // ring and its top tick
      const t = (k / 900) * 2 * Math.PI, o = idx * 3;
      pos[o] = this.ringX + RING_R * Math.sin(t); pos[o + 1] = this.panelY + RING_R * Math.cos(t); pos[o + 2] = this.panelZ;
      setC(idx, [0.4, 0.5, 0.65], 0.5);
    }
    this.dot0 = idx; this.dotK = 5; this.dotJ = new Float32Array(n * this.dotK * 2);
    for (let i = 0; i < n; i++) {
      const c = hsl(hue[i], 0.9, 0.6);
      for (let k = 0; k < this.dotK; k++, idx++) { this.dotJ[(i * this.dotK + k) * 2] = (rng() - 0.5) * 0.02; this.dotJ[(i * this.dotK + k) * 2 + 1] = (rng() - 0.5) * 0.02; setC(idx, c, 1.6); }
    }

    this.arrow0 = idx;
    for (let k = 0; k < 240; k++, idx++) setC(idx, [1.6, 1.55, 1.4]);
    this.arrow1 = idx;
    for (let k = 0; k < 1200; k++, idx++) { // chart axes: zero line, the r = 1 line dotted, a left edge
      const o = idx * 3, f = k / 1200, w = this.chartX1 - this.chartX0;
      if (k < 500) { pos[o] = this.chartX0 + f * 2.4 * w; pos[o + 1] = this.panelY - RING_R; }
      else if (k < 1000) { pos[o] = this.chartX0 + ((k - 500) / 500) * w; pos[o + 1] = (k & 4) ? this.panelY + RING_R : 9999; }
      else { pos[o] = this.chartX0; pos[o + 1] = this.panelY - RING_R + ((k - 1000) / 200) * 2 * RING_R; }
      if (pos[o + 1] === 9999) { pos[o + 1] = -46; } pos[o + 2] = this.panelZ;
      setC(idx, [0.4, 0.5, 0.65], 0.45);
    }
    this.hist0 = idx;
    for (let k = 0; k < HIST * 3; k++, idx++) setC(idx, [1.5, 1.4, 1.1]); // r: warm, two particles a sample
    for (let k = 0; k < HIST * 2; k++, idx++) setC(idx, [0.35, 0.7, 1.2]); // r₂: blue
    for (let k = idx * 3; k < N * 3; k += 3) pos[k + 1] = -46; // spare budget out of sight
    for (let k = this.hist0; k < idx; k++) pos[k * 3 + 1] = -46;

    this.prevPh = new Float64Array(n);
    for (let i = 0; i < n; i++) this.prevPh[i] = this.rig.phase(i);
    this.ref = this.rig.order().psi;
    this.readParams(p);
    this.layout();
  }

  private rigParams(p: ResolvedParams): RigParams {
    return { bpm: p.bpm ?? 144, spread: p.spread ?? 0.5, platformMass: p.platformMass ?? 0.3, friction: p.friction ?? 0.1, drive: p.drive ?? 0.1, freedom: Math.round(p.freedom ?? 0) };
  }

  private readParams(p: ResolvedParams): void {
    this.speed = p.speed ?? 1;
    const rp = this.rigParams(p), was = this.rig.p.freedom;
    this.rig.setParams(rp);
    if (rp.freedom !== was) { // a newly locked degree of freedom stops, and stays where it is
      const [fx, fy, fp] = this.rig.free(), b = 2 * this.rig.n;
      if (!fx) this.rig.s[b + 3] = 0; if (!fy) this.rig.s[b + 4] = 0; if (!fp) this.rig.s[b + 5] = 0;
    }
  }

  step(dt: number, p: ResolvedParams): void {
    this.readParams(p);
    const T = dt * this.speed;
    if (T <= 0) return;
    this.rig.advance(T);
    // the frame turning with the average metronome: add the mean phase advance
    const n = this.rig.n; let acc = 0;
    for (let i = 0; i < n; i++) { const ph = this.rig.phase(i); let d = ph - this.prevPh[i]; d -= 2 * Math.PI * Math.round(d / (2 * Math.PI)); acc += d; this.prevPh[i] = ph; }
    this.ref += acc / n;
    const o = this.rig.order(); this.r = o.r;
    let c2 = 0, s2 = 0; for (let i = 0; i < n; i++) { const ph = 2 * this.prevPh[i]; c2 += Math.cos(ph); s2 += Math.sin(ph); } this.r2 = Math.hypot(c2, s2) / n;
    // steer the frame so one clump settles at the top, or a pair of opposite clumps top and bottom
    const target = this.r >= this.r2 ? o.psi : Math.atan2(s2, c2) / 2, period = this.r >= this.r2 ? 2 * Math.PI : Math.PI;
    let lag = target - this.ref; lag -= period * Math.round(lag / period);
    this.ref += lag * Math.max(this.r, this.r2) * Math.min(1, T / 2);
    const b = 2 * n, k = Math.min(1, T / 3);
    for (let j = 0; j < 3; j++) this.drift[j] += (this.rig.s[b + j] - this.drift[j]) * k;
    this.histAcc += T;
    while (this.histAcc >= HIST_DT) {
      this.histAcc -= HIST_DT;
      if (this.histN < HIST) { this.histR[this.histN] = this.r; this.histR2[this.histN] = this.r2; this.histN++; }
      else { this.histR.copyWithin(0, 1); this.histR2.copyWithin(0, 1); this.histR[HIST - 1] = this.r; this.histR2[HIST - 1] = this.r2; }
    }
    this.layout();
  }

  private layout(): void {
    const pos = this.positions, rig = this.rig, n = rig.n, b = 2 * n, Z = this.zoom * this.unitsPerM;
    // only the shake is magnified; the slow drift it rides on is drawn true size
    const d = this.drift, U = this.unitsPerM;
    const X = (rig.s[b] - d[0]) * Z + d[0] * U, Zp = (rig.s[b + 1] - d[1]) * Z + d[1] * U, phi = (rig.s[b + 2] - d[2]) * this.zoom + d[2], c = Math.cos(phi), s = Math.sin(phi);
    // physics y → render z; a turn φ (anticlockwise seen from above in physics) turns render (x, z) the same way
    const tx = (x: number, z: number) => X + c * x - s * z, tz = (x: number, z: number) => Zp + s * x + c * z;
    for (let k = this.plat0, j = 0; k < this.plat1; k++, j += 3) {
      const x = this.platLocal[j], z = this.platLocal[j + 2], o = k * 3;
      pos[o] = tx(x, z); pos[o + 1] = this.platLocal[j + 1]; pos[o + 2] = tz(x, z);
    }
    for (let q = 0, k = this.sw0; k < this.sw1; k++, q++) {
      const i = this.swM[q], th = rig.s[i], st = Math.sin(th), ct = Math.cos(th);
      const ax = this.pivotA[i * 2], az = this.pivotA[i * 2 + 1], nx = this.pivotN[i * 2], nz = this.pivotN[i * 2 + 1];
      // the visible rod sits above the pivot, so it leans opposite to the hidden bob below (θ > 0: bob towards +a)
      const r = this.swR[q], w = this.swP[q], along = -st * r + ct * w, up = ct * r + st * w, out = this.swN[q] + 0.3 * this.sp;
      const lx = rig.px[i] * this.unitsPerM + along * ax + out * nx, lz = rig.py[i] * this.unitsPerM + along * az + out * nz, o = k * 3;
      pos[o] = tx(lx, lz); pos[o + 1] = this.pivotY + up; pos[o + 2] = tz(lx, lz);
    }
    const [fx, fy, fp] = rig.free(), rolls = fx && !fy && !fp, balls = fy, pin = fp && !fx;
    // rollers roll without slipping between floor and plate: their axles move half as far as the platform,
    // and they turn by X / 2R, top moving with the plate (a = 0 is the top; +a carries it towards +x)
    const turn = (X / 2) / this.rollerR;
    for (let q = 0, k = this.roll0; k < this.roll1; k++, q++) {
      const o = k * 3;
      if (!rolls) { pos[o + 1] = -46; continue; }
      const a = this.rollA[q] + turn;
      pos[o] = this.rollX[q] + X / 2 + this.rollerR * Math.sin(a); pos[o + 1] = -PLATE_T - this.rollerR + this.rollerR * Math.cos(a); pos[o + 2] = this.rollS[q];
    }
    for (let q = 0, k = this.ball0; k < this.ball1; k++, q++) {
      const o = k * 3;
      if (!balls) { pos[o + 1] = -46; continue; }
      pos[o] = this.ballLocal[q * 3] + X / 2; pos[o + 1] = this.ballLocal[q * 3 + 1]; pos[o + 2] = this.ballLocal[q * 3 + 2] + Zp / 2;
    }
    for (let k = this.pin0; k < this.pin1; k++) { const o = k * 3; pos[o + 1] = pin ? this.floorY + ((k - this.pin0) / (this.pin1 - this.pin0)) * -this.floorY : -46; }

    // phase ring: each metronome at its phase relative to the average, the clump of a synchronised crowd at the top
    for (let i = 0; i < n; i++) {
      const a = this.prevPh[i] - this.ref;
      for (let k = 0; k < this.dotK; k++) {
        const j = (i * this.dotK + k) * 2, o = (this.dot0 + i * this.dotK + k) * 3, R = RING_R + this.dotJ[j];
        pos[o] = this.ringX + R * Math.sin(a) + this.dotJ[j + 1]; pos[o + 1] = this.panelY + R * Math.cos(a); pos[o + 2] = this.panelZ;
      }
    }
    const o = this.rig.order(), A = o.psi - this.ref;
    for (let k = this.arrow0; k < this.arrow1; k++) {
      const f = (k - this.arrow0) / (this.arrow1 - this.arrow0), R = f * o.r * RING_R, q = k * 3;
      pos[q] = this.ringX + R * Math.sin(A); pos[q + 1] = this.panelY + R * Math.cos(A); pos[q + 2] = this.panelZ;
    }
    const w = this.chartX1 - this.chartX0, y0 = this.panelY - RING_R, hgt = 2 * RING_R;
    for (let k = 0; k < HIST; k++) {
      const vis = k < this.histN, x = this.chartX0 + (k / (HIST - 1)) * w;
      for (let j = 0; j < 3; j++) { const q = (this.hist0 + k * 3 + j) * 3; pos[q] = x + (j - 1) * 0.0015; pos[q + 1] = vis ? y0 + this.histR[k] * hgt : -46; pos[q + 2] = this.panelZ; }
      for (let j = 0; j < 2; j++) { const q = (this.hist0 + HIST * 3 + k * 2 + j) * 3; pos[q] = x + (j - 0.5) * 0.002; pos[q + 1] = vis ? y0 + this.histR2[k] * hgt : -46; pos[q + 2] = this.panelZ + 0.001; }
    }
  }

  readPositions(): Float32Array { return this.positions; }
  readColors(): Float32Array { return this.colors; }
  readState(): Float64Array { const s = new Float64Array(this.rig.s.length + 1); s.set(this.rig.s); s[this.rig.s.length] = this.rig.t; return s; }
  loadState(st: Float64Array): void {
    if (st.length !== this.rig.s.length + 1) return;
    this.rig.s.set(st.subarray(0, this.rig.s.length)); this.rig.t = st[this.rig.s.length];
    for (let i = 0; i < this.rig.n; i++) this.prevPh[i] = this.rig.phase(i);
    this.ref = this.rig.order().psi; this.histN = 0; for (let j = 0; j < 3; j++) this.drift[j] = this.rig.s[2 * this.rig.n + j]; this.layout();
  }
  getHierarchy(): NodeSpec[] {
    return [{ id: 'root', parentId: null, label: `${this.rig.n} metronomes · in step r = ${this.r.toFixed(2)} · in step or opposite r₂ = ${this.r2.toFixed(2)}`, stateOffset: 0, stateLength: this.rig.s.length }];
  }
  renderHint(): RenderHint { return { geometry: 'points', pointSize: 0.006 }; }
  dispose(): void { /* buffers GC with the instance */ }
}

export const metronomesFactory: ArchetypeFactory = {
  id: 'metronomes',
  label: "Huygens' Metronomes",
  category: 'Oscillator',
  kind: 'flow',
  params: [
    { key: 'count', label: 'metronomes', min: 2, max: 400, step: 1, default: 100, rebuild: true },
    { key: 'bpm', label: 'tempo (bpm)', min: 40, max: 208, step: 1, default: 144 },
    { key: 'spread', label: 'tempo spread %', min: 0, max: 5, step: 0.05, default: 0.5 },
    { key: 'platformMass', label: 'platform mass ×', min: 0.05, max: 30, step: 0.05, default: 0.3 },
    { key: 'friction', label: 'platform friction', min: 0, max: 5, step: 0.05, default: 0.1 },
    { key: 'drive', label: 'escapement drive', min: 0, max: 0.5, step: 0.01, default: 0.1 },
    { key: 'freedom', label: 'platform', min: 0, max: 3, step: 1, default: Freedom.Roll, options: { 'rolls (x)': Freedom.Roll, 'slides (x, y)': Freedom.Slide, 'spins on a pin': Freedom.Spin, 'slides and spins': Freedom.SlideSpin } },
    { key: 'headings', label: 'facing', min: 0, max: 2, step: 1, default: Headings.Aligned, rebuild: true, options: { 'all the same way': Headings.Aligned, 'crossed (checkerboard)': Headings.Crossed, 'every which way': Headings.Random } },
    { key: 'speed', label: 'speed', min: 0, max: 4, step: 0.05, default: 1 },
  ],
  defaultParticleCount: 200_000,
  particleCountOptions: [120_000, 200_000, 320_000],
  defaultDt: 0.016,
  defaultTrail: 0,
  bloom: 0.45,
  clock: { scale: 1, unit: 's' },
  create: (config) => new MetronomesArchetype(config),
};

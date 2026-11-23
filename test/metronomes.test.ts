import { defaultParams } from '../src/core/archetype';
import { resolveParams } from '../src/core/params';
import { describe, expect, it } from 'vitest';
import { MetronomeRig, type RigParams } from '../src/archetypes/metronomeRig';
import { metronomesFactory } from '../src/archetypes/metronomes';
import { mulberry32 } from '../src/state/rng';

// Huygens' Metronomes: each result the Learn notes quote, pinned.

const base: RigParams = { bpm: 144, spread: 0.5, platformMass: 0.3, friction: 0.1, drive: 0.1, freedom: 0 };
const rig = (n: number, headings: number, over: Partial<RigParams>, T: number, seed = 1) => {
  const r = new MetronomeRig(n, headings, mulberry32(seed), { ...base, ...over });
  r.advance(T);
  return r;
};
const wrap = (a: number) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

describe("Huygens' metronomes", () => {
  it('the platform and pendulums together conserve momentum when nothing rubs', () => {
    const r = new MetronomeRig(9, 0, mulberry32(3), { ...base, friction: 0 });
    const p0 = r.momentumX();
    r.advance(20);
    expect(Math.abs(r.momentumX() - p0)).toBeLessThan(1e-9);
  });

  it('a hundred metronomes lock on a light platform, but not on a heavy one', () => {
    expect(rig(100, 0, {}, 120).order().r).toBeGreaterThan(0.97);
    expect(rig(100, 0, { platformMass: 30 }, 120).order().r).toBeLessThan(0.4);
  });

  it('too much mistuning, too slow a tempo, or too sticky a platform, and they never agree', () => {
    expect(rig(100, 0, { spread: 4 }, 120).order().r).toBeLessThan(0.4);
    expect(rig(100, 0, { bpm: 60 }, 120).order().r).toBeLessThan(0.4);
    expect(rig(100, 0, { friction: 2 }, 120).order().r).toBeLessThan(0.7);
  });

  it('two metronomes swing together on a free platform, and apart on a sticky one', () => {
    const free = rig(2, 0, { spread: 0.3, friction: 0 }, 300), sticky = rig(2, 0, { spread: 0.3, friction: 5 }, 300);
    expect(Math.abs(wrap(free.phase(0) - free.phase(1)))).toBeLessThan(0.1);
    expect(Math.abs(wrap(sticky.phase(0) - sticky.phase(1)))).toBeGreaterThan(Math.PI / 2);
  });

  it('a platform that can only spin splits the crowd into two halves swinging opposite', () => {
    const r = rig(100, 0, { freedom: 2 }, 150);
    const top = r.order((i) => r.py[i] > 0), bottom = r.order((i) => r.py[i] < 0);
    expect(top.r).toBeGreaterThan(0.8);
    expect(bottom.r).toBeGreaterThan(0.8);
    expect(Math.abs(wrap(top.psi - bottom.psi))).toBeGreaterThan(2.8);
    expect(r.order().r).toBeLessThan(0.2);
  });

  it('crossed metronomes on a sliding platform form two separate crowds', () => {
    const r = rig(100, 1, { freedom: 1 }, 150);
    expect(r.order((i) => Math.abs(r.ux[i]) > 0.7).r).toBeGreaterThan(0.95);
    expect(r.order((i) => Math.abs(r.uy[i]) > 0.7).r).toBeGreaterThan(0.95);
  });

  it('steps without NaN on every platform and facing', () => {
    for (const headings of [0, 1, 2]) for (const freedom of [0, 1, 2, 3]) {
      const p: Record<string, number> = { dt: 0.016 };
      for (const s of metronomesFactory.params) p[s.key] = s.default;
      Object.assign(p, { headings, freedom, count: 36, speed: 4 });
      const a = metronomesFactory.create({ particleCount: 120_000, seed: 2, params: p as never });
      for (let i = 0; i < 30; i++) a.step(0.016, p as never);
      expect(a.readPositions().every((x) => Number.isFinite(x))).toBe(true);
    }
  });

  it('draws rollers under the plate, rolling without slipping, and keeps the drawn shake small', () => {
    const params = resolveParams(defaultParams(metronomesFactory.params), 1 / 60);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = metronomesFactory.create({ particleCount: 120_000, seed: 5, params }) as any;
    const R: number = a.rollerR, q0: number = a.roll0, P0: number = a.plat0;
    const angle = (pos: Float32Array, plateX: number) => { // roller particle 0's angle about its axle (a = 0 at the top)
      const o = q0 * 3, axle = a.rollX[0] + plateX / 2; return Math.atan2(pos[o] - axle, pos[o + 1] - (a.floorY + R));
    };
    const plateX = (pos: Float32Array) => pos[P0 * 3] - a.platLocal[0]; // plate particle 0 is unrotated in roll mode
    let pos: Float32Array = a.readPositions(), px = plateX(pos), ang = angle(pos, px), worst = 0, lo = Infinity, hi = -Infinity, xMin = Infinity, xMax = -Infinity;
    for (let f = 0; f < 60 * 60; f++) {
      a.step(1 / 60, params);
      pos = a.readPositions();
      const x = plateX(pos), g = angle(pos, x);
      let dg = g - ang; dg -= 2 * Math.PI * Math.round(dg / (2 * Math.PI));
      worst = Math.max(worst, Math.abs(dg * 2 * R - (x - px))); // the top of the roller moves with the plate
      for (let k = a.roll0; k < a.roll1; k++) { lo = Math.min(lo, pos[k * 3 + 1]); hi = Math.max(hi, pos[k * 3 + 1]); }
      if (f > 50 * 60) { xMin = Math.min(xMin, x); xMax = Math.max(xMax, x); }
      px = x; ang = g;
    }
    expect(worst).toBeLessThan(1e-4);
    expect(hi).toBeLessThanOrEqual(-0.045 + 1e-6); // never pokes into the plate
    expect(lo).toBeGreaterThanOrEqual(a.floorY - 1e-6); // nor through the floor
    const width = a.rig.cols * a.sp;
    expect((xMax - xMin) / 2 / width).toBeLessThan(0.06); // locked crowd: the drawn shake is a few % of the width
  });
});

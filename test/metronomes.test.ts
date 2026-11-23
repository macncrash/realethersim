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
});

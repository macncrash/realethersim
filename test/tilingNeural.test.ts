import { describe, expect, it } from 'vitest';
import { multigridTiles, diffraction, quasicrystalFactory } from '../src/archetypes/quasicrystal';
import { pinwheelPatch, tileAngle, pinwheelFactory } from '../src/archetypes/pinwheel';
import { HopfieldNet, randomPatterns, pictures, hopfieldFactory } from '../src/archetypes/hopfield';
import { HHCable, endStimulus, axonFactory } from '../src/archetypes/axon';
import { mulberry32 } from '../src/state/rng';
import type { ArchetypeFactory } from '../src/core/archetype';

// The Tiling and Neural systems added in v0.1.106: each pins a result its Learn notes quote.

const make = (f: ArchetypeFactory, params: Record<string, number>, n = f.defaultParticleCount) => {
  const p: Record<string, number> = { dt: 0.016 };
  for (const s of f.params) p[s.key] = s.default;
  return f.create({ particleCount: n, seed: 1, params: { ...p, ...params, dt: 0.016 } });
};
const finite = (a: Float32Array) => a.every((x) => Number.isFinite(x));

describe('Quasicrystal multigrid', () => {
  it('Ammann–Beenker squares to rhombi closes on 1/√2', () => {
    const { rhombi } = multigridTiles(4, 30);
    let sq = 0, rh = 0;
    for (const r of rhombi) if (r.type === 2) sq++; else rh++;
    expect(Math.abs(sq / rh - Math.SQRT1_2)).toBeLessThan(0.01);
  });
  it('N grids make ⌊N/2⌋ shapes, with no repeated tile', () => {
    for (const N of [3, 4, 5, 6, 7]) {
      const { rhombi } = multigridTiles(N, 12);
      expect(new Set(rhombi.map((r) => r.type)).size).toBe(Math.floor(N / 2));
      expect(new Set(rhombi.map((r) => `${(r.corners[0][0] + r.corners[2][0]).toFixed(5)},${(r.corners[0][1] + r.corners[2][1]).toFixed(5)}`)).size).toBe(rhombi.length);
    }
  });
  it('the octagonal pattern is 8-fold, and its spots stay sharp as the window grows (Bragg peaks)', () => {
    const G = 151, K = 7.2, cell = (2 * K) / (G - 1);
    const top = (N: number, win: number) => {
      const { vx, vy } = multigridTiles(N, win * 2.6), I = diffraction(vx, vy, K, G, win);
      let m = 0, at = 0, all = 0; // m, at: the brightest spot whose 45° image is still on the grid; all: the brightest anywhere
      for (let q = 0; q < I.length; q++) { const a = q % G, b = (q / G) | 0; const k = Math.hypot(-K + a * cell, -K + b * cell); if (k > 0.6) all = Math.max(all, I[q]); if (k > 0.6 && k < 0.65 * K && I[q] > m) { m = I[q]; at = q; } }
      return { m, I, at, all };
    };
    const { m, I, at } = top(4, 11);
    const kx = -K + (at % G) * cell, ky = -K + ((at / G) | 0) * cell, c = Math.SQRT1_2;
    const near = (x: number, y: number) => { const a = Math.round((x + K) / cell), b = Math.round((y + K) / cell); let v = 0; for (let db = -1; db <= 1; db++) for (let da = -1; da <= 1; da++) v = Math.max(v, I[(b + db) * G + a + da]); return v; };
    expect(near(kx * c - ky * c, kx * c + ky * c) / m).toBeGreaterThan(0.9);
    expect(top(4, 14).all / top(4, 7).all).toBeGreaterThan(0.9);
    const rng = mulberry32(7), n = 900, rx = new Float64Array(n), ry = new Float64Array(n);
    for (let i = 0; i < n;) { const x = (rng() * 2 - 1) * 15, y = (rng() * 2 - 1) * 15; if (Math.hypot(x, y) < 15) { rx[i] = x; ry[i] = y; i++; } }
    const J = diffraction(rx, ry, K, G, 11);
    let r = 0; for (let q = 0; q < J.length; q++) { const a = q % G, b = (q / G) | 0; if (Math.hypot(-K + a * cell, -K + b * cell) > 0.6) r = Math.max(r, J[q]); }
    expect(r).toBeLessThan(0.05 * top(4, 11).all);
  });
  it('builds and steps at every symmetry, in both views', () => {
    for (const grids of [3, 4, 5, 6, 7]) {
      const a = make(quasicrystalFactory, { grids, view: 1 });
      for (let i = 0; i < 5; i++) a.step(0.016, { dt: 0.016, grids, view: 1, speed: 1 });
      expect(finite(a.readPositions())).toBe(true);
    }
  });
});

describe('Pinwheel tiling', () => {
  it('five similar children, area kept, and new directions every generation', () => {
    let last = 0;
    for (let L = 0; L <= 5; L++) {
      const T = pinwheelPatch(L), s = Math.sqrt(5) ** -L;
      let area = 0;
      const dirs = new Set<string>();
      for (const t of T) {
        expect(Math.hypot(t[2] - t[0], t[3] - t[1])).toBeCloseTo(2 * s, 12);
        expect(Math.hypot(t[4] - t[2], t[5] - t[3])).toBeCloseTo(s, 12);
        expect((t[0] - t[2]) * (t[4] - t[2]) + (t[1] - t[3]) * (t[5] - t[3])).toBeCloseTo(0, 12);
        area += Math.abs((t[2] - t[0]) * (t[5] - t[1]) - (t[4] - t[0]) * (t[3] - t[1])) / 2;
        dirs.add((tileAngle(t) % Math.PI).toFixed(6));
      }
      expect(T.length).toBe(2 * 5 ** L);
      expect(area).toBeCloseTo(2, 9);
      if (L > 0) expect(dirs.size).toBeGreaterThan(last);
      last = dirs.size;
    }
    expect(last).toBe(12);
  });
  it('steps without NaN', () => {
    const a = make(pinwheelFactory, { levels: 6 });
    for (let i = 0; i < 5; i++) a.step(0.016, { dt: 0.016, levels: 6, speed: 2 });
    expect(finite(a.readPositions()) && finite(a.readColors()!)).toBe(true);
  });
});

describe('Hopfield memory', () => {
  const recall = (P: number, noise: number, trials: number) => {
    const rng = mulberry32(1), net = new HopfieldNet(randomPatterns(P, rng), rng);
    let sum = 0, rises = 0;
    for (let t = 0; t < trials; t++) {
      const u = t % P;
      net.cue(u, noise);
      let e = net.energy();
      for (let s = 0; s < 40; s++) { const f = net.sweep(0); const e2 = net.energy(); if (e2 > e + 1e-9) rises++; e = e2; if (!f) break; }
      sum += net.m[u];
    }
    return { overlap: sum / trials, rises };
  };
  it('the overlap form is Hebb’s matrix exactly', () => {
    const rng = mulberry32(5), pats = randomPatterns(30, rng), net = new HopfieldNet(pats, rng);
    net.cue(0, 0.3);
    for (const i of [0, 17, 511, 1023]) {
      let h = 0;
      for (let j = 0; j < 1024; j++) { if (j === i) continue; let w = 0; for (const p of pats) w += p[i] * p[j]; h += (w / 1024) * net.s[j]; }
      expect(net.field(i)).toBeCloseTo(h, 12);
    }
  });
  it('recalls below capacity, collapses above it, and the energy never rises', () => {
    const low = recall(60, 0.2, 12), edge = recall(130, 0.2, 12), high = recall(200, 0.2, 12);
    expect(low.overlap).toBeGreaterThan(0.99);
    expect(edge.overlap).toBeGreaterThan(0.95);
    expect(high.overlap).toBeLessThan(0.5);
    expect(low.rises + edge.rises + high.rises).toBe(0);
  }, 60_000);
  it('the six pictures come back, imperfectly', () => {
    const rng = mulberry32(3), net = new HopfieldNet(pictures(), rng);
    for (let u = 0; u < 6; u++) { net.cue(u, 0.3); for (let s = 0; s < 40 && net.sweep(0); s++); expect(net.m[u]).toBeGreaterThan(0.75); }
  });
  it('steps without NaN', () => {
    const a = make(hopfieldFactory, { set: 0, patterns: 300 });
    for (let i = 0; i < 20; i++) a.step(0.016, { dt: 0.016, set: 0, patterns: 300, noise: 0.3, temperature: 0.3, speed: 4 });
    expect(finite(a.readPositions())).toBe(true);
  });
});

describe('Hodgkin–Huxley axon', () => {
  const run = (radius: number, temp: number, myelin: boolean, ms = 10) => {
    const c = new HHCable(radius, temp, myelin), s = endStimulus(false, 1000, radius);
    for (let k = 0; k < ms / 0.01; k++) c.step(s);
    return c.velocity();
  };
  it('18.6 m/s in the squid axon (Hodgkin and Huxley calculated 18.8)', () => {
    expect(run(238, 18.5, false)).toBeCloseTo(18.6, 1);
  }, 60_000);
  it('speed goes as √radius', () => {
    const v = run(238, 18.5, false);
    expect(run(952, 18.5, false) / v).toBeCloseTo(2, 1);
    expect(run(60, 18.5, false, 25) / v).toBeCloseTo(Math.sqrt(60 / 238), 1);
  }, 60_000);
  it('faster when warm, fails at 30 °C, and myelin multiplies the speed', () => {
    expect(run(238, 6.3, false)).toBeLessThan(run(238, 28, false));
    expect(run(238, 30, false)).toBeNaN();
    expect(run(238, 18.5, true) / run(238, 18.5, false)).toBeGreaterThan(3);
  }, 120_000);
  it('two impulses meet in the middle and annihilate', () => {
    const c = new HHCable(238, 18.5, false), s = endStimulus(true, 1000, 238);
    let ups = 0, prev = -65;
    for (let k = 0; k < 1500; k++) { c.step(s); const v = c.v[400]; if (prev < 0 && v >= 0) ups++; prev = v; }
    expect(ups).toBe(1);
    expect(Math.max(...c.v)).toBeLessThan(-50);
  }, 60_000);
  it('steps without NaN', () => {
    const a = make(axonFactory, { myelin: 1, stimulus: 1 });
    for (let i = 0; i < 30; i++) a.step(0.016, { dt: 0.016, radiusUm: 238, tempC: 18.5, myelin: 1, stimulus: 1, intervalMs: 12, speed: 4 });
    expect(finite(a.readPositions())).toBe(true);
  });
});

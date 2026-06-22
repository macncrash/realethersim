import { describe, expect, it } from 'vitest';
import { registerArchetypes } from '../src/archetypes';
import { listFactories } from '../src/core/registry';
import { defaultParams } from '../src/core/archetype';
import { resolveParams } from '../src/core/params';

registerArchetypes();

// Catalog smoke test: every registered system, run with its own default params + dt, must stay
// finite, bounded in render space, and spread into a non-degenerate cloud (not collapse to a
// point or blow up). Guards the whole expanded attractor/map catalog against bad equations/params.
describe('all registered systems are finite, bounded, and non-degenerate', () => {
  const factories = listFactories();

  it('has a sizeable catalog across categories', () => {
    expect(factories.length).toBeGreaterThanOrEqual(25);
    const cats = new Set(factories.map((f) => f.category));
    for (const c of ['Attractor', 'Map', 'Oscillator', 'N-Body', 'Foam']) expect(cats.has(c)).toBe(true);
  });

  for (const f of factories) {
    it(`${f.category} · ${f.id}`, () => {
      const dt = f.defaultDt;
      const params = resolveParams(defaultParams(f.params), dt);
      const a = f.create({ particleCount: 512, seed: 11, params });
      for (let i = 0; i < 800; i++) a.step(dt, params);

      const pos = a.readPositions();
      const n = pos.length / 3;
      let finite = true;
      let maxAbs = 0;
      let sx = 0;
      let sxx = 0;
      let sy = 0;
      let syy = 0;
      for (let i = 0; i < n; i++) {
        const x = pos[i * 3];
        const y = pos[i * 3 + 1];
        const z = pos[i * 3 + 2];
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) finite = false;
        maxAbs = Math.max(maxAbs, Math.abs(x), Math.abs(y), Math.abs(z));
        sx += x;
        sxx += x * x;
        sy += y;
        syy += y * y;
      }
      const spread = sxx / n - (sx / n) ** 2 + (syy / n - (sy / n) ** 2);
      expect(finite, 'positions finite').toBe(true);
      expect(maxAbs, 'bounded in render space').toBeLessThan(50);
      expect(spread, 'non-degenerate spread').toBeGreaterThan(1e-5);
    });
  }
});

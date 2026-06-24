import * as THREE from 'three';
import { PointsNodeMaterial } from 'three/webgpu';
import { attributeArray, color, float, Fn, hash, instanceIndex, mix, uniform, vec3 } from 'three/tsl';
import type { GpuFactory, GpuNode, GpuSim } from './types';

// GPU-resident strange attractors (Phase 2): RK4 integration as a TSL compute kernel over a
// per-vertex storage buffer, rendered straight from that buffer via PointsNodeMaterial (no CPU
// readback). attributeArray (not instancedArray) so toAttribute() maps the buffer by vertexIndex
// for a non-instanced THREE.Points draw.

interface GpuSystem {
  paramKeys: string[];
  defaults: Record<string, number>;
  deriv: (X: GpuNode, u: Record<string, GpuNode>) => GpuNode; // vec3 node = dX/dt
  seedRange: [number, number, number];
  seedOffset: [number, number, number];
  scale: number;
  center: [number, number, number];
  pointSize: number;
}

export const GPU_SYSTEMS: Record<string, GpuSystem> = {
  lorenz: {
    paramKeys: ['sigma', 'rho', 'beta'],
    defaults: { sigma: 10, rho: 28, beta: 8 / 3 },
    deriv: (X, u) => vec3(u.sigma.mul(X.y.sub(X.x)), X.x.mul(u.rho.sub(X.z)).sub(X.y), X.x.mul(X.y).sub(u.beta.mul(X.z))),
    seedRange: [36, 48, 48],
    seedOffset: [0, 0, 24],
    scale: 0.06,
    center: [0, 0, 25],
    pointSize: 0.014,
  },
  rossler: {
    paramKeys: ['a', 'b', 'c'],
    defaults: { a: 0.2, b: 0.2, c: 5.7 },
    deriv: (X, u) => vec3(X.y.add(X.z).negate(), X.x.add(u.a.mul(X.y)), u.b.add(X.z.mul(X.x.sub(u.c)))),
    seedRange: [24, 24, 24],
    seedOffset: [0, 0, 12],
    scale: 0.1,
    center: [0, 0, 6],
    pointSize: 0.014,
  },
  aizawa: {
    paramKeys: ['a', 'b', 'c', 'd', 'e', 'f'],
    defaults: { a: 0.95, b: 0.7, c: 0.6, d: 3.5, e: 0.25, f: 0.1 },
    deriv: (X, u) =>
      vec3(
        X.z.sub(u.b).mul(X.x).sub(u.d.mul(X.y)),
        u.d.mul(X.x).add(X.z.sub(u.b).mul(X.y)),
        u.c
          .add(u.a.mul(X.z))
          .sub(X.z.mul(X.z).mul(X.z).div(3))
          .sub(X.x.mul(X.x).add(X.y.mul(X.y)).mul(float(1).add(u.e.mul(X.z))))
          .add(u.f.mul(X.z).mul(X.x.mul(X.x).mul(X.x))),
      ),
    seedRange: [2.4, 2.4, 2.8],
    seedOffset: [0, 0, 0],
    scale: 1.3,
    center: [0, 0, 0.4],
    pointSize: 0.012,
  },
  thomas: {
    paramKeys: ['b'],
    defaults: { b: 0.19 },
    deriv: (X, u) => vec3(X.y.sin().sub(u.b.mul(X.x)), X.z.sin().sub(u.b.mul(X.y)), X.x.sin().sub(u.b.mul(X.z))),
    seedRange: [12, 12, 12],
    seedOffset: [0, 0, 0],
    scale: 0.32,
    center: [0, 0, 0],
    pointSize: 0.016,
  },
  // The 10 newer flows — same per-particle RK4 path, TSL twins of the CPU derivatives. A tight
  // seed cloud (seedRange ~1) around the on-attractor init point; scale/center match the CPU bounds.
  halvorsen: {
    paramKeys: ['a'],
    defaults: { a: 1.4 },
    deriv: (X, u) =>
      vec3(
        u.a.mul(X.x).negate().sub(X.y.mul(4)).sub(X.z.mul(4)).sub(X.y.mul(X.y)),
        u.a.mul(X.y).negate().sub(X.z.mul(4)).sub(X.x.mul(4)).sub(X.z.mul(X.z)),
        u.a.mul(X.z).negate().sub(X.x.mul(4)).sub(X.y.mul(4)).sub(X.x.mul(X.x)),
      ),
    seedRange: [1, 1, 1], seedOffset: [-1.48, -1.51, 2.04], scale: 0.214, center: [-2, -2, -2], pointSize: 0.012,
  },
  chen: {
    paramKeys: ['a', 'b', 'c'],
    defaults: { a: 35, b: 3, c: 28 },
    deriv: (X, u) =>
      vec3(
        u.a.mul(X.y.sub(X.x)),
        u.c.sub(u.a).mul(X.x).sub(X.x.mul(X.z)).add(u.c.mul(X.y)),
        X.x.mul(X.y).sub(u.b.mul(X.z)),
      ),
    seedRange: [1, 1, 1], seedOffset: [-0.1, 0.5, -0.6], scale: 0.0429, center: [0, 0, 30], pointSize: 0.012,
  },
  dadras: {
    paramKeys: ['p', 'o', 'r', 'c', 'e'],
    defaults: { p: 3, o: 2.7, r: 1.7, c: 2, e: 9 },
    deriv: (X, u) =>
      vec3(
        X.y.sub(u.p.mul(X.x)).add(u.o.mul(X.y).mul(X.z)),
        u.r.mul(X.y).sub(X.x.mul(X.z)).add(X.z),
        u.c.mul(X.x).mul(X.y).sub(u.e.mul(X.z)),
      ),
    seedRange: [1, 1, 1], seedOffset: [1.1, 2.1, -2], scale: 0.06, center: [0, 0, 0], pointSize: 0.012,
  },
  lorenz84: {
    paramKeys: ['a', 'b', 'F', 'G'],
    defaults: { a: 0.25, b: 4, F: 8, G: 1 },
    deriv: (X, u) =>
      vec3(
        X.y.mul(X.y).negate().sub(X.z.mul(X.z)).sub(u.a.mul(X.x)).add(u.a.mul(u.F)),
        X.x.mul(X.y).sub(u.b.mul(X.x).mul(X.z)).sub(X.y).add(u.G),
        u.b.mul(X.x).mul(X.y).add(X.x.mul(X.z)).sub(X.z),
      ),
    seedRange: [0.6, 0.6, 0.6], seedOffset: [1, 1, 1], scale: 0.5, center: [0.75, 0, 0], pointSize: 0.012,
  },
  'rabinovich-fabrikant': {
    paramKeys: ['a', 'g'],
    defaults: { a: 1.1, g: 0.87 },
    deriv: (X, u) =>
      vec3(
        X.y.mul(X.z.sub(1).add(X.x.mul(X.x))).add(u.g.mul(X.x)),
        X.x.mul(X.z.mul(3).add(1).sub(X.x.mul(X.x))).add(u.g.mul(X.y)),
        X.z.mul(-2).mul(u.a.add(X.x.mul(X.y))),
      ),
    seedRange: [0.3, 0.3, 0.3], seedOffset: [-1, 0, 0.5], scale: 0.6, center: [0, 0, 0.75], pointSize: 0.012,
  },
  'sprott-linz-f': {
    paramKeys: ['a'],
    defaults: { a: 0.5 },
    deriv: (X, u) => vec3(X.y.add(X.z), X.x.negate().add(u.a.mul(X.y)), X.x.mul(X.x).sub(X.z)),
    seedRange: [1, 1, 1], seedOffset: [0.1, 0, 0], scale: 0.5, center: [0.25, 0, 3], pointSize: 0.012,
  },
  'wang-four-wing': {
    paramKeys: ['a', 'b', 'c', 'd'],
    defaults: { a: 0.2, b: -0.01, c: -0.4, d: -1 },
    deriv: (X, u) =>
      vec3(
        u.a.mul(X.x).add(X.y.mul(X.z)),
        u.b.mul(X.x).add(u.c.mul(X.y)).sub(X.x.mul(X.z)),
        X.z.negate().add(u.d.mul(X.x).mul(X.y)),
      ),
    seedRange: [1, 1, 1], seedOffset: [1, 1, 1], scale: 0.079, center: [0, 0, 11], pointSize: 0.012,
  },
  bouali: {
    paramKeys: ['a', 'b', 'c', 'd'],
    defaults: { a: 3, b: 2.2, c: 1, d: 0.001 },
    deriv: (X, u) =>
      vec3(
        u.a.mul(X.x).mul(float(1).sub(X.y)).sub(u.b.mul(X.z)),
        u.c.negate().mul(X.y).mul(float(1).sub(X.x.mul(X.x))),
        u.d.mul(X.x),
      ),
    seedRange: [1, 1, 1], seedOffset: [1, 0.1, 0.1], scale: 0.4286, center: [0, 0.5, 0], pointSize: 0.012,
  },
  'nose-hoover': {
    paramKeys: ['a'],
    defaults: { a: 1 },
    deriv: (X, u) => vec3(X.y, X.x.negate().add(X.y.mul(X.z)), u.a.sub(X.y.mul(X.y))),
    seedRange: [1, 1, 1], seedOffset: [0, 5, 0], scale: 0.375, center: [0, 0, 0], pointSize: 0.012,
  },
  chua: {
    paramKeys: ['alpha', 'beta', 'c0', 'c1'],
    defaults: { alpha: 10, beta: 14.2857, c0: -1 / 6, c1: 1 / 16 },
    deriv: (X, u) =>
      vec3(
        u.alpha.mul(X.y.sub(X.x).sub(u.c1.mul(X.x).mul(X.x).mul(X.x).add(u.c0.mul(X.x)))),
        X.x.sub(X.y).add(X.z),
        u.beta.negate().mul(X.y),
      ),
    seedRange: [1, 1, 1], seedOffset: [0.3, 0, 0], scale: 0.375, center: [0, 0, 0], pointSize: 0.012,
  },
  lu: {
    paramKeys: ['a', 'b', 'c'],
    defaults: { a: 36, b: 3, c: 20 },
    deriv: (X, u) =>
      vec3(
        u.a.mul(X.y.sub(X.x)),
        u.c.mul(X.y).sub(X.x.mul(X.z)),
        X.x.mul(X.y).sub(u.b.mul(X.z)),
      ),
    seedRange: [1, 1, 1], seedOffset: [-5.23, -5.47, 17.84], scale: 0.06, center: [0.0, 0.0, 22.0], pointSize: 0.012,
  },
  'chen-lee': {
    paramKeys: ['a', 'b', 'c'],
    defaults: { a: 5, b: -10, c: -0.38 },
    deriv: (X, u) =>
      vec3(
        u.a.mul(X.x).sub(X.y.mul(X.z)),
        u.b.mul(X.y).add(X.x.mul(X.z)),
        u.c.mul(X.z).add(X.x.mul(X.y).div(3)),
      ),
    seedRange: [1, 1, 1], seedOffset: [1, 1, 1], scale: 0.1, center: [0.0, 0.0, 9.25], pointSize: 0.012,
  },
  'newton-leipnik': {
    paramKeys: ['a', 'b'],
    defaults: { a: 0.4, b: 0.175 },
    deriv: (X, u) =>
      vec3(
        u.a.mul(X.x).negate().add(X.y).add(X.y.mul(X.z).mul(10)),
        X.x.negate().sub(X.y.mul(0.4)).add(X.x.mul(X.z).mul(5)),
        u.b.mul(X.z).sub(X.x.mul(X.y).mul(5)),
      ),
    seedRange: [1, 1, 1], seedOffset: [0.349, 0, -0.16], scale: 1.7647, center: [0.0, 0.0, 0.2], pointSize: 0.012,
  },
  'burke-shaw': {
    paramKeys: ['s', 'v'],
    defaults: { s: 10, v: 4.272 },
    deriv: (X, u) =>
      vec3(
        u.s.negate().mul(X.x.add(X.y)),
        X.y.negate().sub(u.s.mul(X.x).mul(X.z)),
        u.s.mul(X.x).mul(X.y).add(u.v),
      ),
    seedRange: [1, 1, 1], seedOffset: [1, 0, 0], scale: 0.6522, center: [0.0, 0.0, 0.0], pointSize: 0.012,
  },
  rikitake: {
    paramKeys: ['mu', 'a'],
    defaults: { mu: 0.5, a: 5 },
    deriv: (X, u) =>
      vec3(
        u.mu.negate().mul(X.x).add(X.z.mul(X.y)),
        u.mu.negate().mul(X.y).add(X.z.sub(u.a).mul(X.x)),
        float(1).sub(X.x.mul(X.y)),
      ),
    seedRange: [1, 1, 1], seedOffset: [1, 0, 0], scale: 0.25, center: [0, 0, 5.05], pointSize: 0.012,
  },
  'shimizu-morioka': {
    paramKeys: ['a', 'b'],
    defaults: { a: 0.75, b: 0.45 },
    deriv: (X, u) =>
      vec3(
        X.y,
        X.x.mul(float(1).sub(X.z)).sub(u.a.mul(X.y)),
        u.b.negate().mul(X.z).add(X.x.mul(X.x)),
      ),
    seedRange: [1, 1, 1], seedOffset: [1.0228588902751727, -0.35319951514739695, 1.762580127299876], scale: 1.0345, center: [0.0, 0.0, 1.15], pointSize: 0.012,
  },
  rucklidge: {
    paramKeys: ['k', 'a'],
    defaults: { k: 2, a: 6.7 },
    deriv: (X, u) =>
      vec3(
        u.k.negate().mul(X.x).add(u.a.mul(X.y)).sub(X.y.mul(X.z)),
        X.x,
        X.z.negate().add(X.y.mul(X.y)),
      ),
    seedRange: [1, 1, 1], seedOffset: [1, 0, 4.5], scale: 0.1429, center: [0.0, 0.0, 7.75], pointSize: 0.012,
  },
  'genesio-tesi': {
    paramKeys: ['a', 'b', 'c'],
    defaults: { a: 0.44, b: 1.1, c: 1.0 },
    deriv: (X, u) =>
      vec3(
        X.y,
        X.z,
        u.c.negate().mul(X.x).sub(u.b.mul(X.y)).sub(u.a.mul(X.z)).add(X.x.mul(X.x)),
      ),
    seedRange: [1, 1, 1], seedOffset: [0.2, 0, 0], scale: 1.7821, center: [0.35, 0.149, 0.075], pointSize: 0.012,
  },
  arneodo: {
    paramKeys: ['a', 'b'],
    defaults: { a: 5.5, b: 3.5 },
    deriv: (X, u) =>
      vec3(
        X.y,
        X.z,
        u.a.mul(X.x).sub(u.b.mul(X.y)).sub(X.z).sub(X.x.mul(X.x).mul(X.x)),
      ),
    seedRange: [1, 1, 1], seedOffset: [2.564, -3.389, -6.501], scale: 0.1304, center: [0.0, 0.0, 0.0], pointSize: 0.012,
  },
  finance: {
    paramKeys: ['a', 'b', 'c'],
    defaults: { a: 0.001, b: 0.2, c: 1.1 },
    deriv: (X, u) =>
      vec3(
        X.z.add(X.y.sub(u.a).mul(X.x)),
        float(1).sub(u.b.mul(X.y)).sub(X.x.mul(X.x)),
        X.x.negate().sub(u.c.mul(X.z)),
      ),
    seedRange: [1, 1, 1], seedOffset: [1.1232, 0.973, -0.5738], scale: 0.4839, center: [0.0, 0.6, 0.0], pointSize: 0.012,
  },
  'sprott-b': {
    paramKeys: ['s'],
    defaults: { s: 1 },
    deriv: (X, u) => vec3(u.s.mul(X.y.mul(X.z)), u.s.mul(X.x.sub(X.y)), u.s.mul(float(1).sub(X.x.mul(X.y)))),
    seedRange: [1, 1, 1], seedOffset: [0.5, 0.1, 0], scale: 0.2069, center: [-0.25, 0.0, -0.25], pointSize: 0.012,
  },
  'hindmarsh-rose': {
    paramKeys: ['a', 'b', 'c', 'd', 's', 'xr', 'r', 'I'],
    defaults: { a: 1, b: 3, c: 1, d: 5, s: 4, xr: -1.6, r: 0.006, I: 3.2 },
    deriv: (X, u) =>
      vec3(
        X.y.sub(u.a.mul(X.x).mul(X.x).mul(X.x)).add(u.b.mul(X.x).mul(X.x)).sub(X.z).add(u.I),
        u.c.sub(u.d.mul(X.x).mul(X.x)).sub(X.y),
        u.r.mul(u.s.mul(X.x.sub(u.xr)).sub(X.z)),
      ),
    seedRange: [1, 1, 1], seedOffset: [-1.1, -5.1, 3.1], scale: 0.375, center: [0.25, -3.2, 3.1], pointSize: 0.012,
  },
  sakarya: {
    paramKeys: ['a', 'b'],
    defaults: { a: 0.4, b: 0.3 },
    deriv: (X, u) =>
      vec3(
        X.x.negate().add(X.y).add(X.y.mul(X.z)),
        X.x.negate().sub(X.y).add(u.a.mul(X.x).mul(X.z)),
        X.z.sub(u.b.mul(X.x).mul(X.y)),
      ),
    seedRange: [1, 1, 1], seedOffset: [3.22, 1.54, 4.31], scale: 0.0429, center: [1.0, 0.0, 2.0], pointSize: 0.012,
  },
};

function buildAttractor(sys: GpuSystem, count: number, dt0: number): GpuSim {
  const pos: GpuNode = attributeArray(count, 'vec3');
  const u: Record<string, GpuNode> = {};
  for (const k of sys.paramKeys) u[k] = uniform(sys.defaults[k]);
  const uDt: GpuNode = uniform(dt0);

  const [rx, ry, rz] = sys.seedRange;
  const [ox, oy, oz] = sys.seedOffset;
  const init: GpuNode = (Fn(() => {
    const p = pos.element(instanceIndex);
    const r1 = hash(instanceIndex.mul(3));
    const r2 = hash(instanceIndex.mul(3).add(1));
    const r3 = hash(instanceIndex.mul(3).add(2));
    p.assign(vec3(r1.sub(0.5).mul(rx).add(ox), r2.sub(0.5).mul(ry).add(oy), r3.sub(0.5).mul(rz).add(oz)));
  })() as GpuNode).compute(count);

  const deriv = (X: GpuNode): GpuNode => sys.deriv(X, u);
  const step: GpuNode = (Fn(() => {
    const p = pos.element(instanceIndex);
    const x0 = p.toVar();
    const k1 = deriv(x0).toVar();
    const k2 = deriv(x0.add(k1.mul(uDt.mul(0.5)))).toVar();
    const k3 = deriv(x0.add(k2.mul(uDt.mul(0.5)))).toVar();
    const k4 = deriv(x0.add(k3.mul(uDt))).toVar();
    p.assign(x0.add(k1.add(k2.mul(2)).add(k3.mul(2)).add(k4).mul(uDt.div(6))));
  })() as GpuNode).compute(count);

  const attr: GpuNode = pos.toAttribute();
  const material = new PointsNodeMaterial();
  material.transparent = true;
  material.depthWrite = false;
  material.blending = THREE.AdditiveBlending;
  material.opacity = 0.85;
  const c = sys.center;
  material.positionNode = attr.sub(vec3(c[0], c[1], c[2])).mul(sys.scale);
  material.colorNode = mix(color(0x3aa0ff), color(0xff5a8a), attr.y.mul(0.02).add(0.5).clamp(0, 1));

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  return {
    points,
    init,
    steps: [step],
    substeps: 3,
    particleCount: count,
    pointSize: sys.pointSize,
    setParams(p: Record<string, number>): void {
      for (const k of sys.paramKeys) if (k in p) u[k].value = p[k];
      if ('dt' in p) uDt.value = p.dt;
    },
    dispose(): void {
      geometry.dispose();
      material.dispose();
    },
  };
}

export function makeGpuAttractor(id: string): GpuFactory {
  const sys = GPU_SYSTEMS[id];
  return (count, dt) => buildAttractor(sys, count, dt);
}

import * as THREE from 'three';
import { PointsNodeMaterial } from 'three/webgpu';
import { attributeArray, color, float, Fn, hash, instanceIndex, mix, sign, uniform, vec3 } from 'three/tsl';
import type { GpuFactory, GpuNode, GpuSim } from './types';

// GPU-resident iterated maps: one map iteration per compute dispatch over a per-vertex storage
// buffer; points render straight from the buffer (no readback). TSL twins of the CPU iteratedMap
// formulas. 2D maps keep z = 0; Pickover is 3D. Particles are seeded near the on-attractor init so
// escape-prone maps (Hénon/Tinkerbell/Ikeda) stay in-basin.
interface GpuMapSystem {
  paramKeys: string[];
  defaults: Record<string, number>;
  iterate: (X: GpuNode, u: Record<string, GpuNode>) => GpuNode; // returns next state vec3
  seedRange: [number, number, number];
  seedOffset: [number, number, number];
  scale: number;
  center: [number, number, number];
  pointSize: number;
}

export const GPU_MAPS: Record<string, GpuMapSystem> = {
  clifford: {
    paramKeys: ['a', 'b', 'c', 'd'], defaults: { a: -1.4, b: 1.7, c: 1, d: 0.7 },
    iterate: (X, u) => vec3(u.a.mul(X.y).sin().add(u.c.mul(u.a.mul(X.x).cos())), u.b.mul(X.x).sin().add(u.d.mul(u.b.mul(X.y).cos())), 0),
    seedRange: [0.2, 0.2, 0], seedOffset: [0.1, 0.1, 0], scale: 0.625, center: [0, 0, 0], pointSize: 0.01,
  },
  'de-jong': {
    paramKeys: ['a', 'b', 'c', 'd'], defaults: { a: 1.4, b: -2.3, c: 2.4, d: -2.1 },
    iterate: (X, u) => vec3(u.a.mul(X.y).sin().sub(u.b.mul(X.x).cos()), u.c.mul(X.x).sin().sub(u.d.mul(X.y).cos()), 0),
    seedRange: [0.2, 0.2, 0], seedOffset: [0.1, 0.1, 0], scale: 0.75, center: [0, 0, 0], pointSize: 0.01,
  },
  svensson: {
    paramKeys: ['a', 'b', 'c', 'd'], defaults: { a: 1.4, b: 1.56, c: 1.4, d: -6.56 },
    iterate: (X, u) => vec3(u.d.mul(u.a.mul(X.x).sin()).sub(u.b.mul(X.y).sin()), u.c.mul(u.a.mul(X.x).cos()).add(u.b.mul(X.y).cos()), 0),
    seedRange: [0.2, 0.2, 0], seedOffset: [0.1, 0.1, 0], scale: 0.197, center: [0, 0, 0], pointSize: 0.01,
  },
  hopalong: {
    paramKeys: ['a', 'b', 'c'], defaults: { a: 0.4, b: 1, c: 0 },
    iterate: (X, u) => vec3(X.y.sub(sign(X.x).mul(u.b.mul(X.x).sub(u.c).abs().sqrt())), u.a.sub(X.x), 0),
    seedRange: [0.5, 0.5, 0], seedOffset: [0, 0, 0], scale: 0.05, center: [0, 0, 0], pointSize: 0.01,
  },
  'gumowski-mira': {
    paramKeys: ['a', 'b'], defaults: { a: -0.2, b: 1 },
    iterate: (X, u) => {
      const gm = (v: GpuNode): GpuNode => u.a.mul(v).add(float(2).mul(float(1).sub(u.a)).mul(v.mul(v)).div(float(1).add(v.mul(v))));
      const nx = u.b.mul(X.y).add(gm(X.x));
      return vec3(nx, X.x.negate().add(gm(nx)), 0);
    },
    seedRange: [0.3, 0.3, 0], seedOffset: [1, 1, 0], scale: 0.075, center: [0, 0, 0], pointSize: 0.01,
  },
  tinkerbell: {
    paramKeys: ['a', 'b', 'c', 'd'], defaults: { a: 0.9, b: -0.6013, c: 2, d: 0.5 },
    iterate: (X, u) => vec3(
      X.x.mul(X.x).sub(X.y.mul(X.y)).add(u.a.mul(X.x)).add(u.b.mul(X.y)),
      X.x.mul(X.y).mul(2).add(u.c.mul(X.x)).add(u.d.mul(X.y)),
      0,
    ),
    seedRange: [0.04, 0.04, 0], seedOffset: [-0.72, -0.64, 0], scale: 1.36, center: [-0.4, -0.7, 0], pointSize: 0.01,
  },
  ikeda: {
    paramKeys: ['u'], defaults: { u: 0.918 },
    iterate: (X, u) => {
      // t = 0.4 − 6 / (1 + x² + y²), built from the (loose) state nodes to stay scalar-typed.
      const t = X.x.mul(X.x).add(X.y.mul(X.y)).add(1).reciprocal().mul(-6).add(0.4);
      return vec3(
        u.u.mul(X.x.mul(t.cos()).sub(X.y.mul(t.sin()))).add(1),
        u.u.mul(X.x.mul(t.sin()).add(X.y.mul(t.cos()))),
        0,
      );
    },
    seedRange: [0.3, 0.3, 0], seedOffset: [0.1, 0.1, 0], scale: 0.833, center: [0.75, -0.8, 0], pointSize: 0.01,
  },
  henon: {
    paramKeys: ['a', 'b'], defaults: { a: 1.4, b: 0.3 },
    iterate: (X, u) => vec3(X.y.add(1).sub(u.a.mul(X.x.mul(X.x))), u.b.mul(X.x), 0),
    seedRange: [0.05, 0.05, 0], seedOffset: [0.1, 0.1, 0], scale: 1.0, center: [0, 0, 0], pointSize: 0.01,
  },
  bedhead: {
    paramKeys: ['a', 'b'], defaults: { a: 0.65343, b: 0.7345345 },
    iterate: (X, u) => vec3(
      X.x.mul(X.y).div(u.b).sin().mul(X.y).add(u.a.mul(X.x).sub(X.y).cos()),
      X.x.add(X.y.sin().div(u.b)),
      0,
    ),
    seedRange: [0.1, 0.1, 0], seedOffset: [1, 1, 0], scale: 0.88, center: [0.2, 0.7, 0], pointSize: 0.01,
  },
  pickover: {
    paramKeys: ['a', 'b', 'c', 'd', 'e'], defaults: { a: 2.24, b: 0.43, c: -0.65, d: -2.43, e: 1 },
    iterate: (X, u) => vec3(
      u.a.mul(X.y).sin().sub(X.z.mul(u.b.mul(X.x).cos())),
      X.z.mul(u.c.mul(X.x).sin()).sub(u.d.mul(X.y).cos()),
      u.e.mul(X.x.sin()),
    ),
    seedRange: [0.2, 0.2, 0.2], seedOffset: [0.1, 0.1, 0.1], scale: 0.68, center: [0, 0, 0], pointSize: 0.01,
  },
};

function buildGpuMap(sys: GpuMapSystem, count: number): GpuSim {
  const pos: GpuNode = attributeArray(count, 'vec3');
  const u: Record<string, GpuNode> = {};
  for (const k of sys.paramKeys) u[k] = uniform(sys.defaults[k]);

  const [rx, ry, rz] = sys.seedRange;
  const [ox, oy, oz] = sys.seedOffset;
  const init: GpuNode = (Fn(() => {
    const p = pos.element(instanceIndex);
    const r1 = hash(instanceIndex.mul(3));
    const r2 = hash(instanceIndex.mul(3).add(1));
    const r3 = hash(instanceIndex.mul(3).add(2));
    p.assign(vec3(r1.sub(0.5).mul(rx).add(ox), r2.sub(0.5).mul(ry).add(oy), r3.sub(0.5).mul(rz).add(oz)));
  })() as GpuNode).compute(count);

  const step: GpuNode = (Fn(() => {
    const p = pos.element(instanceIndex);
    const x0 = p.toVar();
    p.assign(sys.iterate(x0, u));
  })() as GpuNode).compute(count);

  const attr: GpuNode = pos.toAttribute();
  const c = sys.center;
  const material = new PointsNodeMaterial();
  material.transparent = true;
  material.depthWrite = false;
  material.blending = THREE.AdditiveBlending;
  material.opacity = 0.85;
  material.positionNode = attr.sub(vec3(c[0], c[1], c[2])).mul(sys.scale);
  material.colorNode = mix(color(0x4ad6c8), color(0xff8a4a), attr.x.mul(0.3).add(0.5).clamp(0, 1));

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  return {
    points,
    init,
    steps: [step],
    substeps: 2,
    particleCount: count,
    pointSize: sys.pointSize,
    setParams(p: Record<string, number>): void {
      for (const k of sys.paramKeys) if (k in p) u[k].value = p[k];
    },
    dispose(): void {
      geometry.dispose();
      material.dispose();
    },
  };
}

export function makeGpuMap(id: string): GpuFactory {
  const sys = GPU_MAPS[id];
  return (count) => buildGpuMap(sys, count);
}

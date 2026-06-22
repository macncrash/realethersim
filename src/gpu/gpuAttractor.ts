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

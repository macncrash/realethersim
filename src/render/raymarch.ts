import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import * as tsl from 'three/tsl';
import type { RaymarchKind, RaymarchSystem } from '../archetypes/raymarchFractal';

// TSL graph nodes are dynamically typed (see gpu/types.ts `GpuNode = any`). We pull the builder
// functions in untyped so hand-authored SDF chains (heavy on swizzles and free math fns) don't
// fight the strict bundled .d.ts overloads. Correctness is verified at runtime in the browser.
type Node = any;
const {
  Fn,
  Loop,
  If,
  Break,
  uniform,
  float,
  vec2,
  vec3,
  vec4,
  abs,
  acos,
  atan,
  clamp,
  cos,
  log,
  max,
  min,
  mix,
  mod,
  normalize,
  pow,
  select,
  sin,
  screenUV,
  cameraPosition,
  cameraProjectionMatrixInverse,
  cameraWorldMatrix,
  positionGeometry,
} = tsl as any;

export interface RaymarchPass {
  mesh: THREE.Mesh;
  cameraDistance: number;
  setParams(p: Record<string, number>): void;
  update(elapsedSeconds: number): void;
  dispose(): void;
}

// ── quaternion helpers (for the Julia DE) ──
const qmul = Fn(([a, b]: [Node, Node]) =>
  vec4(
    a.x.mul(b.x).sub(a.y.mul(b.y)).sub(a.z.mul(b.z)).sub(a.w.mul(b.w)),
    a.x.mul(b.y).add(a.y.mul(b.x)).add(a.z.mul(b.w)).sub(a.w.mul(b.z)),
    a.x.mul(b.z).sub(a.y.mul(b.w)).add(a.z.mul(b.x)).add(a.w.mul(b.y)),
    a.x.mul(b.w).add(a.y.mul(b.z)).sub(a.z.mul(b.y)).add(a.w.mul(b.x)),
  ),
);
const qsqr = Fn(([q]: [Node]) =>
  vec4(
    q.x.mul(q.x).sub(q.y.mul(q.y)).sub(q.z.mul(q.z)).sub(q.w.mul(q.w)),
    q.x.mul(q.y).mul(2),
    q.x.mul(q.z).mul(2),
    q.x.mul(q.w).mul(2),
  ),
);

// rotate a vec3 about the Y then X axes by the given angles (cheap, branchless)
const rotYX = Fn(([v, ay, ax]: [Node, Node, Node]) => {
  const cy = cos(ay);
  const sy = sin(ay);
  const p1 = vec3(v.x.mul(cy).add(v.z.mul(sy)), v.y, v.z.mul(cy).sub(v.x.mul(sy)));
  const cx = cos(ax);
  const sx = sin(ax);
  return vec3(p1.x, p1.y.mul(cx).sub(p1.z.mul(sx)), p1.y.mul(sx).add(p1.z.mul(cx)));
});

// signed distance to an axis-aligned box of half-extents b
const sdBox = Fn(([p, b]: [Node, Node]) => {
  const d = abs(p).sub(b);
  return max(d, vec3(0)).length().add(min(max(d.x, max(d.y, d.z)), 0));
});

// Build the distance-estimator for one fractal. Returns a TSL Fn(p) -> vec2(distance, orbitTrap).
// All loops are compile-time bounded with an escape Break; every divide/log is guarded so a single
// NaN can't poison the whole ray.
// ── implicit-surface fields F(c): the rendered surface is the level set F = isovalue ──
const cheb8 = (x: Node): Node => {
  const x2 = x.mul(x);
  const x4 = x2.mul(x2);
  const x6 = x4.mul(x2);
  const x8 = x4.mul(x4);
  return x8.mul(128).sub(x6.mul(256)).add(x4.mul(160)).sub(x2.mul(32)).add(1); // Chebyshev T₈
};
const surfaceField = (kind: string, c: Node): Node => {
  const x = c.x;
  const y = c.y;
  const z = c.z;
  if (kind === 'gyroid') return sin(x).mul(cos(y)).add(sin(y).mul(cos(z))).add(sin(z).mul(cos(x)));
  if (kind === 'schwarzP') return cos(x).add(cos(y)).add(cos(z));
  if (kind === 'schwarzD')
    return sin(x).mul(sin(y)).mul(sin(z))
      .add(sin(x).mul(cos(y)).mul(cos(z)))
      .add(cos(x).mul(sin(y)).mul(cos(z)))
      .add(cos(x).mul(cos(y)).mul(sin(z)));
  if (kind === 'schoenIWP')
    return cos(x).mul(cos(y)).add(cos(y).mul(cos(z))).add(cos(z).mul(cos(x))).mul(2)
      .sub(cos(x.mul(2)).add(cos(y.mul(2))).add(cos(z.mul(2))));
  if (kind === 'neovius')
    return cos(x).add(cos(y)).add(cos(z)).mul(3).add(cos(x).mul(cos(y)).mul(cos(z)).mul(4));
  if (kind === 'chmutov') return cheb8(x).add(cheb8(y)).add(cheb8(z)); // chmutov octic
  // ── algebraic surfaces (non-periodic; live inside the unit-ish ball) ──
  if (kind === 'heart') {
    // Taubin heart, cusp remapped to the world up-axis (formula z → world y) so it stands upright.
    const X = x, Y = z, Z = y;
    const X2 = X.mul(X), Y2 = Y.mul(Y), Z2 = Z.mul(Z), Z3 = Z2.mul(Z);
    const base = X2.add(Y2.mul(2.25)).add(Z2).sub(1);
    return base.mul(base).mul(base).sub(X2.mul(Z3)).sub(Y2.mul(Z3).mul(0.1125)); // (…)³ − x²z³ − 9/80 y²z³
  }
  if (kind === 'tanglecube') {
    const x2 = x.mul(x), y2 = y.mul(y), z2 = z.mul(z);
    return x2.mul(x2).sub(x2.mul(5)).add(y2.mul(y2)).sub(y2.mul(5)).add(z2.mul(z2)).sub(z2.mul(5)).add(11.8);
  }
  if (kind === 'goursat') {
    const x2 = x.mul(x), y2 = y.mul(y), z2 = z.mul(z);
    return x2.mul(x2).add(y2.mul(y2)).add(z2.mul(z2)).sub(1); // x⁴+y⁴+z⁴ = 1 (+iso) — rounded cube
  }
  if (kind === 'barth') {
    // Barth sextic — the golden-ratio 65-node surface. P = φ², (1+2φ) ≈ 4.236.
    const x2 = x.mul(x), y2 = y.mul(y), z2 = z.mul(z);
    const P = 2.6180339887;
    const t1 = x2.mul(P).sub(y2);
    const t2 = y2.mul(P).sub(z2);
    const t3 = z2.mul(P).sub(x2);
    const s = x2.add(y2).add(z2).sub(1);
    return t1.mul(t2).mul(t3).mul(4).sub(s.mul(s).mul(4.2360679));
  }
  if (kind === 'kummer') {
    // Kummer quartic (tetrahedroid), mu = 1.3 → 16 real nodes. s2 = sqrt(2).
    const mu2 = float(1.69); // mu = 1.3
    const lambda = float(3.1069); // (3*mu^2 - 1)/(3 - mu^2) at mu=1.3
    const s2 = float(1.4142135624);
    const r = x.mul(x).add(y.mul(y)).add(z.mul(z)).sub(mu2);
    const p1 = float(1).sub(z).sub(s2.mul(x));
    const p2 = float(1).sub(z).add(s2.mul(x));
    const p3 = float(1).add(z).add(s2.mul(y));
    const p4 = float(1).add(z).sub(s2.mul(y));
    const prod = p1.mul(p2).mul(p3).mul(p4);
    return r.mul(r).sub(lambda.mul(prod)); // (x²+y²+z²-μ²)² - λ·∏(planes)
  }
  if (kind === 'clebsch') {
    // Clebsch diagonal cubic — affine real form containing all 27 lines.
    const x2 = x.mul(x), y2 = y.mul(y), z2 = z.mul(z);
    const x3 = x2.mul(x), y3 = y2.mul(y), z3 = z2.mul(z);
    const cubes = x3.add(y3).add(z3);
    const mixed = x2.mul(y).add(x2.mul(z))
      .add(y2.mul(x)).add(y2.mul(z))
      .add(z2.mul(x)).add(z2.mul(y));
    const prod = x.mul(y).mul(z);
    const pairs = x.mul(y).add(y.mul(z)).add(z.mul(x));
    const sq = x2.add(y2).add(z2);
    const lin = x.add(y).add(z);
    return cubes.mul(81)
      .sub(mixed.mul(189))
      .add(prod.mul(54))
      .sub(pairs.mul(126))
      .add(sq.mul(9))
      .add(lin.mul(9))
      .sub(1); // 81Σx³ − 189Σx²y + 54xyz − 126Σxy + 9Σx² + 9Σx − 1
  }
  if (kind === 'cayley') {
    // Cayley's nodal cubic — 4 ordinary double points in tetrahedral arrangement.
    const x2 = x.mul(x), y2 = y.mul(y), z2 = z.mul(z);
    const cubic = x2.mul(y.add(z)).add(y2.mul(x.add(z))).add(z2.mul(x.add(y)));
    const quad = x.mul(y).add(y.mul(z)).add(z.mul(x));
    return cubic.mul(-5).add(quad.mul(2)); // -5·Σx²(y+z) + 2·Σxy
  }
  if (kind === 'fischerKoch')
    return cos(x.mul(2)).mul(sin(y)).mul(cos(z))
      .add(cos(y.mul(2)).mul(sin(z)).mul(cos(x)))
      .add(cos(z.mul(2)).mul(sin(x)).mul(cos(y))); // Fischer-Koch S nodal approximation
  if (kind === 'schwarzCLP')
    return cos(x.mul(2)).mul(cos(z)).add(cos(y.mul(2)).mul(sin(z))); // Schwarz CLP: cos2x·cosz + cos2y·sinz
  return cheb8(x).add(cheb8(y)).add(cheb8(z)); // default (unreachable for registered kinds)
};
const SURFACE_KINDS = [
  'gyroid', 'schwarzP', 'schwarzD', 'schoenIWP', 'neovius', 'chmutov',
  'heart', 'tanglecube', 'goursat', 'barth',
  'kummer', 'clebsch', 'cayley', 'fischerKoch', 'schwarzCLP',
];

function makeMap(sys: RaymarchSystem, u: Record<string, Node>, uTime: Node): Node {
  const kind: RaymarchKind = sys.sdf;
  const ITER = sys.iters;

  if (SURFACE_KINDS.includes(kind)) {
    const freq = sys.freq ?? 1;
    return Fn(([p]: [Node]) => {
      const iso = u.iso.add(u.animate.mul(0.5).mul(sin(uTime.mul(0.3)))).toVar(); // animated level-set
      const fAt = (wp: Node): Node => surfaceField(kind, wp.mul(freq));
      const f0 = fAt(p).toVar();
      const e = 0.0025;
      const gx = fAt(p.add(vec3(e, 0, 0))).sub(f0);
      const gy = fAt(p.add(vec3(0, e, 0))).sub(f0);
      const gz = fAt(p.add(vec3(0, 0, e))).sub(f0);
      const gmag = vec3(gx, gy, gz).length().div(e).max(1e-4); // |∇F| (forward difference)
      let de = f0.sub(iso).abs().div(gmag).mul(sys.stepScale ?? 0.7); // |F−iso|/|∇F|, under-relaxed to avoid overshoot
      if (sys.maxStep !== undefined) de = de.min(sys.maxStep); // cap the step so steep surfaces can't overshoot
      return vec2(de.max(0), p.length().div(sys.bound)); // trap = radial → core→edge palette
    });
  }

  if (kind === 'mandelbulb') {
    const powerEff = u.power.add(u.animate.mul(1.6).mul(sin(uTime.mul(0.25)))).max(2);
    return Fn(([p]: [Node]) => {
      const z = p.toVar();
      const dr = float(1).toVar();
      const r = float(0).toVar();
      const trap = float(1e10).toVar();
      Loop(ITER, () => {
        r.assign(z.length());
        If(r.greaterThan(2), () => {
          Break();
        });
        trap.assign(min(trap, z.dot(z)));
        const rSafe = max(r, 1e-9);
        dr.assign(pow(rSafe, powerEff.sub(1)).mul(powerEff).mul(dr).add(1));
        const theta = acos(clamp(z.z.div(rSafe), -1, 1)).mul(powerEff);
        const phi = atan(z.y, z.x).mul(powerEff);
        const zr = pow(rSafe, powerEff);
        z.assign(
          vec3(sin(theta).mul(cos(phi)), sin(theta).mul(sin(phi)), cos(theta)).mul(zr).add(p),
        );
      });
      const de = log(max(r, 1e-9)).mul(r).mul(0.5).div(max(dr, 1e-12));
      return vec2(max(de, 0), trap);
    });
  }

  if (kind === 'qjulia') {
    return Fn(([p]: [Node]) => {
      const c = vec4(
        u.cx.add(u.animate.mul(0.16).mul(cos(uTime.mul(0.5)))),
        u.cy.add(u.animate.mul(0.16).mul(sin(uTime.mul(0.37)))),
        u.cz.add(u.animate.mul(0.16).mul(cos(uTime.mul(0.23)))),
        u.cw.add(u.animate.mul(0.16).mul(sin(uTime.mul(0.31)))),
      ).toVar();
      const q = vec4(p, 0).toVar();
      const dq = vec4(1, 0, 0, 0).toVar();
      const mz2 = q.dot(q).toVar();
      const md2 = float(1).toVar();
      const trap = float(1e10).toVar();
      Loop(ITER, () => {
        If(mz2.greaterThan(16), () => {
          Break();
        });
        dq.assign(qmul(q, dq).mul(2));
        q.assign(qsqr(q).add(c));
        md2.assign(dq.dot(dq));
        mz2.assign(q.dot(q));
        trap.assign(min(trap, mz2));
      });
      const de = float(0.25).mul(log(max(mz2, 1e-9))).mul(mz2.div(max(md2, 1e-12)).sqrt());
      return vec2(max(de, 0), trap);
    });
  }

  if (kind === 'mandelbox') {
    return Fn(([p]: [Node]) => {
      const scaleEff = u.scale.add(u.animate.mul(0.25).mul(sin(uTime.mul(0.2))));
      const minR2 = u.minRadius.mul(u.minRadius);
      const fixR2 = float(1);
      const z = p.toVar();
      const dr = float(1).toVar();
      const trap = float(1e10).toVar();
      Loop(ITER, () => {
        // box fold
        z.assign(clamp(z, -1, 1).mul(2).sub(z));
        const r2 = z.dot(z).toVar();
        trap.assign(min(trap, r2));
        // sphere fold (piecewise factor, branchless)
        const fInner = fixR2.div(minR2);
        const fShell = fixR2.div(max(r2, 1e-9));
        const f = select(r2.lessThan(minR2), fInner, select(r2.lessThan(fixR2), fShell, float(1)));
        z.assign(z.mul(f));
        dr.assign(dr.mul(f));
        // scale + translate
        z.assign(z.mul(scaleEff).add(p));
        dr.assign(dr.mul(abs(scaleEff)).add(1));
      });
      const de = z.length().div(max(abs(dr), 1e-9));
      return vec2(max(de, 0), trap.mul(0.25));
    });
  }

  // menger sponge
  return Fn(([p]: [Node]) => {
    const ang = uTime.mul(0.25).mul(u.animate);
    const pr = rotYX(p, ang, u.spin.mul(3.1416).add(ang.mul(0.5))).toVar();
    const d = sdBox(pr, vec3(1)).toVar();
    const s = float(1).toVar();
    const trap = float(1e10).toVar();
    Loop(ITER, () => {
      const a = mod(pr.mul(s), 2).sub(1).toVar();
      s.assign(s.mul(3));
      const rr = abs(float(1).sub(abs(a).mul(3))).toVar();
      trap.assign(min(trap, a.length()));
      const da = max(rr.x, rr.y);
      const db = max(rr.y, rr.z);
      const dc = max(rr.z, rr.x);
      const cross = min(da, min(db, dc)).sub(1).div(s);
      d.assign(max(d, cross));
    });
    return vec2(max(d, 0), trap);
  });
}

export function createRaymarch(sys: RaymarchSystem, backend: 'webgpu' | 'webgl2'): RaymarchPass {
  // Param uniforms (one per ParamSpec.key), seeded from defaults so frame 0 is correct.
  const u: Record<string, Node> = {};
  for (const spec of sys.params) u[spec.key] = uniform(spec.default);
  const uTime = uniform(0);
  // NDC near-plane z differs by backend (WebGPU 0..1, WebGL2 -1..1); used for ray reconstruction.
  const uNearZ = uniform(backend === 'webgpu' ? 0 : -1);

  const map: Node = makeMap(sys, u, uTime);
  const mapF = Fn(([p]: [Node]) => map(p).x); // scalar DE for normals / shadows / AO

  // surface normal via the 4-tap tetrahedron technique
  const calcNormal = Fn(([p]: [Node]) => {
    const h = float(0.0007);
    const k0 = vec3(1, -1, -1);
    const k1 = vec3(-1, -1, 1);
    const k2 = vec3(-1, 1, -1);
    const k3 = vec3(1, 1, 1);
    return normalize(
      k0
        .mul(mapF(p.add(k0.mul(h))))
        .add(k1.mul(mapF(p.add(k1.mul(h)))))
        .add(k2.mul(mapF(p.add(k2.mul(h)))))
        .add(k3.mul(mapF(p.add(k3.mul(h))))),
    );
  });

  const calcAO = Fn(([p, n]: [Node, Node]) => {
    const occ = float(0).toVar();
    const sca = float(1).toVar();
    Loop(5, ({ i }: { i: Node }) => {
      const hr = float(0.01).add(float(0.12).mul(float(i)).div(4));
      const dd = mapF(p.add(n.mul(hr)));
      occ.addAssign(hr.sub(dd).mul(sca));
      sca.assign(sca.mul(0.95));
    });
    return clamp(occ.mul(2.5).oneMinus(), 0, 1);
  });

  const softShadow = Fn(([ro, rd]: [Node, Node]) => {
    const res = float(1).toVar();
    const t = float(0.02).toVar();
    Loop(28, () => {
      const hh = mapF(ro.add(rd.mul(t))).toVar();
      res.assign(min(res, float(14).mul(hh).div(t)));
      t.addAssign(clamp(hh, 0.02, 0.5));
      If(hh.lessThan(0.0008), () => {
        Break();
      });
      If(t.greaterThan(float(sys.bound).mul(3)), () => {
        Break();
      });
    });
    return clamp(res, 0, 1);
  });

  const BG_LO = vec3(0.016, 0.022, 0.045);
  const BG_HI = vec3(0.04, 0.05, 0.09);
  const LIGHT = vec3(0.6, 0.85, 0.5).normalize();

  const mat = new MeshBasicNodeMaterial();
  mat.depthTest = false;
  mat.depthWrite = false;
  mat.toneMapped = false;

  // Full-screen: a 2-unit plane whose vertexNode is written straight to clip space (z=far).
  mat.vertexNode = vec4(positionGeometry.x, positionGeometry.y, 1, 1);

  mat.colorNode = Fn(() => {
    // reconstruct a world-space ray for this pixel from the orbit camera (auto-bound nodes)
    const ndc = screenUV.mul(2).sub(1);
    const clip = vec4(ndc.x, ndc.y, uNearZ, 1);
    const viewH = cameraProjectionMatrixInverse.mul(clip);
    const rdView = normalize(viewH.xyz.div(viewH.w));
    const rd = normalize(cameraWorldMatrix.mul(vec4(rdView, 0)).xyz).toVar();
    const ro = vec3(cameraPosition).toVar();

    const col = mix(BG_LO, BG_HI, ndc.y.mul(0.5).add(0.5)).toVar();

    // clip the march to the fractal's bounding sphere (origin, radius bound)
    const bnd = float(sys.bound);
    const bdot = ro.dot(rd);
    const cc = ro.dot(ro).sub(bnd.mul(bnd));
    const disc = bdot.mul(bdot).sub(cc);
    If(disc.greaterThan(0), () => {
      const sq = disc.sqrt();
      const tN = max(bdot.negate().sub(sq), 0).toVar();
      const tF = bdot.negate().add(sq).toVar();
      If(tF.greaterThan(tN), () => {
        const t = tN.toVar();
        const hit = float(0).toVar();
        const hp = vec3(0).toVar();
        const trap = float(0).toVar();
        Loop(sys.maxSteps, () => {
          const p = ro.add(rd.mul(t)).toVar();
          const m = map(p).toVar();
          const d = m.x.toVar();
          If(d.lessThan(max(float(0.00035).mul(t), 0.00004)), () => {
            hit.assign(1);
            hp.assign(p);
            trap.assign(m.y);
            Break();
          });
          t.addAssign(d);
          If(t.greaterThan(tF), () => {
            Break();
          });
        });
        If(hit.greaterThan(0.5), () => {
          const n = calcNormal(hp).toVar();
          If(n.dot(rd).greaterThan(0), () => n.assign(n.negate())); // face the camera (implicit surfaces flip sign)
          const diff = max(n.dot(LIGHT), 0).toVar();
          const sh = softShadow(hp.add(n.mul(0.0025)), LIGHT).toVar();
          const ao = calcAO(hp, n).toVar();
          const amb = n.y.mul(0.25).add(0.4).toVar();
          const fres = pow(max(float(1).sub(n.dot(rd.negate()).max(0)), 0), 3).toVar();
          // orbit-trap → cosine palette
          const tt = trap.sqrt().mul(2.4).add(u.colShift.mul(6.2832)).toVar();
          const base = vec3(
            cos(tt).mul(0.5).add(0.5),
            cos(tt.add(2.1)).mul(0.5).add(0.5),
            cos(tt.add(4.2)).mul(0.5).add(0.5),
          ).toVar();
          const lit = base
            .mul(amb.mul(ao))
            .add(base.mul(diff.mul(sh)))
            .add(vec3(1).mul(fres.mul(ao).mul(0.45)));
          col.assign(lit);
        });
      });
    });

    return vec4(clamp(col, 0, 1), 1);
  })();

  const geo = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;

  return {
    mesh,
    cameraDistance: sys.camDist,
    setParams(p: Record<string, number>): void {
      for (const spec of sys.params) if (spec.key in p) u[spec.key].value = p[spec.key];
    },
    update(elapsed: number): void {
      uTime.value = elapsed;
    },
    dispose(): void {
      geo.dispose();
      mat.dispose();
    },
  };
}

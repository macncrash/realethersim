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
  cross,
  length,
  dot,
  sqrt,
  fract,
  floor,
  smoothstep,
  exp,
  tanh,
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

// ── Procedural noise for the volumetric (Volume) systems: hash → 3D value noise → FBM → IQ domain
// warp. Pure straight-line expression graphs (no Loop/If), so they compose inside the per-pixel march.
// sin-free Hoskins hash (GPU-portable). value noise uses a quintic (C1) fade so it's smooth across cells.
const hash31 = Fn(([c]: [Node]) => {
  const p = fract(c.mul(0.1031)).toVar();
  p.addAssign(dot(p, p.yzx.add(33.33)));
  return fract(p.x.add(p.y).mul(p.z));
});
const vnoise = Fn(([p]: [Node]) => {
  const i = floor(p).toVar();
  const f = fract(p).toVar();
  const u = f.mul(f).mul(f).mul(f.mul(f.mul(6).sub(15)).add(10)).toVar(); // 6t⁵−15t⁴+10t³
  const c000 = hash31(i.add(vec3(0, 0, 0)));
  const c100 = hash31(i.add(vec3(1, 0, 0)));
  const c010 = hash31(i.add(vec3(0, 1, 0)));
  const c110 = hash31(i.add(vec3(1, 1, 0)));
  const c001 = hash31(i.add(vec3(0, 0, 1)));
  const c101 = hash31(i.add(vec3(1, 0, 1)));
  const c011 = hash31(i.add(vec3(0, 1, 1)));
  const c111 = hash31(i.add(vec3(1, 1, 1)));
  const x00 = mix(c000, c100, u.x);
  const x10 = mix(c010, c110, u.x);
  const x01 = mix(c001, c101, u.x);
  const x11 = mix(c011, c111, u.x);
  const y0 = mix(x00, x10, u.y);
  const y1 = mix(x01, x11, u.y);
  return mix(y0, y1, u.z); // [0,1]
});
function makeFbm(OCT: number) {
  return Fn(([p]: [Node]) => {
    const pp = p.toVar();
    const sum = float(0).toVar();
    const amp = float(0.5).toVar();
    const norm = float(0).toVar();
    for (let o = 0; o < OCT; o++) {
      sum.addAssign(amp.mul(vnoise(pp)));
      norm.addAssign(amp);
      amp.mulAssign(0.5);
      pp.mulAssign(2.0);
    }
    return sum.div(norm); // [0,1]
  });
}
const fbm3 = makeFbm(3);
// cheap single-octave IQ domain warp (4 fbm calls) — plasma + tunnel
const warp1 = Fn(([p]: [Node]) => {
  const q = vec3(fbm3(p), fbm3(p.add(vec3(5.2, 1.3, 2.8))), fbm3(p.add(vec3(1.7, 9.2, 3.4)))).toVar();
  return fbm3(p.add(q.mul(4.0)));
});
// full recursive IQ domain warp (7 fbm calls) — nebula only (flowing filaments are the whole look)
const warpFull = Fn(([p]: [Node]) => {
  const q = vec3(fbm3(p), fbm3(p.add(vec3(5.2, 1.3, 2.8))), fbm3(p.add(vec3(1.7, 9.2, 3.4)))).toVar();
  const pq = p.add(q.mul(4.0)).toVar();
  const r = vec3(
    fbm3(pq.add(vec3(1.7, 9.2, 8.3))),
    fbm3(pq.add(vec3(8.3, 2.8, 1.7))),
    fbm3(pq.add(vec3(2.6, 6.1, 5.4))),
  ).toVar();
  return fbm3(p.add(r.mul(4.0)));
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
  if (kind === 'togliatti') {
    // Togliatti quintic — the degree-5 surface with the maximal 31 ordinary double points.
    // Togliatti/Barth affine real form; the sqrt(5) terms give it pentagonal (icosahedral) symmetry.
    const s5 = float(2.2360679775); // sqrt(5)
    const x2 = x.mul(x), y2 = y.mul(y), z2 = z.mul(z);
    const x3 = x2.mul(x), x4 = x2.mul(x2), y4 = y2.mul(y2);
    // 64·(x−1)·(x⁴ − 4x³ − 10x²y² − 4x² + 16x − 20xy² + 5y⁴ + 16 − 20y²)
    const poly = x4
      .sub(x3.mul(4))
      .sub(x2.mul(y2).mul(10))
      .sub(x2.mul(4))
      .add(x.mul(16))
      .sub(x.mul(y2).mul(20))
      .add(y4.mul(5))
      .add(16)
      .sub(y2.mul(20));
    const t1 = x.sub(1).mul(poly).mul(64);
    // 5√5·(2z − √5 − 1)·(4(x²+y²−z²) + (1 + 3√5))²
    const inner = x2.add(y2).sub(z2).mul(4).add(s5.mul(3).add(1));
    const t2 = z.mul(2).sub(s5).sub(1).mul(inner.mul(inner)).mul(s5.mul(5));
    return t1.sub(t2); // 64(x−1)(…) − 5√5(2z−√5−1)(4(x²+y²−z²)+1+3√5)²
  }
  if (kind === 'whitneyUmbrella') {
    // Whitney umbrella — the canonical Whitney cross-cap: x² = y²·z.
    // Self-intersecting umbrella sheet for z>0 plus the singular handle line x=y=0, z<0.
    // The whole z-axis has vanishing gradient (∇F = (2x, −2yz, −y²) = 0 when x=y=0),
    // so the DE step is heavily under-relaxed and hard-capped to avoid overshoot.
    const x2 = x.mul(x), y2 = y.mul(y);
    return x2.sub(y2.mul(z)); // x² − y²z = iso
  }
  if (kind === 'tooth') {
    // Tooth / cushion quartic: x⁴+y⁴+z⁴ − (x²+y²+z²). Bounded body in [-1,1]³ with four
    // cusp-like dimples; the origin is a singular point (F=0, ∇F=0).
    const x2 = x.mul(x), y2 = y.mul(y), z2 = z.mul(z);
    return x2.mul(x2).add(y2.mul(y2)).add(z2.mul(z2)).sub(x2.add(y2).add(z2)); // x⁴+y⁴+z⁴ − (x²+y²+z²)
  }
  if (kind === 'lidinoid')
    return sin(x.mul(2)).mul(cos(y)).mul(sin(z))
      .add(sin(y.mul(2)).mul(cos(z)).mul(sin(x)))
      .add(sin(z.mul(2)).mul(cos(x)).mul(sin(y)))
      .mul(0.5)
      .sub(
        cos(x.mul(2)).mul(cos(y.mul(2)))
          .add(cos(y.mul(2)).mul(cos(z.mul(2))))
          .add(cos(z.mul(2)).mul(cos(x.mul(2))))
          .mul(0.5),
      )
      .add(0.15); // Lidinoid: ½Σ sin2x·cosy·sinz − ½Σ cos2x·cos2y + 0.15
  if (kind === 'dingDong') {
    // Ding-dong surface x²+y²−z²+z³, cusp axis remapped to world up (formula z → world y) so the
    // bell stands upright, plus a +0.5 recentre so the closed lobe (z∈[0,1]) frames around the origin.
    const X = x, Y = z;
    const Z = y.add(0.5);
    const Z2 = Z.mul(Z);
    return X.mul(X).add(Y.mul(Y)).sub(Z2).add(Z2.mul(Z)); // x²+y²−z²+z³
  }
  if (kind === 'dupinCyclide') {
    // Dupin ring cyclide — the inversion of a torus; every line of curvature is a circle.
    // Quartic (x²+y²+z²+b²−d²)² − 4(aX−cd)² − 4b²y² with a=1.9, c=1, b²=a²−c²=2.61, d=1.4
    // (a>d>c ⇒ ring cyclide). The body is off-axis (centre x≈−1), so X = x − 1 recentres it
    // on the origin for the bounding sphere / radial trap. Smooth (min|∇F|≈4.6 ⇒ no nodes).
    const a = float(1.9);
    const X = x.sub(1.0); // recentre: ring spans x∈[−4.3,2.3] about x=−1
    const s = X.mul(X).add(y.mul(y)).add(z.mul(z)).add(0.65); // …+ (b²−d²)=0.65
    const t = X.mul(a).sub(1.4); // aX − c·d  (c·d = 1.4)
    return s.mul(s).sub(t.mul(t).mul(4)).sub(y.mul(y).mul(10.44)); // s² − 4t² − 4b²y²  (4b²=10.44)
  }
  if (kind === 'orthocircle') {
    // Orthocircle — three mutually orthogonal ring-tubes (a=0.075, b=3). Each factor
    // ((u²+v²−1)²+w²) is a fattened unit ring in a coordinate plane; their product, minus
    // a²(1+b·r²), fuses the three rings into one smooth degree-12 surface. ∇F stays bounded
    // away from 0 on the surface (probe: |∇F|∈[0.14,0.79]), so no stepScale/maxStep needed.
    const x2 = x.mul(x), y2 = y.mul(y), z2 = z.mul(z);
    const r1 = x2.add(y2).sub(1), t1 = r1.mul(r1).add(z2); // ring in xy-plane (axis z)
    const r2 = y2.add(z2).sub(1), t2 = r2.mul(r2).add(x2); // ring in yz-plane (axis x)
    const r3 = z2.add(x2).sub(1), t3 = r3.mul(r3).add(y2); // ring in zx-plane (axis y)
    const rr = x2.add(y2).add(z2);
    // a² = 0.075² = 0.005625, a²·b = 0.005625·3 = 0.016875
    return t1.mul(t2).mul(t3).sub(float(0.005625).add(rr.mul(0.016875))); // ∏ringᵢ − a²(1+b·r²)
  }
  if (kind === 'decocube') {
    // Decocube — a rounded cube *frame* of 12 tube-edges, built as a product of three
    // intersecting-torus factors. r = 0.82 sets the tube offset, a² = 0.0004 (a = 0.02) the
    // tube thickness. Each factor ((·²+·²−r²)² + (·²−1)²) is a torus around one axis capped at ±1.
    const x2 = x.mul(x), y2 = y.mul(y), z2 = z.mul(z);
    const r2 = float(0.6724); // 0.82²
    const a2 = float(0.0004); // a = 0.02
    const f1 = x2.add(y2).sub(r2);
    const f2 = y2.add(z2).sub(r2);
    const f3 = z2.add(x2).sub(r2);
    const zc = z2.sub(1), xc = x2.sub(1), yc = y2.sub(1);
    const t1 = f1.mul(f1).add(zc.mul(zc));
    const t2 = f2.mul(f2).add(xc.mul(xc));
    const t3 = f3.mul(f3).add(yc.mul(yc));
    return t1.mul(t2).mul(t3).sub(a2); // ∏ tori − a²  → the 12-edge cube frame
  }
  if (kind === 'endrassOctic') {
    // Endraß octic — the degree-8 surface with 168 real nodes (the record for octics), w = 1.
    // A product of four planes minus the square of a degree-4 polynomial in (x²+y²) and z; the
    // √2 constants give the node cluster its 8-fold dihedral symmetry. ∇F vanishes at the 168
    // nodes and the field swings ~10⁴× across the surface, so the DE step is strongly under-relaxed
    // and hard-capped (like togliatti/barth/kummer) to avoid overshooting the pinch points.
    const s2 = float(1.4142135624); // √2
    const x2 = x.mul(x), y2 = y.mul(y), z2 = z.mul(z);
    const z4 = z2.mul(z2);
    const r2 = x2.add(y2);
    const sum = x.add(y), dif = x.sub(y);
    // 64·(x²−1)(y²−1)((x+y)²−2)((x−y)²−2)
    const t1 = x2.sub(1)
      .mul(y2.sub(1))
      .mul(sum.mul(sum).sub(2))
      .mul(dif.mul(dif).sub(2))
      .mul(64);
    // inner = −4(1+√2)(x²+y²)² + (8(2+√2)z² + 2(2+7√2))(x²+y²) − 16z⁴ + 8(1+2√2)z² − (1+12√2)
    const inner = r2.mul(r2).mul(s2.add(1).mul(-4))
      .add(z2.mul(s2.add(2).mul(8)).add(s2.mul(7).add(2).mul(2)).mul(r2))
      .sub(z4.mul(16))
      .add(z2.mul(s2.mul(2).add(1).mul(8)))
      .sub(s2.mul(12).add(1));
    return t1.sub(inner.mul(inner)); // 64·∏planes − inner²
  }
  if (kind === 'octicLattice') {
    // "Octic node lattice": a quartic double-well per axis Qₐ = a⁴ − a² = a²(a²−1) (zeros at 0, ±1),
    // multiplied across the three axes, with a nodal-coupling term (x²−y²)(y²−z²)(z²−x²) that breaks the
    // cubic symmetry into a crystalline cell lattice, plus a small xyz term. F = QxQyQz − 0.028·coupling
    // − 0.012·xyz. Very high degree ⇒ ∇F swings hard near the nodes, so the DE step is strongly
    // under-relaxed + hard-capped (like endrassOctic/togliatti).
    const x2 = x.mul(x), y2 = y.mul(y), z2 = z.mul(z);
    const qx = x2.mul(x2).sub(x2); // x⁴ − x²
    const qy = y2.mul(y2).sub(y2);
    const qz = z2.mul(z2).sub(z2);
    const coupling = x2.sub(y2).mul(y2.sub(z2)).mul(z2.sub(x2)); // (x²−y²)(y²−z²)(z²−x²)
    return qx.mul(qy).mul(qz).sub(coupling.mul(0.028)).sub(x.mul(y).mul(z).mul(0.012));
  }
  if (kind === 'cassini') {
    // Cassini oval of revolution. Long axis remapped to world-up (formula x → world y) so the
    // peanut stands upright. a=1, b=1.1 ⇒ connected dumbbell; a⁴−b⁴ = −0.4641.
    const X = y, Y = x, Z = z; // math-x (long axis) ← world y
    const X2 = X.mul(X), Y2 = Y.mul(Y), Z2 = Z.mul(Z);
    const r2 = X2.add(Y2).add(Z2);
    return r2.mul(r2).sub(X2.sub(Y2).sub(Z2).mul(2)).sub(0.4641); // (x²+y²+z²)² − 2a²(x²−y²−z²) + a⁴−b⁴
  }
  return cheb8(x).add(cheb8(y)).add(cheb8(z)); // default (unreachable for registered kinds)
};
const SURFACE_KINDS = [
  'gyroid', 'schwarzP', 'schwarzD', 'schoenIWP', 'neovius', 'chmutov',
  'heart', 'tanglecube', 'goursat', 'barth',
  'kummer', 'clebsch', 'cayley', 'fischerKoch', 'schwarzCLP',
  'togliatti', 'whitneyUmbrella', 'tooth', 'lidinoid', 'dingDong',
  'dupinCyclide', 'orthocircle', 'decocube', 'endrassOctic', 'cassini', 'octicLattice',
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

  if (kind === 'kaleidoTunnel') {
    // SDF: fold xy into N mirror wedges (kaleidoscope), tile z into a fly-through tunnel, place a hollow
    // hex-tube per cell; pack a flat-facet id into the trap output for the colorNode's faceted palette.
    return Fn(([p]: [Node]) => {
      const N = max(u.symmetry, float(2)); // fold count (guard ≥2)
      const cell = u.cellScale;
      const wedge = float(6.2831853).div(N).toVar();
      const zAdv = p.z.add(uTime.mul(u.speed)).toVar(); // tunnel scrolls toward the camera
      const zt = mod(zAdv, cell).sub(cell.mul(0.5)).toVar();
      const cellId = floor(zAdv.div(cell)).toVar();
      const tw = u.twist.mul(p.z); // depth-proportional helix twist
      const cw = cos(tw), sw = sin(tw);
      const rx0 = p.x.mul(cw).sub(p.y.mul(sw));
      const ry0 = p.x.mul(sw).add(p.y.mul(cw));
      const r = length(vec2(rx0, ry0)).toVar();
      const a0 = atan(ry0, rx0); // 2-arg atan; atan(0,0)=0 → finite on the r=0 axis
      const a = abs(mod(a0, wedge).sub(wedge.mul(0.5))).toVar(); // mirror-folded angle
      const rx = r.mul(cos(a)).toVar();
      const ry = r.mul(sin(a)).toVar();
      // IQ hexagon SDF (apothem 1), hollowed to a tube
      const kx = float(-0.8660254), ky = float(0.5), kz = float(0.57735);
      const ax = abs(rx).toVar(); const ay = abs(ry).toVar();
      const dd = min(kx.mul(ax).add(ky.mul(ay)), 0).mul(2).toVar();
      ax.subAssign(dd.mul(kx)); ay.subAssign(dd.mul(ky));
      ax.subAssign(clamp(ax, kz.mul(-1.0), kz));
      ay.subAssign(1.0);
      const hexSDF = sqrt(ax.mul(ax).add(ay.mul(ay))).mul(select(ay.lessThan(0), float(-1), float(1)));
      const hex = abs(hexSDF).sub(0.18).toVar(); // hollow tube, thickness 0.18
      const zc = abs(zt).sub(cell.mul(0.30)).toVar(); // z-slab → discrete ring bars
      const dOut = length(vec2(max(hex, 0), max(zc, 0)));
      const dIn = min(max(hex, zc), 0);
      const d = dOut.add(dIn).toVar();
      // facet id → trap: per-ring hash (∈[0,0.49)) + 0.5 for the mirror half → two-tone faceting
      const segHash = fract(sin(cellId.mul(12.9898)).mul(43758.5453)).mul(0.49).toVar();
      const half = select(a.greaterThan(wedge.mul(0.25)), float(0.5), float(0));
      const trap = segHash.add(half).toVar(); // ∈[0,0.99); decoded raw in colorNode (NOT sqrt'd)
      return vec2(max(d, 0), trap);
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

    if (sys.sdf === 'blackhole') {
      // ── Non-SDF marcher: integrate a photon along a bent null geodesic (Schwarzschild). ──
      // Geometric units r_s = 1 (M = ½). The accel a = −1.5·r_s·L²·p/r⁵ is purely radial, so
      // L² = |p×v|² is conserved exactly and computed once → velocity-Verlet keeps the orbit shape.
      const RS = float(sys.rs ?? 1); // event-horizon radius
      const RIN = float(sys.diskIn ?? 3); // accretion-disk inner edge (ISCO = 3·r_s)
      const ROUT = u.disk; // disk outer edge (live param)
      const RESC = float(sys.bound); // photon escape radius
      const STEP = float(sys.photonStep ?? 0.1); // adaptive-dt fraction

      const pos = ro.toVar();
      const dir = rd.toVar(); // unit ray direction, advanced as a velocity
      const h2 = dot(cross(pos, dir), cross(pos, dir)).toVar(); // conserved L²
      const prevY = pos.y.toVar();
      const emis = vec3(0).toVar(); // accumulated disk emission (a ray can cross the plane twice)
      const done = float(0).toVar(); // 1 ⇒ fell through the horizon (pure black)

      Loop(sys.maxSteps, () => {
        const r = length(pos).toVar();
        If(r.lessThan(RS), () => { done.assign(1); Break(); }); // captured → shadow
        If(r.greaterThan(RESC), () => { Break(); }); // escaped → sample lensed sky below
        const dt = clamp(STEP.mul(r), 0.02, 0.6).toVar(); // fine near the hole, coarse far away

        // velocity-Verlet: half-kick → drift → half-kick (a points inward, ∝ 1/r⁵)
        const r5a = max(r.mul(r).mul(r).mul(r).mul(r), 1e-6);
        const acc = pos.mul(RS.mul(-1.5).mul(h2).div(r5a));
        const vh = dir.add(acc.mul(dt.mul(0.5))).toVar();
        const pn = pos.add(vh.mul(dt)).toVar();
        const rn = length(pn);
        const r5b = max(rn.mul(rn).mul(rn).mul(rn).mul(rn), 1e-6);
        const acc2 = pn.mul(RS.mul(-1.5).mul(h2).div(r5b));
        dir.assign(vh.add(acc2.mul(dt.mul(0.5))));

        // equatorial disk crossing: y sign-flip between pos and pn, then radius ∈ [RIN, ROUT]
        If(prevY.mul(pn.y).lessThan(0), () => {
          const f = prevY.div(prevY.sub(pn.y)); // linear interp to the y=0 plane
          const cx = mix(pos.x, pn.x, f);
          const cz = mix(pos.z, pn.z, f);
          const rad = length(vec2(cx, cz)).toVar();
          If(rad.greaterThan(RIN).and(rad.lessThan(ROUT)), () => {
            const s = clamp(rad.sub(RIN).div(ROUT.sub(RIN)), 0, 1);
            // hot blue-white inner → cool deep-red outer, hue nudged by colShift
            const base = mix(vec3(1.0, 0.95, 0.85), vec3(1.0, 0.35, 0.1), pow(s, 0.7)).toVar();
            const hue = u.colShift.mul(6.2832);
            base.assign(base.mul(vec3(
              cos(hue).mul(0.15).add(0.9),
              cos(hue.add(2.1)).mul(0.15).add(0.9),
              cos(hue.add(4.2)).mul(0.15).add(0.9),
            )));
            const inten = pow(RIN.div(rad), 0.75); // Shakura–Sunyaev-ish radial falloff
            const ang = atan(cz, cx); // two-arg atan (no atan2 in TSL)
            const turb = sin(ang.mul(7).add(uTime.mul(0.6)).add(rad.mul(2))).mul(0.18).add(0.82);
            // relativistic Doppler beaming + gravitational redshift → the iconic asymmetry
            const vdir = normalize(cross(vec3(0, 1, 0), normalize(vec3(cx, 0, cz)))); // prograde tangent
            const beta = sqrt(RS.mul(0.5).div(max(rad.sub(RS.mul(1.5)), 1e-3))); // √(M/(r−3M)), M=r_s/2
            const gam = float(1).div(sqrt(max(float(1).sub(beta.mul(beta)), 1e-4)));
            const nv = dot(normalize(dir), vdir);
            const dopp = float(1).div(gam.mul(float(1).sub(beta.mul(nv).mul(u.beaming))));
            const boost = dopp.mul(dopp).mul(dopp).mul(sqrt(max(float(1).sub(RS.div(rad)), 0))); // D³·√(1−r_s/r)
            emis.addAssign(base.mul(inten).mul(turb).mul(boost).mul(u.exposure));
          });
        });

        prevY.assign(pn.y);
        pos.assign(pn);
      });

      // escaped rays carry the LENSED direction → a procedural starfield smears into the Einstein ring
      const skyDir = normalize(dir);
      const q = floor(skyDir.mul(140));
      const hsh = fract(sin(dot(q, vec3(12.9898, 78.233, 37.719))).mul(43758.5453));
      const star = smoothstep(0.9975, 1.0, hsh).mul(vec3(0.9, 0.95, 1.0));
      const sky = mix(BG_LO, BG_HI, skyDir.y.mul(0.5).add(0.5)).add(star);
      col.assign(sky.add(emis)); // disk glows over the bent sky
      col.assign(mix(col, vec3(0), done)); // horizon → pure black
    } else if (sys.sdf === 'conformal') {
      // ── 2D conformal map: per-pixel w=f(z) of the complex plane, coloured by a checkerboard of w
      //    (NO marching). Complex numbers are vec2; every divide floors |denom|² so poles stay finite.
      const cmul = (a: Node, b: Node): Node => vec2(a.x.mul(b.x).sub(a.y.mul(b.y)), a.x.mul(b.y).add(a.y.mul(b.x)));
      const cdiv = (a: Node, b: Node): Node => {
        const den = max(b.x.mul(b.x).add(b.y.mul(b.y)), 1e-6); // pole guard → finite everywhere
        return vec2(a.x.mul(b.x).add(a.y.mul(b.y)), a.y.mul(b.x).sub(a.x.mul(b.y))).div(den);
      };
      const z0 = vec2(ndc.x, ndc.y).mul(u.zoom).toVar();
      const th = uTime.mul(0.25).mul(u.animate); // conformal: rotating z preserves the look
      const z = cmul(z0, vec2(cos(th), sin(th))).toVar();
      const w = vec2(0).toVar();
      if (sys.sdf3 === 'mobius') {
        // fixed points p,q + complex multiplier λ=|λ|e^{iφ} (φ drifts with time): the Möbius flow
        const p = vec2(u.px, u.py);
        const q = vec2(u.qx, u.qy);
        const phi = u.lphase.mul(6.2832).add(uTime.mul(0.15).mul(u.animate));
        const k = vec2(cos(phi), sin(phi)).mul(u.lam).toVar();
        const rhs = cmul(k, cdiv(z.sub(p), z.sub(q))).toVar(); // (w−p)/(w−q)=λ(z−p)/(z−q)
        w.assign(cdiv(p.sub(cmul(q, rhs)), vec2(1, 0).sub(rhs)));
      } else if (sys.sdf3 === 'inverse') {
        w.assign(cdiv(vec2(1, 0), z)); // 1/z
      } else if (sys.sdf3 === 'square') {
        w.assign(cmul(z, z)); // z²
      } else if (sys.sdf3 === 'cexp') {
        const ex = exp(clamp(z.x, -8, 8)); // clamp Re so e^Re can't overflow fp32
        w.assign(vec2(ex.mul(cos(z.y)), ex.mul(sin(z.y))));
      } else {
        w.assign(z.add(cdiv(vec2(1, 0), z)).mul(0.5)); // joukowski ½(z+1/z)
      }
      // checkerboard of w with pixel-footprint smoothstep AA (band widens where |w| varies fast)
      const sw = vec2(sin(w.x.mul(u.scale)), sin(w.y.mul(u.scale)));
      const prod = sw.x.mul(sw.y).toVar();
      const aa = clamp(length(w).mul(0.04).add(0.06), 0.04, 0.5);
      const chk = smoothstep(aa.negate(), aa, prod).toVar();
      const a0 = u.colShift.mul(6.2832);
      const cA = vec3(cos(a0), cos(a0.add(2.1)), cos(a0.add(4.2))).mul(0.35).add(0.4);
      const cB = vec3(cos(a0.add(0.9)), cos(a0.add(3.0)), cos(a0.add(5.1))).mul(0.35).add(0.18);
      const tile = mix(cA, cB, chk).toVar();
      const fade = float(1).div(float(1).add(length(w).mul(0.18))); // far cells dissolve into the BG
      col.assign(mix(col, tile, fade));
    } else if (sys.sdf === 'volumetric') {
      // ── Non-SDF marcher: accumulate volumetric EMISSION through a domain-warped density field. ──
      // Fixed-step ray, no bending. Density e drives o += exp(−e·k)·palette·e·Δs·E (the twigl look).
      const STEP = float(sys.volStep ?? 0.06);
      const K = u.absorb; // self-attenuation: e·exp(−e·k) peaks at e=1/k → mid-density wisps glow most
      const SCALE = u.scale; // field frequency (capped in the registry for fp32 hash safety)
      const RB = float(sys.bound);

      // occlude (opt-in per preset): front-to-back compositing so near density occludes far → crisp
      // SOLID voxels. Left off (default) for plasma/nebula → pure additive emission, byte-identical.
      const occlude = !!sys.occlude;
      const pos = ro.toVar();
      // per-pixel step dither (occlusion only) → breaks the fixed-march terracing on hard voxel faces
      // into fine noise. Plasma/nebula are smooth and stay un-dithered (byte-identical).
      if (occlude) pos.addAssign(rd.mul(STEP.mul(fract(sin(ndc.x.mul(12.99).add(ndc.y.mul(78.23))).mul(43758.5)))));
      const emis = vec3(0).toVar();
      const trans = occlude ? float(1).toVar() : null; // remaining transmittance along the ray
      // camDist often EXCEEDS bound for these compact volumes, so only break once we've entered then left
      const entered = float(0).toVar();
      const ca = cos(uTime.mul(0.15)).toVar(); // slow domain churn about Y so the volume evolves
      const sa = sin(uTime.mul(0.15)).toVar();

      Loop(sys.maxSteps, () => {
        const r = length(pos).toVar();
        If(r.lessThan(RB), () => { entered.assign(1); });
        If(entered.greaterThan(0.5).and(r.greaterThan(RB)), () => { Break(); });
        If(r.lessThan(RB), () => {
          const q = vec3(
            pos.x.mul(ca).sub(pos.z.mul(sa)),
            pos.y,
            pos.x.mul(sa).add(pos.z.mul(ca)),
          ).mul(SCALE).toVar();
          const e = float(0).toVar();
          const toneOff = occlude ? float(0).toVar() : null; // per-cell two-tone hue offset (voxel only)
          if (sys.sdf2 === 'plasmaOrb') {
            // hollow plasma shell at r≈1 (thin), textured by hi-freq trig × one warp octave; pow → contrast
            const base = clamp(float(1).sub(abs(length(q).sub(1.0)).div(0.42)), 0, 1).toVar();
            const tex = cos(q.x.mul(9).add(uTime))
              .mul(cos(q.y.mul(9).sub(uTime.mul(0.7))))
              .mul(cos(q.z.mul(9))).mul(0.5).add(0.5).toVar();
            const fil = warp1(q.mul(2.2)).toVar(); // marbled filaments
            e.assign(pow(base, 1.5).mul(tex.mul(0.45).add(0.25)).mul(fil.mul(1.6).pow(1.5)));
          } else if (sys.sdf2 === 'voxelCloud') {
            // "I Eat Pixels": blocky fire/ice cubes — quantize q to a cubic lattice, density at the cell
            // CENTRE (flat per voxel), two-tone by a per-cell hash, rim-light faces. Occlusion makes them solid.
            const N = float(sys.cells ?? 3.0);
            const cell = floor(q.mul(N)).toVar();
            const cc2 = cell.add(0.5).div(N).toVar();
            const dens = max(fbm3(cc2.mul(2.0)).sub(0.5), 0).mul(float(1).div(float(1).sub(0.5))).toVar();
            toneOff.assign(hash31(cell).sub(0.5).mul(2.6)); // ±1.3 rad palette swing → fire vs ice
            const lf = fract(q.mul(N)).toVar();
            const edgeDist = min(
              min(lf.x, float(1).sub(lf.x)),
              min(min(lf.y, float(1).sub(lf.y)), min(lf.z, float(1).sub(lf.z))),
            ).toVar();
            const edge = clamp(float(1).sub(edgeDist.div(0.1)), 0, 1).mul(u.edge).toVar();
            const filled = clamp(dens.mul(1e4), 0, 1).toVar();
            e.assign(clamp(dens.add(edge.mul(filled)), 0, 1));
          } else {
            // nebula: fbm cloud (full recursive warp) thresholded to wisps, with a radial falloff
            const cloud = warpFull(q.mul(0.9).add(vec3(uTime.mul(0.05), 0, 0))).toVar();
            const fall = clamp(float(1).sub(length(q).div(2.6)), 0, 1).toVar();
            e.assign(max(cloud.sub(0.45), 0).mul(2.0).mul(fall));
          }
          const ec = clamp(e, 0, 1).toVar();
          // cosine palette keyed by density + live colShift (+ per-cell two-tone when occluding)
          let aExpr = ec.mul(2.0).add(u.colShift.mul(6.2832)).add(0.3);
          if (occlude) aExpr = aExpr.add(toneOff);
          const a = aExpr.toVar();
          const pal = vec3(cos(a), cos(a.add(2.1)), cos(a.add(4.2))).mul(0.5).add(0.5);
          if (occlude) {
            // front-to-back emission–absorption: opacity this step (Beer–Lambert), emit·transmittance, attenuate
            const aStep = float(1).sub(exp(ec.mul(K).mul(STEP).negate())).toVar();
            emis.addAssign(pal.mul(aStep).mul(trans).mul(u.exposure));
            trans.assign(trans.mul(float(1).sub(aStep)));
          } else {
            emis.addAssign(pal.mul(ec).mul(exp(ec.mul(K.negate()))).mul(STEP).mul(u.exposure));
          }
        });
        pos.addAssign(rd.mul(STEP));
        if (occlude) If(trans.lessThan(0.02), () => { Break(); }); // ray opaque — stop early
      });
      if (occlude) col.assign(col.add(emis)); // already composited (bounded by 1−transmittance)
      else col.assign(col.add(vec3(tanh(emis.x), tanh(emis.y), tanh(emis.z)))); // tanh tone-map (additive)
    } else {
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
          If(n.dot(rd).greaterThan(0), () => { n.assign(n.negate()); }); // face the camera (implicit surfaces flip sign). Braces avoid the implicit-return the arrow would otherwise hand If() — r185 warns on a return inside an inline Fn's If().
          const diff = max(n.dot(LIGHT), 0).toVar();
          const sh = softShadow(hp.add(n.mul(0.0025)), LIGHT).toVar();
          const ao = calcAO(hp, n).toVar();
          const amb = n.y.mul(0.25).add(0.4).toVar();
          const fres = pow(max(float(1).sub(n.dot(rd.negate()).max(0)), 0), 3).toVar();
          // colour: kaleidoscope = flat faceted palette; everything else = the orbit-trap cosine palette
          let base: Node;
          if (sys.sdf === 'kaleidoTunnel') {
            const isHalf = trap.greaterThan(0.5);
            const dim = select(isHalf, float(0.72), float(1.0)); // mirror half dimmed → two-tone facets
            const segBase = trap.sub(select(isHalf, float(0.5), float(0))); // per-ring hash ∈ [0,0.49)
            const hue = mod(segBase.div(0.49).mul(6).add(u.colShift.mul(6)), 6).toVar();
            const ph = floor(hue).div(6).mul(6.2831853).toVar(); // quantised hue wheel → flat per facet
            base = vec3(
              cos(ph).mul(0.4).add(0.55),
              cos(ph.add(2.094)).mul(0.4).add(0.55),
              cos(ph.add(4.188)).mul(0.4).add(0.55),
            ).mul(dim).toVar();
          } else {
            // orbit-trap → cosine palette
            const tt = trap.sqrt().mul(2.4).add(u.colShift.mul(6.2832)).toVar();
            base = vec3(
              cos(tt).mul(0.5).add(0.5),
              cos(tt.add(2.1)).mul(0.5).add(0.5),
              cos(tt.add(4.2)).mul(0.5).add(0.5),
            ).toVar();
          }
          const lit = base
            .mul(amb.mul(ao))
            .add(base.mul(diff.mul(sh)))
            .add(vec3(1).mul(fres.mul(ao).mul(0.45)));
          col.assign(lit);
        });
      });
    });
    } // end SDF path

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

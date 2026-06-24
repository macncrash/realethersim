import type { SystemDoc } from './content';

// Learn-panel content for the Parametric category — formula-driven point geometry: a map from an
// index or a (u,v) grid cell to a 3D point, sampled into a glowing cloud.

const COL = { key: 'colShift', symbol: '', meaning: '' }; // (parametric systems colour by index)
void COL;

export const PARAMETRIC_DOCS: Record<string, SystemDoc> = {
  fibonacci: {
    title: 'Fibonacci Sphere',
    about:
      'How do you spread N points as evenly as possible on a sphere? Use the golden angle — ' +
      '137.5°, derived from the Fibonacci ratio — between successive points. This is exactly the ' +
      'trick sunflowers, pinecones, and pineapples use to pack seeds (phyllotaxis), and it gives a ' +
      'near-perfect, swirl-free distribution with no clumping or seams.',
    howItWorks:
      'Walk point i up the sphere in equal height steps (so each band has equal area), and rotate by ' +
      'the golden angle each step. Because the golden ratio is the "most irrational" number, the ' +
      'points never line up into spokes — they interleave forever. The twist knob multiplies the ' +
      'angle, opening up Fibonacci spirals.',
    equations: [
      { label: 'golden angle', latex: '\\gamma = \\pi(3 - \\sqrt 5) \\approx 137.5^\\circ' },
      { label: 'point i of N', latex: 'y_i = 1 - \\tfrac{2i+1}{N}, \\quad \\theta_i = i\\,\\gamma, \\quad r_i = \\sqrt{1 - y_i^2}' },
      { label: 'position', latex: '(r_i\\cos\\theta_i,\\; y_i,\\; r_i\\sin\\theta_i)' },
    ],
    params: [
      { key: 'twist', symbol: 't', meaning: 'multiplies the golden angle; 1 = even sphere, >1 opens visible spirals' },
      { key: 'squash', symbol: 's', meaning: 'flattens the sphere toward a disk (oblate) or stretches it' },
    ],
    code: `const g = Math.PI * (3 - Math.sqrt(5));       // golden angle
for (let i = 0; i < N; i++) {
  const y = 1 - (2*i + 1)/N;                    // -1 → 1
  const r = Math.sqrt(1 - y*y);
  const th = i * g * twist;
  point(r*Math.cos(th), y*squash, r*Math.sin(th));
}`,
    links: [
      { label: 'Fibonacci sphere / lattice', url: 'https://en.wikipedia.org/wiki/Geodesic_polyhedron' },
      { label: 'Phyllotaxis (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Phyllotaxis' },
    ],
  },
  torus: {
    title: 'Torus',
    about:
      'The doughnut — the simplest non-trivial surface after the sphere. A circle of radius r swept ' +
      'around a larger ring of radius R. Topologically it’s the product of two circles, S¹×S¹, and ' +
      'it’s the natural home for systems with two independent angles (like coupled oscillators).',
    howItWorks: 'Two angles, u around the ring and v around the tube, map to a point on the surface.',
    equations: [
      { label: 'torus', latex: '\\big((R + r\\cos v)\\cos u,\\; r\\sin v,\\; (R + r\\cos v)\\sin u\\big)' },
    ],
    params: [
      { key: 'R', symbol: 'R', meaning: 'ring radius (distance from centre to the tube’s centre)' },
      { key: 'r', symbol: 'r', meaning: 'tube radius; r→R gives a horn torus, r>R a self-intersecting spindle' },
    ],
    code: `const u = a*2*Math.PI, v = b*2*Math.PI;      // a,b ∈ [0,1] grid
const w = R + r*Math.cos(v);
point(w*Math.cos(u), r*Math.sin(v), w*Math.sin(u));`,
    links: [{ label: 'Torus (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Torus' }],
  },
  klein: {
    title: 'Klein Bottle',
    about:
      'A surface with no inside and no outside — a one-sided bottle whose neck passes through its own ' +
      'wall to join the base from within. It can’t exist without self-intersecting in 3D (it truly ' +
      'lives in 4D), so what you see is the "figure-8 immersion," the least self-tangled shadow of it.',
    howItWorks:
      'A circle (parameter v) is swept around a loop (parameter u), but the circle flips orientation ' +
      'over one trip around — gluing the surface back to itself with a twist, like a 3D Möbius band.',
    equations: [
      {
        label: 'figure-8 immersion',
        latex: '\\begin{aligned} x &= (R + \\cos\\tfrac{u}{2}\\sin v - \\sin\\tfrac{u}{2}\\sin 2v)\\cos u \\\\ z &= \\sin\\tfrac{u}{2}\\sin v + \\cos\\tfrac{u}{2}\\sin 2v \\end{aligned}',
      },
    ],
    params: [{ key: 'size', symbol: 'R', meaning: 'overall radius of the bottle’s body loop' }],
    code: `const u = a*2*Math.PI, v = b*2*Math.PI;
const w = size + Math.cos(u/2)*Math.sin(v) - Math.sin(u/2)*Math.sin(2*v);
point(w*Math.cos(u), Math.sin(u/2)*Math.sin(v)+Math.cos(u/2)*Math.sin(2*v), w*Math.sin(u));`,
    links: [{ label: 'Klein bottle (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Klein_bottle' }],
  },
  mobius: {
    title: 'Möbius Strip',
    about:
      'Take a strip of paper, give it a half-twist, and glue the ends: you get a surface with only ' +
      'one side and one edge. Trace a finger along it and you cover both "faces" without lifting — ' +
      'the canonical example of a non-orientable surface.',
    howItWorks:
      'Sweep a short line segment (parameter v) around a loop (parameter u) while rotating the segment ' +
      'by half a turn over the full loop. Crank "half-twists" up for 3, 5, … twist variants.',
    equations: [
      {
        label: 'Möbius band',
        latex: '\\big((1 + \\tfrac{v}{2}\\cos\\tfrac{u}{2})\\cos u,\\; (1 + \\tfrac{v}{2}\\cos\\tfrac{u}{2})\\sin u,\\; \\tfrac{v}{2}\\sin\\tfrac{u}{2}\\big)',
      },
    ],
    params: [
      { key: 'width', symbol: 'w', meaning: 'width of the strip' },
      { key: 'twists', symbol: 'k', meaning: 'number of half-twists (1 = classic Möbius; odd stays one-sided)' },
    ],
    code: `const u = a*2*Math.PI, v = (b*2 - 1)*width;
const h = twists*u/2, rad = 1.6 + v*0.5*Math.cos(h);
point(rad*Math.cos(u), v*0.5*Math.sin(h), rad*Math.sin(u));`,
    links: [{ label: 'Möbius strip (Wikipedia)', url: 'https://en.wikipedia.org/wiki/M%C3%B6bius_strip' }],
  },
  seashell: {
    title: 'Seashell',
    about:
      'Shells grow by laying down material along a logarithmic (equiangular) spiral — the only curve ' +
      'that keeps its shape as it scales, which is why a nautilus looks self-similar at every size. ' +
      'Sweep an opening around that exponential spiral and you get the whole family of horns, conches, ' +
      'and snails from a handful of numbers.',
    howItWorks:
      'Parameter u winds along the spiral (the tube grows exponentially as it turns), while v goes ' +
      'around the opening. "Turns" sets how many whorls; "taper" stretches it along its axis.',
    equations: [
      { label: 'exponential growth', latex: 'e^{\\,u / (T\\pi)} \\;\\text{grows the tube each whorl}' },
      { label: 'spiral sweep', latex: 'x = 2(1 - e^{u/T\\pi})\\cos u\\,\\cos^2\\tfrac{v}{2}' },
    ],
    params: [
      { key: 'turns', symbol: 'T', meaning: 'number of whorls in the spiral' },
      { key: 'taper', symbol: '\\tau', meaning: 'stretch along the shell’s axis (pointier vs squat)' },
    ],
    code: `const u = a*Math.PI*turns, v = b*2*Math.PI;
const e = Math.exp(u/(turns*Math.PI)), cs = Math.cos(v/2)**2;
point(2*(1-e)*Math.cos(u)*cs, (1 - Math.exp(2*u/(turns*Math.PI)) - Math.sin(v) + e*Math.sin(v))*taper, 2*(e-1)*Math.sin(u)*cs);`,
    links: [
      { label: 'Logarithmic spiral (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Logarithmic_spiral' },
      { label: 'Seashell surface', url: 'https://en.wikipedia.org/wiki/Seashell_surface' },
    ],
  },
  superformula: {
    title: 'Superformula',
    about:
      'Johan Gielis’s 2003 "superformula" generates an astonishing range of natural shapes — ' +
      'starfish, flowers, diatoms, crystals, blobs — from a single equation by varying a few numbers. ' +
      'It generalises the superellipse to any rotational symmetry, and its 3D product gives organic ' +
      'solids that morph continuously as you turn the dials.',
    howItWorks:
      'A radius r(φ) is computed from the angle by the superformula; doing it for two angles (longitude ' +
      'φ and latitude θ) and multiplying gives a 3D surface. m sets the symmetry (number of lobes); ' +
      'n₁, n₂, n₃ pinch, bloat, and sharpen them.',
    equations: [
      {
        label: 'superformula radius',
        latex: 'r(\\varphi) = \\Big( \\big|\\cos\\tfrac{m\\varphi}{4}\\big|^{n_2} + \\big|\\sin\\tfrac{m\\varphi}{4}\\big|^{n_3} \\Big)^{-1/n_1}',
      },
      { label: '3D product (spherical product)', latex: '\\mathbf{p} = r_1(\\varphi)\\,r_2(\\theta)\\,(\\cos\\varphi\\cos\\theta,\\; \\tfrac{\\sin\\theta}{r_1},\\; \\sin\\varphi\\cos\\theta)' },
    ],
    params: [
      { key: 'm', symbol: 'm', meaning: 'rotational symmetry — the number of lobes / points' },
      { key: 'n1', symbol: 'n_1', meaning: 'overall pinch; small n₁ makes spiky stars, large n₁ rounds it' },
      { key: 'n2', symbol: 'n_2', meaning: 'shapes the lobes (one side)' },
      { key: 'n3', symbol: 'n_3', meaning: 'shapes the lobes (other side); n₂≠n₃ breaks symmetry' },
    ],
    code: `function R(angle, m, n1, n2, n3) {
  const t = m*angle/4;
  return Math.pow(Math.abs(Math.cos(t))**n2 + Math.abs(Math.sin(t))**n3, -1/n1);
}
const r1 = R(phi, m,n1,n2,n3), r2 = R(theta, m,n1,n2,n3), ct = r2*Math.cos(theta);
point(r1*Math.cos(phi)*ct, r2*Math.sin(theta), r1*Math.sin(phi)*ct);`,
    links: [
      { label: 'Superformula (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Superformula' },
      { label: 'Gielis 2003 (original paper)', url: 'https://www.amjbot.org/doi/10.3732/ajb.90.3.333' },
    ],
  },
  sunflower: {
    title: 'Sunflower',
    about:
      'The flat cousin of the Fibonacci sphere: Vogel’s 1979 model for the seed head of a sunflower. ' +
      'Place seed i at radius √i and rotate by the golden angle each step — the result is the ' +
      'interlocking left/right spiral families (parastichies) you can count on a real sunflower, and ' +
      'they always come out as consecutive Fibonacci numbers.',
    howItWorks:
      'Equal-area spacing (r = √(i/N)) keeps the seeds uniformly dense from centre to rim, while the ' +
      'golden angle guarantees no two seeds share a spoke. A gentle dome lifts it off the plane into 3D.',
    equations: [
      { label: 'Vogel’s model', latex: 'r_i = \\sqrt{i/N}, \\quad \\theta_i = i\\,\\gamma, \\quad \\gamma = \\pi(3-\\sqrt5)' },
      { label: 'position', latex: '(r_i\\cos\\theta_i,\\; d(1-r_i^2),\\; r_i\\sin\\theta_i)' },
    ],
    params: [
      { key: 'dome', symbol: 'd', meaning: 'height of the central dome (0 = flat disk)' },
      { key: 'spread', symbol: 's', meaning: 'overall radius of the seed head' },
    ],
    code: `const r = Math.sqrt((i+0.5)/N), th = i * g;     // g = golden angle
point(r*spread*Math.cos(th), dome*(1 - r*r), r*spread*Math.sin(th));`,
    links: [{ label: 'Phyllotaxis / Vogel model', url: 'https://en.wikipedia.org/wiki/Fermat%27s_spiral' }],
  },
  torusknot: {
    title: 'Torus Knot',
    about:
      'A (p,q) torus knot winds p times around the hole of a torus and q times through it before ' +
      'closing up. When p and q share no common factor the loop is genuinely knotted — (2,3) is the ' +
      'trefoil, the simplest nontrivial knot. We trace the whole loop as one dense glowing curve.',
    howItWorks:
      'A single angle t runs once around the loop. The point rides a circle of radius 2+cos(q·t) ' +
      '(the meridian winding) while that circle is carried around by the p·t longitude.',
    equations: [
      { label: '(p,q) torus knot', latex: 'x=(2+\\cos qt)\\cos pt,\\;\\; y=-\\sin qt,\\;\\; z=(2+\\cos qt)\\sin pt' },
    ],
    params: [
      { key: 'p', symbol: 'p', meaning: 'times the curve winds around the central axis (longitude)' },
      { key: 'q', symbol: 'q', meaning: 'times it winds through the hole (meridian); gcd(p,q)=1 ⇒ a knot' },
    ],
    code: `const t = (i/N)*2*Math.PI, w = 2 + Math.cos(q*t);
point(w*Math.cos(p*t), -Math.sin(q*t), w*Math.sin(p*t));`,
    links: [{ label: 'Torus knot (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Torus_knot' }],
  },
  lissajous: {
    title: 'Lissajous Curve',
    about:
      'The 3D generalisation of the figures Jules Lissajous drew in 1857 by bouncing light off two ' +
      'vibrating mirrors — and what an oscilloscope shows in XY mode. Three perpendicular sinusoids at ' +
      'integer frequencies trace an intricate closed orbit that knots and unknots as you retune them.',
    howItWorks:
      'Each coordinate is its own oscillator: x, y, z are sines of a·t, b·t, c·t. The frequency ratios ' +
      'set how many times the curve folds in each direction; the phase shears the x-oscillation.',
    equations: [
      { label: '3D Lissajous', latex: 'x=\\sin(at+\\delta),\\;\\; y=\\sin(bt),\\;\\; z=\\sin(ct)' },
    ],
    params: [
      { key: 'a', symbol: 'a', meaning: 'x-frequency' },
      { key: 'b', symbol: 'b', meaning: 'y-frequency' },
      { key: 'c', symbol: 'c', meaning: 'z-frequency' },
      { key: 'phase', symbol: '\\delta', meaning: 'phase offset on x — opens and twists the figure' },
    ],
    code: `const t = (i/N)*2*Math.PI;
point(Math.sin(a*t + phase), Math.sin(b*t), Math.sin(c*t));`,
    links: [{ label: 'Lissajous curve (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Lissajous_curve' }],
  },
  dini: {
    title: "Dini's Surface",
    about:
      'Take a pseudosphere — the trumpet-shaped surface of constant negative curvature, the geometry ' +
      'where parallel lines diverge — and twist it as it climbs. The result is Dini’s surface, a ' +
      'spiralling horn that is still, at every point, a saddle of exactly the same curvature.',
    howItWorks:
      'u winds around and up the axis; v runs from the wide mouth toward the infinitely thin cusp. The ' +
      'twist term adds a height proportional to u, shearing the tractrix profile into a helix.',
    equations: [
      {
        label: "Dini's surface",
        latex: '\\begin{aligned} x &= \\cos u\\sin v,\\;\\; z = \\sin u\\sin v \\\\ y &= \\cos v + \\ln\\tan\\tfrac{v}{2} + b\\,u \\end{aligned}',
      },
    ],
    params: [
      { key: 'twist', symbol: 'b', meaning: 'how fast the horn spirals up its axis' },
      { key: 'turns', symbol: 'T', meaning: 'number of revolutions swept' },
    ],
    code: `const u = a*turns*2*Math.PI, v = 0.12 + b*(1.45-0.12);
point(Math.cos(u)*Math.sin(v), Math.cos(v)+Math.log(Math.tan(v/2))+twist*u-1, Math.sin(u)*Math.sin(v));`,
    links: [{ label: "Dini's surface (Wikipedia)", url: 'https://en.wikipedia.org/wiki/Dini%27s_surface' }],
  },
  harmonic: {
    title: 'Harmonic Sphere',
    about:
      'A sphere whose radius breathes in and out according to a product of sinusoids — the visual ' +
      'signature of a spherical-harmonic mode, the natural vibration patterns of a sphere that show up ' +
      'everywhere from atomic orbitals to the cosmic microwave background. Tuning the lobe counts walks ' +
      'you through petals, sea-urchins, and bumpy little planets.',
    howItWorks:
      'For each (φ, θ) on the sphere, displace the radius by amp·sin(mφ)·sin(kθ). m sets how many lobes ' +
      'run around the equator, k how many run pole-to-pole; amplitude controls how far they bulge.',
    equations: [
      { label: 'modulated radius', latex: 'r(\\varphi,\\theta) = 1 + A\\,\\sin(m\\varphi)\\,\\sin(k\\theta)' },
      { label: 'on the sphere', latex: '(r\\sin\\theta\\cos\\varphi,\\; r\\cos\\theta,\\; r\\sin\\theta\\sin\\varphi)' },
    ],
    params: [
      { key: 'lobesU', symbol: 'm', meaning: 'lobes around the equator (longitude)' },
      { key: 'lobesV', symbol: 'k', meaning: 'lobes from pole to pole (latitude)' },
      { key: 'amp', symbol: 'A', meaning: 'how far the surface bulges in and out' },
    ],
    code: `const phi = a*2*Math.PI, theta = b*Math.PI, st = Math.sin(theta);
const r = 1 + amp*Math.sin(m*phi)*Math.sin(k*theta);
point(r*st*Math.cos(phi), r*Math.cos(theta), r*st*Math.sin(phi));`,
    links: [{ label: 'Spherical harmonics (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Spherical_harmonics' }],
  },
};

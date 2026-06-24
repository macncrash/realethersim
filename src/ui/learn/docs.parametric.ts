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
};

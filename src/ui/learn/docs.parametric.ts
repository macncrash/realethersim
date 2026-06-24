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
  "boy": {
    "title": "Boy's Surface",
    "about": "Boy's surface is what you get when you try to turn the real projective plane RP² — a sphere with antipodal points glued together — into a smooth shape in ordinary 3D space. Werner Boy discovered in 1901 that it can be done without any creases or pinch points, only gentle self-intersection, settling a question his advisor David Hilbert thought was impossible. The result is a strangely beautiful three-lobed form with perfect 3-fold symmetry, like a Klein bottle's more graceful cousin.",
    "howItWorks": "The whole surface is drawn from a single closed formula found by François Apéry in 1986. Two angles u and v, each running over [0, π], are fed through three rational-trigonometric expressions that share one common denominator. Because that denominator never reaches zero, every point lands at a finite place — the surface immerses cleanly, folding through itself three times to form the lobes. The bulge knob scales the denominator's oscillation, swelling or relaxing the lobes while keeping everything finite.",
    "equations": [
      {
        "label": "shared denominator",
        "latex": "D = 2 - \\beta\\sqrt{2}\\,\\sin(3u)\\sin(2v)"
      },
      {
        "label": "Apéry's immersion",
        "latex": "\\begin{aligned} x &= \\tfrac{1}{D}\\big(\\sqrt2\\cos 2u\\,\\cos^2 v + \\cos u\\,\\sin 2v\\big) \\\\ y &= \\tfrac{1}{D}\\big(\\sqrt2\\sin 2u\\,\\cos^2 v - \\sin u\\,\\sin 2v\\big) \\\\ z &= \\tfrac{3\\cos^2 v}{D} \\end{aligned}"
      },
      {
        "label": "domain",
        "latex": "u \\in [0,\\pi],\\quad v \\in [0,\\pi]"
      }
    ],
    "params": [
      {
        "key": "bulge",
        "symbol": "\\beta",
        "meaning": "scales the denominator's oscillation; 1 is the true Boy surface, lower values relax the lobes (kept ≤ 1 so the denominator stays positive)"
      }
    ],
    "code": "const u = a*Math.PI, v = b*Math.PI;            // a,b ∈ [0,1] grid\nconst cv2 = Math.cos(v)**2, s2v = Math.sin(2*v);\nconst D = 2 - bulge*Math.SQRT2*Math.sin(3*u)*s2v;\npoint(\n  (Math.SQRT2*Math.cos(2*u)*cv2 + Math.cos(u)*s2v)/D,\n  3*cv2/D - 1.5,                               // centred up axis\n  (Math.SQRT2*Math.sin(2*u)*cv2 - Math.sin(u)*s2v)/D,\n);",
    "links": [
      {
        "label": "Boy's surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Boy%27s_surface"
      },
      {
        "label": "Boy Surface (MathWorld)",
        "url": "https://mathworld.wolfram.com/BoySurface.html"
      },
      {
        "label": "Real projective plane (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Real_projective_plane"
      }
    ]
  },
  "roman": {
    "title": "Roman Surface",
    "about": "Discovered by Jakob Steiner in Rome in 1844, the Roman surface is one of the simplest ways to push the projective plane RP² into ordinary 3D space. It is the image of the unit sphere under the deceptively tiny quadratic map (x,y,z) → (yz, zx, xy), which folds every antipodal pair of sphere points onto the same point. The result is a rounded tetrahedral blob with three lines of self-intersection that cross at the centre and six pinch (Whitney) points at the tips.",
    "howItWorks": "Each grid cell (θ, φ) gives a point (a,b,c) on the unit sphere, and the three pairwise products bc, ca, ab become the output coordinates. Because the map is even in each pair of antipodal points, the sphere wraps twice and the surface intersects itself along the coordinate axes. The fold and pinch knobs scale the product terms, exaggerating the lobes and the central pinch.",
    "equations": [
      {
        "label": "unit sphere",
        "latex": "(a,b,c) = (\\sin\\theta\\cos\\varphi,\\; \\sin\\theta\\sin\\varphi,\\; \\cos\\theta)"
      },
      {
        "label": "Steiner map",
        "latex": "(x,y,z) = (b\\,c,\\; c\\,a,\\; a\\,b)"
      },
      {
        "label": "implicit form",
        "latex": "x^2y^2 + y^2z^2 + z^2x^2 = x\\,y\\,z"
      }
    ],
    "params": [
      {
        "key": "fold",
        "symbol": "f",
        "meaning": "scales the bc and ab lobes — stretches the surface in two of its three axes"
      },
      {
        "key": "pinch",
        "symbol": "p",
        "meaning": "scales the ca term — sharpens or softens the central self-intersection"
      }
    ],
    "code": "const theta = s*Math.PI, phi = t*2*Math.PI;   // s,t ∈ [0,1] grid\nconst a = Math.sin(theta)*Math.cos(phi);\nconst b = Math.sin(theta)*Math.sin(phi);\nconst c = Math.cos(theta);\npoint(b*c*fold, c*a*pinch, a*b*fold);",
    "links": [
      {
        "label": "Roman surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Roman_surface"
      },
      {
        "label": "Roman Surface (MathWorld)",
        "url": "https://mathworld.wolfram.com/RomanSurface.html"
      }
    ]
  },
  "hopf": {
    "title": "Hopf Fibration",
    "about": "The Hopf fibration is the most famous map in topology: it threads the 3-sphere S³ with a family of circles (fibers), one over each point of the ordinary 2-sphere, so that no two circles ever cross yet every pair is linked. Stereographically projected into ordinary space, those fibers become a nested family of interlocking Villarceau circles riding on tori — a structure that shows up in quantum spin states, magnetic monopoles, and twistor theory. Each glowing ring here is one fiber; rings from neighbouring base points clasp like links in chain mail.",
    "howItWorks": "A grid coordinate u selects the base latitude η on the 2-sphere (which torus you land on) together with a base azimuth φ₀, while v = ψ runs once around the fiber circle. From (η, ψ, φ₀) we build a point on S³ = {(q₁,q₂,q₃,q₄)} and then stereographically project from the q₄ = 1 pole down into R³. The latitude η is held inside [0.30, (π/2−0.30)·spread] so the projection denominator 1−q₄ never reaches zero and the largest torus stays bounded.",
    "equations": [
      {
        "label": "fiber on S³",
        "latex": "(q_1,q_2,q_3,q_4) = (\\cos\\eta\\,\\cos\\psi,\\; \\cos\\eta\\,\\sin\\psi,\\; \\sin\\eta\\,\\cos(\\psi+\\varphi_0),\\; \\sin\\eta\\,\\sin(\\psi+\\varphi_0))"
      },
      {
        "label": "stereographic projection",
        "latex": "(x,y,z) = \\frac{1}{1 - q_4}\\,(q_1,\\; q_2,\\; q_3)"
      },
      {
        "label": "Hopf map (base point on S²)",
        "latex": "(q_1,q_2,q_3,q_4)\\;\\longmapsto\\;\\big(2(q_1q_3+q_2q_4),\\; 2(q_2q_3-q_1q_4),\\; q_1^2+q_2^2-q_3^2-q_4^2\\big)"
      }
    ],
    "params": [
      {
        "key": "tori",
        "symbol": "N",
        "meaning": "how many nested tori (discrete latitude bands η) are drawn; each is swept over its full base azimuth and fiber"
      },
      {
        "key": "spread",
        "symbol": "s",
        "meaning": "scales the largest latitude ηₘₐₓ = (π/2−0.15)·s; near 1 the outermost torus swells (and the projection grows), smaller s tightens the nest"
      }
    ],
    "code": "const NB = Math.round(tori);\nconst aa = a*NB, bi = Math.min(NB-1, Math.floor(aa)), phi0 = (aa-bi)*2*Math.PI;\nconst eta = 0.18 + ((bi+0.5)/NB) * ((Math.PI/2-0.15)*spread - 0.18);\nconst psi = b * 2*Math.PI;\nconst ce = Math.cos(eta), se = Math.sin(eta);\nconst q1 = ce*Math.cos(psi),  q2 = ce*Math.sin(psi);\nconst q3 = se*Math.cos(psi+phi0), q4 = se*Math.sin(psi+phi0);\nconst d = 1 - q4;                 // q4 < 1 always => d > 0\npoint(q1/d, q2/d, q3/d);         // stereographic projection from the q4=1 pole",
    "links": [
      {
        "label": "Hopf fibration (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Hopf_fibration"
      },
      {
        "label": "Villarceau circles (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Villarceau_circles"
      },
      {
        "label": "Hopf fibration (Wolfram MathWorld)",
        "url": "https://mathworld.wolfram.com/HopfMap.html"
      }
    ]
  },
  "orbital": {
    "title": "Spherical Harmonic",
    "about": "Spherical harmonics Y_lm are the natural vibration patterns of a sphere — the angular shapes behind atomic orbitals, planetary gravity fields, and the cosmic microwave background. Here the radius at each direction is set to the magnitude of the harmonic, |Y_lm|, so the surface swells out into the harmonic's lobes: l=1 a dumbbell, l=3 a stack of rings, l=4 a flower of petals. Two integers tune it — the degree l counts how busy the pattern is, the order m how those nodes wrap around the equator versus the poles.",
    "howItWorks": "For each direction (theta from a pole, phi around the equator) we evaluate the real spherical harmonic Y_lm using a hardcoded associated Legendre polynomial P_l^|m|(cos theta) times a cos(m·phi) or sin(|m|·phi) wave, with the standard normalization. The radius is r = |Y_lm| + base, where the small base radius fills in the nodal zeros so the shell stays closed instead of pinching to a point. m is clamped to the valid range [-l, l]; positive m uses the cosine wave, negative m the sine.",
    "equations": [
      {
        "label": "real spherical harmonic",
        "latex": "Y_{lm}(\\theta,\\varphi) = K_{lm}\\,P_l^{|m|}(\\cos\\theta)\\begin{cases}\\cos(m\\varphi) & m\\ge 0\\\\ \\sin(|m|\\varphi) & m<0\\end{cases}"
      },
      {
        "label": "normalization",
        "latex": "K_{lm} = \\sqrt{\\tfrac{2l+1}{4\\pi}\\,\\tfrac{(l-|m|)!}{(l+|m|)!}}\\;\\big(m=0\\,?\\,1:\\sqrt2\\big)"
      },
      {
        "label": "radius as orbital",
        "latex": "r(\\theta,\\varphi) = \\big|Y_{lm}(\\theta,\\varphi)\\big| + r_0"
      },
      {
        "label": "surface point",
        "latex": "\\big(r\\sin\\theta\\cos\\varphi,\\; r\\cos\\theta,\\; r\\sin\\theta\\sin\\varphi\\big)"
      },
      {
        "label": "example P_lm (l=3)",
        "latex": "P_3^0 = \\tfrac12 x(5x^2-3),\\quad P_3^3 = -15(1-x^2)^{3/2},\\quad x=\\cos\\theta"
      }
    ],
    "params": [
      {
        "key": "l",
        "symbol": "l",
        "meaning": "degree (1..4): how many lobes/rings — higher l is busier (l=3 stacked lobes, l=4 flower)"
      },
      {
        "key": "m",
        "symbol": "m",
        "meaning": "order, clamped to [-l, l]: |m| sets equatorial nodes; sign picks the cos(mφ) vs sin(|m|φ) pattern"
      },
      {
        "key": "base",
        "symbol": "r_0",
        "meaning": "base radius added at the harmonic's zeros so the shell stays closed instead of pinching"
      }
    ],
    "code": "// real Y_lm magnitude as radius; P_lm hardcoded for l=1..4\nconst phi = a*2*Math.PI, theta = b*Math.PI, x = Math.cos(theta), s = Math.sqrt(1 - x*x);\nconst am = Math.abs(m);\nlet P; // associated Legendre P_l^|m|(x)\nif (l === 3) P = am===0 ? 0.5*x*(5*x*x-3) : am===3 ? -15*s*(1-x*x) : /* ... */ 0;\nlet ratio = 1; for (let k = l-am+1; k <= l+am; k++) ratio /= k;\nconst K = Math.sqrt((2*l+1)/(4*Math.PI)*ratio) * (m===0 ? 1 : Math.SQRT2);\nconst ang = m>0 ? Math.cos(m*phi) : m<0 ? Math.sin(am*phi) : 1;\nconst r = Math.abs(K*P*ang) + base;\npoint(r*s*Math.cos(phi), r*x, r*s*Math.sin(phi));",
    "links": [
      {
        "label": "Spherical harmonics (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Spherical_harmonics"
      },
      {
        "label": "Associated Legendre polynomials (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Associated_Legendre_polynomials"
      },
      {
        "label": "Table of spherical harmonics (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Table_of_spherical_harmonics"
      },
      {
        "label": "Spherical Harmonic (MathWorld)",
        "url": "https://mathworld.wolfram.com/SphericalHarmonic.html"
      }
    ]
  },
  "maurerRose": {
    "title": "Maurer Rose",
    "about": "In 1987 Peter Maurer noticed that if you take an ordinary rose curve r = sin(nθ) but only visit it at evenly spaced angular stops — every d degrees — and connect those stops with straight lines, the long chords leap across the flower and weave a startling lace-like web. The same petals appear, now overlaid with a geometric net that changes character completely with each integer choice of n and d. It is one equation, two whole numbers, and a polyline — yet it looks like cut crystal.",
    "howItWorks": "Walk an index k from 0 to 360. At each step the angle is θ = k·d degrees, and the point sits on the rose at radius sin(nθ). Successive points are joined by straight chords rather than following the smooth curve, so when d does not divide 360 evenly the path skips around the flower, layering chord over chord into the web. A small vertical lift turns the flat lace into a gently rippled 3D sheet, which is then swept into a thin glowing tube.",
    "equations": [
      {
        "label": "rose radius",
        "latex": "r(\\theta) = \\sin(n\\,\\theta)"
      },
      {
        "label": "sample angles (degrees)",
        "latex": "\\theta_k = k\\,d\\cdot\\tfrac{\\pi}{180}, \\quad k = 0,1,\\dots,360"
      },
      {
        "label": "vertex k",
        "latex": "\\big(r(\\theta_k)\\cos\\theta_k,\\; \\ell\\sin\\tfrac{n\\theta_k}{2},\\; r(\\theta_k)\\sin\\theta_k\\big)"
      },
      {
        "label": "edges (chords)",
        "latex": "P_k \\to P_{k+1}\\ \\text{straight segments form the web}"
      }
    ],
    "params": [
      {
        "key": "petals",
        "symbol": "n",
        "meaning": "rose frequency — gives n petals when n is odd, 2n petals when n is even"
      },
      {
        "key": "d",
        "symbol": "d",
        "meaning": "angular step in degrees between successive sample points; the engine of the web — coprimality with 360 sets how densely the chords interlace"
      },
      {
        "key": "lift",
        "symbol": "\\ell",
        "meaning": "vertical displacement that lifts the flat lace into a rippled 3D sheet (0 = flat)"
      },
      {
        "key": "tube",
        "symbol": "\\rho",
        "meaning": "radius of the glowing tube swept along the polyline"
      }
    ],
    "code": "const DEG = Math.PI/180;\nfunction vert(k, n, d, lift) {\n  const th = k * d * DEG;\n  const r = Math.sin(n * th);\n  return [r*Math.cos(th), lift*Math.sin(n*th*0.5), r*Math.sin(th)];\n}\n// polyline: connect vert(0..360) with straight chords, then sweep a tube\nfor (let k = 0; k < 360; k++) drawChord(vert(k,n,d,lift), vert(k+1,n,d,lift));",
    "links": [
      {
        "label": "Maurer rose (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Maurer_rose"
      },
      {
        "label": "Rose / rhodonea curve (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Rose_(mathematics)"
      },
      {
        "label": "Rose curve (MathWorld)",
        "url": "https://mathworld.wolfram.com/Rose.html"
      }
    ]
  },
  "enneper": {
    "title": "Enneper Surface",
    "about": "One of the oldest known minimal surfaces, written down by Alfred Enneper in 1864 — a soap-film shape that locally minimises area, yet is defined by nothing more than cubic polynomials. As you widen its domain it curls back and passes through itself, weaving a six-petalled saddle with a striking three-fold symmetry. It is the textbook example of a minimal surface that is complete but not embedded: beautiful, self-intersecting, and entirely free of trigonometry.",
    "howItWorks": "Two grid coordinates u and v range over a square. Each maps to a point by three short polynomials — x and y mix a cubic with a cross term, while z is the difference of squares u²−v² that gives the saddle. Because everything is polynomial there are no divisions or logarithms to blow up: every sample is finite. Push 'extent' past about 1.4 and the surface begins to overlap itself, opening the classic folded look.",
    "equations": [
      {
        "label": "Enneper surface",
        "latex": "\\begin{aligned} x &= u - \\tfrac{u^3}{3} + u v^2 \\\\ y &= v - \\tfrac{v^3}{3} + v u^2 \\\\ z &= u^2 - v^2 \\end{aligned}"
      },
      {
        "label": "minimal (zero mean curvature)",
        "latex": "H = \\tfrac{1}{2}(\\kappa_1 + \\kappa_2) = 0"
      },
      {
        "label": "Weierstrass data",
        "latex": "f = 1,\\quad g = w,\\quad \\mathbf{r}(w) = \\operatorname{Re}\\!\\int \\big(1-g^2,\\; i(1+g^2),\\; 2g\\big)\\,f\\,dw"
      }
    ],
    "params": [
      {
        "key": "extent",
        "symbol": "A",
        "meaning": "half-width of the (u,v) domain; below ~1.4 it stays embedded, above it the surface folds through itself"
      },
      {
        "key": "fold",
        "symbol": "\\lambda",
        "meaning": "weights the u v² and v u² cross terms — 1 is the true minimal surface, lower flattens the folds"
      }
    ],
    "code": "const u = (a*2 - 1)*extent, v = (b*2 - 1)*extent;   // a,b ∈ [0,1] grid\nconst u2 = u*u, v2 = v*v;\npoint(u - u2*u/3 + fold*u*v2,\n      v - v2*v/3 + fold*v*u2,\n      u2 - v2);",
    "links": [
      {
        "label": "Enneper surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Enneper_surface"
      },
      {
        "label": "Enneper's Minimal Surface (MathWorld)",
        "url": "https://mathworld.wolfram.com/EnnepersMinimalSurface.html"
      },
      {
        "label": "Minimal surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Minimal_surface"
      }
    ]
  },
  "breather": {
    "title": "Breather Surface",
    "about": "A breather is a soliton that stays put and pulses — it oscillates in place rather than travelling. This surface is its geometric incarnation: the pseudospherical (constant negative curvature) surface corresponding to a breather solution of the sine-Gordon equation. A single parameter aa, between 0 and 1, sets the width of the localized bulge, and the surface ripples out into symmetric wave-like lobes that fade smoothly to a flat sheet far from the centre.",
    "howItWorks": "Two coordinates u and v sweep a grid. With w = sqrt(1 - aa^2), every point is a ratio of hyperbolic functions of aa*u (which localize the feature) and trigonometric functions of v and w*v (which set the oscillation). The shared denominator aa*((w cosh(aa u))^2 + (aa sin(w v))^2) is bounded below by aa*w^2 > 0 over the whole domain, so the surface is everywhere smooth and finite — no spikes to clip. The x-coordinate carries a -u term that shears the lobes along the axis.",
    "equations": [
      {
        "label": "width parameter",
        "latex": "w = \\sqrt{1 - a^2}, \\qquad 0 < a < 1"
      },
      {
        "label": "denominator (always positive)",
        "latex": "D = a\\big( (w\\cosh a u)^2 + (a\\sin w v)^2 \\big)"
      },
      {
        "label": "x",
        "latex": "x = -u + \\frac{2(1 - a^2)\\,\\cosh(a u)\\,\\sinh(a u)}{D}"
      },
      {
        "label": "y",
        "latex": "y = \\frac{2w\\cosh(a u)\\,\\big(-w\\cos v\\cos w v - \\sin v\\sin w v\\big)}{D}"
      },
      {
        "label": "z",
        "latex": "z = \\frac{2w\\cosh(a u)\\,\\big(-w\\sin v\\cos w v + \\cos v\\sin w v\\big)}{D}"
      }
    ],
    "params": [
      {
        "key": "aa",
        "symbol": "a",
        "meaning": "soliton width parameter in (0,1); smaller a stretches the breather wider and taller, larger a tightens it"
      },
      {
        "key": "extent",
        "symbol": "L",
        "meaning": "half-width of the sampled (u,v) square; larger values reveal more of the surrounding lobes"
      }
    ],
    "code": "const aa = 0.4, w = Math.sqrt(1 - aa*aa);\nconst u = (a*2 - 1)*L, v = (b*2 - 1)*L;   // a,b in [0,1] grid\nconst ch = Math.cosh(aa*u), sh = Math.sinh(aa*u);\nconst swv = Math.sin(w*v), cwv = Math.cos(w*v), sv = Math.sin(v), cv = Math.cos(v);\nconst D = aa*((w*ch)**2 + (aa*swv)**2);\npoint(\n  -u + 2*(1 - aa*aa)*ch*sh / D,\n  2*w*ch*(-w*cv*cwv - sv*swv) / D,\n  2*w*ch*(-w*sv*cwv + cv*swv) / D);",
    "links": [
      {
        "label": "Breather (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Breather"
      },
      {
        "label": "Breather surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Breather_surface"
      },
      {
        "label": "Sine-Gordon equation (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Sine-Gordon_equation"
      },
      {
        "label": "Breather surface (MathWorld)",
        "url": "https://mathworld.wolfram.com/BreatherSurface.html"
      }
    ]
  },
  "kuen": {
    "title": "Kuen Surface",
    "about": "Kuen's surface is one of the most beautiful surfaces of constant negative curvature: at every point it curves like a saddle by exactly the same amount (Gaussian curvature K = -1), yet it folds into elegant overlapping petals rather than an infinite trumpet. It is a Backlund transform of the pseudosphere, sharing its hyperbolic geometry while wrapping it into a compact, flower-like shell. Like all such surfaces it cannot be embedded smoothly without an edge, so the petals meet along sharp cuspidal seams.",
    "howItWorks": "A parameter u sweeps around the surface, generating the curling petals through the terms cos u + u sin u and sin u - u cos u, while v runs from the flared outer lobes down toward a logarithmic cusp. The shared denominator 1 + u² sin² v is what pins the curvature to exactly -1 everywhere; the height adds a ln(tan(v/2)) term, the same tractrix-style profile seen in the pseudosphere. The reach knob extends how far u winds (more petals); the funnel knob sets where v starts, trading lobe flare against cusp depth.",
    "equations": [
      {
        "label": "common denominator",
        "latex": "D = 1 + u^2\\sin^2 v"
      },
      {
        "label": "Kuen surface",
        "latex": "\\begin{aligned} x &= \\frac{2(\\cos u + u\\sin u)\\sin v}{D}, \\quad y = \\frac{2(\\sin u - u\\cos u)\\sin v}{D} \\\\ z &= \\ln\\tan\\tfrac{v}{2} + \\frac{2\\cos v}{D} \\end{aligned}"
      },
      {
        "label": "constant curvature",
        "latex": "K = -1 \\quad \\text{(everywhere)}"
      }
    ],
    "params": [
      {
        "key": "reach",
        "symbol": "A",
        "meaning": "extent of u ∈ [-A, A]; larger A winds in more overlapping petals"
      },
      {
        "key": "funnel",
        "symbol": "v_0",
        "meaning": "lower bound of v; smaller values deepen the central cusp, larger flare the lobes"
      }
    ],
    "code": "const u = (a*2 - 1)*reach, v = funnel + b*(2.1 - funnel); // a,b ∈ [0,1] grid\nconst sv = Math.sin(v), D = 1 + u*u*sv*sv;\nconst lg = Math.log(Math.tan(v/2));\npoint(2*(Math.cos(u)+u*Math.sin(u))*sv/D,\n      2*(Math.sin(u)-u*Math.cos(u))*sv/D,\n      lg + 2*Math.cos(v)/D);",
    "links": [
      {
        "label": "Kuen surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Kuen_surface"
      },
      {
        "label": "Kuen's Surface (MathWorld)",
        "url": "https://mathworld.wolfram.com/KuensSurface.html"
      }
    ]
  },
};

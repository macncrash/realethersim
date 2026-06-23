import type { SystemDoc } from './content';

// Learn-panel content for the 3D sphere-traced fractals. These are rendered by a distance-estimator
// (DE) fragment shader (src/render/raymarch.ts): for each pixel a ray is marched until the DE — a
// guaranteed lower bound on the distance to the fractal surface — says we've hit it. Math is
// authored against that shader so the equations match what's on screen.

const COL_PARAM = { key: 'colShift', symbol: '\\phi', meaning: 'hue offset of the orbit-trap colour palette' };
const ANIM_PARAM = { key: 'animate', symbol: '\\alpha', meaning: 'amount the shape morphs over time (0 = frozen)' };

export const RAYMARCH_DOCS: Record<string, SystemDoc> = {
  mandelbulb: {
    title: 'Mandelbulb',
    about:
      'The Mandelbulb is the best-known attempt at a “true” 3D Mandelbrot set. Daniel White and ' +
      'Paul Nylander built it in 2009 by inventing a way to square-and-add points in 3D using ' +
      'spherical coordinates. Raising the exponent to the 8th power gives the iconic bulbous, ' +
      'coral-like surface riddled with self-similar detail.',
    howItWorks:
      'Each point in space is iterated zₙ₊₁ = zₙ^p + c (with c the point itself). The cube of space ' +
      'is converted to spherical coordinates, the radius is raised to the power p and the two angles ' +
      'are multiplied by p, then it is converted back — the 3D analogue of squaring a complex number. ' +
      'Points whose orbit stays bounded are inside the set. A running derivative dr turns the escape ' +
      'radius into a distance estimate, so a ray can sphere-trace straight to the surface.',
    equations: [
      { label: 'Iteration', latex: 'z \\mapsto z^{p} + c, \\quad c = \\text{point}' },
      {
        label: 'Power (spherical)',
        latex:
          'z^{p} = r^{p}\\big(\\sin(p\\theta)\\cos(p\\varphi),\\; \\sin(p\\theta)\\sin(p\\varphi),\\; \\cos(p\\theta)\\big)',
      },
      { label: 'Running derivative', latex: "dr \\mapsto p\\, r^{p-1}\\, dr + 1" },
      { label: 'Distance estimate', latex: 'DE = \\tfrac{1}{2}\\, \\frac{r \\ln r}{dr}' },
    ],
    params: [
      { key: 'power', symbol: 'p', meaning: 'exponent; p = 8 is the classic Mandelbulb, other values give exotic shapes' },
      COL_PARAM,
      ANIM_PARAM,
    ],
    code: `// per sample point p, iterate in spherical coords
let z = p, dr = 1, r = 0;
for (let i = 0; i < ITER; i++) {
  r = length(z);
  if (r > 2) break;
  dr = pow(r, power - 1) * power * dr + 1;
  const theta = acos(z.z / r) * power;
  const phi   = atan2(z.y, z.x) * power;
  const zr    = pow(r, power);
  z = zr * vec3(sin(theta)*cos(phi), sin(theta)*sin(phi), cos(theta)) + p;
}
return 0.5 * log(r) * r / dr;   // distance estimate`,
    links: [
      { label: 'Mandelbulb (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Mandelbulb' },
      { label: 'Daniel White — the original write-up', url: 'https://www.skytopia.com/project/fractal/mandelbulb.html' },
      { label: 'Inigo Quilez — distance estimation', url: 'https://iquilezles.org/articles/distancefractals/' },
    ],
  },

  qjulia: {
    title: 'Quaternion Julia',
    about:
      'Julia sets generalise beautifully into four dimensions using quaternions — numbers with one ' +
      'real and three imaginary parts. The full set is 4D, so we take a 3D slice (fixing the 4th ' +
      'coordinate) and render it as a glassy, organic solid. Sweeping the constant c morphs it ' +
      'continuously through a family of shapes.',
    howItWorks:
      'The same z ↦ z² + c iteration as the 2D Julia set, but z and c are quaternions and ' +
      'multiplication is the (non-commutative) Hamilton product. A point is in the set if its orbit ' +
      'stays bounded. Tracking the derivative quaternion gives the Koebe/Hart distance estimate ' +
      'DE = ½·(|z|/|z′|)·ln|z|, which the ray-marcher uses to find the surface.',
    equations: [
      { label: 'Iteration', latex: 'q \\mapsto q^{2} + c, \\quad q,c \\in \\mathbb{H}' },
      {
        label: 'Quaternion square',
        latex: 'q^{2} = \\big(q_0^{2}-\\lVert \\mathbf{q}\\rVert^{2},\\; 2q_0\\mathbf{q}\\big)',
      },
      { label: 'Derivative', latex: "q' \\mapsto 2\\,q\\,q'" },
      { label: 'Distance estimate', latex: 'DE = \\tfrac{1}{4}\\,\\frac{|q|}{|q\'|}\\,\\ln|q|^{2}' },
    ],
    params: [
      { key: 'cx', symbol: 'c_0', meaning: 'real part of the quaternion constant c' },
      { key: 'cy', symbol: 'c_1', meaning: 'first imaginary part of c' },
      { key: 'cz', symbol: 'c_2', meaning: 'second imaginary part of c' },
      { key: 'cw', symbol: 'c_3', meaning: 'third imaginary part (the 4D-slice offset)' },
      COL_PARAM,
      ANIM_PARAM,
    ],
    code: `let q = vec4(p, 0), dq = vec4(1, 0, 0, 0);
let mz2 = dot(q, q), md2 = 1;
for (let i = 0; i < ITER; i++) {
  if (mz2 > 16) break;
  dq = 2 * qmul(q, dq);   // derivative: q' = 2 q q'
  q  = qsqr(q) + c;       // q = q^2 + c   (Hamilton product)
  md2 = dot(dq, dq);
  mz2 = dot(q, q);
}
return 0.25 * log(mz2) * sqrt(mz2 / md2);`,
    links: [
      { label: 'Julia set (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Julia_set' },
      { label: 'Quaternion Julia sets — Hart et al. (1989)', url: 'https://graphics.stanford.edu/courses/cs348b-20-spring-content/uploads/hart.pdf' },
      { label: 'Inigo Quilez — quaternion Julia', url: 'https://iquilezles.org/articles/juliasets/' },
    ],
  },

  mandelbox: {
    title: 'Mandelbox',
    about:
      'Discovered by Tom Lowe in 2010, the Mandelbox is a fractal built not from squaring but from ' +
      'folding space. Repeatedly reflecting and inflating points produces vast, scale-invariant ' +
      'architecture — endless boxes, corridors and balconies — that looks engineered rather than grown.',
    howItWorks:
      'Each iteration applies three conformal operations: a box fold (reflect any coordinate that ' +
      'leaves the [-1, 1] cube), a sphere fold (inflate points near the centre, invert those in a ' +
      'shell), then a linear scale-and-translate. The running derivative dr tracks how these maps ' +
      'stretch space, giving the distance estimate DE = |z| / |dr|. Negative scale values produce the ' +
      'classic hollow look.',
    equations: [
      { label: 'Box fold', latex: 'z \\mapsto \\operatorname{clamp}(z,-1,1)\\cdot 2 - z' },
      {
        label: 'Sphere fold',
        latex:
          'z \\mapsto \\begin{cases} z\\,/\\,r_{\\min}^{2} & |z|^2 < r_{\\min}^2 \\\\ z\\,/\\,|z|^2 & r_{\\min}^2 \\le |z|^2 < 1 \\\\ z & \\text{else} \\end{cases}',
      },
      { label: 'Scale + translate', latex: 'z \\mapsto s\\,z + c, \\quad dr \\mapsto |s|\\,dr + 1' },
      { label: 'Distance estimate', latex: 'DE = |z| / |dr|' },
    ],
    params: [
      { key: 'scale', symbol: 's', meaning: 'scale factor; negative values (≈ -1.6) give the iconic hollow box' },
      { key: 'minRadius', symbol: 'r_{\\min}', meaning: 'inner radius of the sphere fold — controls density of detail' },
      COL_PARAM,
      ANIM_PARAM,
    ],
    code: `let z = p, dr = 1;
for (let i = 0; i < ITER; i++) {
  z = clamp(z, -1, 1) * 2 - z;          // box fold
  const r2 = dot(z, z);
  if (r2 < minR2)      { z /= minR2; dr /= minR2; }   // sphere fold (inflate)
  else if (r2 < 1)     { z /= r2;    dr /= r2;    }   // sphere fold (invert)
  z = z * scale + p;                    // scale + translate
  dr = dr * abs(scale) + 1;
}
return length(z) / abs(dr);`,
    links: [
      { label: 'Mandelbox (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Mandelbox' },
      { label: 'Tom Lowe — original FractalForums thread', url: 'https://www.fractalforums.com/3d-fractal-generation/a-mandelbox-distance-estimate-formula/' },
    ],
  },

  menger: {
    title: 'Menger Sponge',
    about:
      'The Menger sponge, described by Karl Menger in 1926, is the 3D cousin of the Cantor set and ' +
      'Sierpiński carpet. Start with a cube, drill a square hole through the centre of each face and ' +
      'the middle, then repeat on every remaining sub-cube forever. The limit has zero volume but ' +
      'infinite surface area.',
    howItWorks:
      'Rather than recurse, the shader folds space: at each level it tiles the point into a unit cell, ' +
      'scales up by 3, and subtracts a “cross” of three square channels using exact box distances. ' +
      'Because every operation is a true signed-distance function, the result is an exact DE — the ' +
      'crispest and most robust of the four to ray-march.',
    equations: [
      {
        label: 'Box SDF',
        latex: 'd_{\\text{box}}(p,b) = \\lVert \\max(|p|-b, 0)\\rVert + \\min(\\max(|p|-b),0)',
      },
      { label: 'Fold + scale', latex: 'a = |\\,\\operatorname{mod}(3^{m}p, 2) - 1\\,|, \\quad m = 0,1,2,\\dots' },
      { label: 'Cross subtraction', latex: 'd \\mapsto \\max\\!\\big(d,\\; (\\min(d_a,d_b,d_c)-1)/3^{m}\\big)' },
    ],
    params: [
      { key: 'spin', symbol: '\\psi', meaning: 'static tilt of the sponge so the channels catch the light' },
      COL_PARAM,
      ANIM_PARAM,
    ],
    code: `let d = sdBox(p, vec3(1)), s = 1;     // start from the solid cube
for (let m = 0; m < ITER; m++) {
  const a = abs(mod(p * s, 2) - 1);
  s *= 3;
  const r = abs(1 - 3 * a);
  const cross = (min(max(r.x,r.y), min(max(r.y,r.z), max(r.z,r.x))) - 1) / s;
  d = max(d, cross);                   // CSG: carve the channels
}
return d;                              // exact signed distance`,
    links: [
      { label: 'Menger sponge (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Menger_sponge' },
      { label: 'Inigo Quilez — distance functions', url: 'https://iquilezles.org/articles/distfunctions/' },
    ],
  },
};

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

  // ── implicit isosurfaces (Surface category) ──
  gyroid: {
    title: 'Gyroid',
    about:
      'The gyroid is a triply-periodic minimal surface discovered by Alan Schoen at NASA in 1970 — ' +
      'infinitely connected, smoothly curved, with no straight lines and no self-intersections. It ' +
      'splits space into two interpenetrating, congruent labyrinths. Nature uses it in butterfly-wing ' +
      'scales and block copolymers; engineers 3D-print it as an ultra-light, strong lattice.',
    howItWorks:
      'Rather than a marching-cubes mesh, we render the level set F = isovalue directly: a ray-marcher ' +
      'finds where the short trigonometric field F crosses the isovalue for each pixel and shades by ' +
      'its gradient ∇F. The "isovalue" knob thickens or thins the two channels; at 0 they’re balanced.',
    equations: [
      { label: 'gyroid level set', latex: '\\sin x\\cos y + \\sin y\\cos z + \\sin z\\cos x = c' },
      { label: 'minimal surface (zero mean curvature)', latex: 'H = \\tfrac{1}{2}(\\kappa_1 + \\kappa_2) = 0' },
    ],
    params: [
      { key: 'iso', symbol: 'c', meaning: 'isovalue (level set); 0 is the balanced gyroid, ±values thicken one labyrinth' },
      { key: 'colShift', symbol: '\\phi', meaning: 'hue offset of the core→edge colour gradient' },
      { key: 'animate', symbol: '\\alpha', meaning: 'gently breathes the isovalue over time (0 = still)' },
    ],
    code: `// implicit field; the surface is F = isovalue
const F = (p) => sin(p.x)*cos(p.y) + sin(p.y)*cos(p.z) + sin(p.z)*cos(p.x);
// raymarch it as a distance estimate, normal = ∇F:
const de = abs(F(p) - iso) / length(grad(F, p));   // |F−iso| / |∇F|`,
    links: [
      { label: 'Gyroid (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Gyroid' },
      { label: 'Triply periodic minimal surface', url: 'https://en.wikipedia.org/wiki/Triply_periodic_minimal_surface' },
    ],
  },
  schwarzP: {
    title: 'Schwarz P (Primitive)',
    about:
      'One of the first triply-periodic minimal surfaces, found by Hermann Schwarz in the 1880s. With ' +
      'simple-cubic symmetry it partitions space into two identical "plumber’s nightmare" networks of ' +
      'pipes meeting at right angles.',
    howItWorks:
      'The simplest possible TPMS field — a sum of three cosines. We render its level set as a lit ' +
      'isosurface; the isovalue pinches or opens the necks where the pipes join.',
    equations: [{ label: 'Schwarz P level set', latex: '\\cos x + \\cos y + \\cos z = c' }],
    params: [
      { key: 'iso', symbol: 'c', meaning: 'isovalue; near ±1 the necks pinch off into separate cells' },
      { key: 'colShift', symbol: '\\phi', meaning: 'colour gradient offset' },
      { key: 'animate', symbol: '\\alpha', meaning: 'breathes the isovalue (0 = still)' },
    ],
    code: `const F = (p) => cos(p.x) + cos(p.y) + cos(p.z);   // surface: F = isovalue`,
    links: [{ label: 'Schwarz minimal surface (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Schwarz_minimal_surface' }],
  },
  schwarzD: {
    title: 'Schwarz D (Diamond)',
    about:
      'Schwarz’s diamond surface: its two interwoven labyrinths trace the diamond (tetrahedral) lattice ' +
      '— the same geometry as carbon in diamond. Remarkably, the gyroid is the unique intermediate ' +
      '"associate" surface that bends Schwarz D continuously into Schwarz P without stretching.',
    howItWorks:
      'A four-term trigonometric field with diamond symmetry, rendered as a level-set isosurface lit by ' +
      'its gradient. The isovalue controls the channel thickness.',
    equations: [
      {
        label: 'Schwarz D level set',
        latex: '\\sin x\\sin y\\sin z + \\sin x\\cos y\\cos z + \\cos x\\sin y\\cos z + \\cos x\\cos y\\sin z = c',
      },
    ],
    params: [
      { key: 'iso', symbol: 'c', meaning: 'isovalue (channel thickness)' },
      { key: 'colShift', symbol: '\\phi', meaning: 'colour gradient offset' },
      { key: 'animate', symbol: '\\alpha', meaning: 'breathes the isovalue (0 = still)' },
    ],
    code: `const F = (p) => sin(x)*sin(y)*sin(z) + sin(x)*cos(y)*cos(z)
              + cos(x)*sin(y)*cos(z) + cos(x)*cos(y)*sin(z);  // F = isovalue`,
    links: [{ label: 'Schwarz minimal surface (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Schwarz_minimal_surface' }],
  },
  schoenIWP: {
    title: 'Schoen I-WP',
    about:
      'Another of Alan Schoen’s 1970 minimal surfaces, with body-centred-cubic symmetry. The "I-WP" ' +
      '("I-Wrapped Package") splits space into two NON-congruent labyrinths — one wraps around bcc ' +
      'lattice points, the other threads between them — giving its distinctive cage-of-cages look.',
    howItWorks:
      'A trigonometric level set with both first- and second-harmonic cosine terms, rendered as a lit ' +
      'isosurface. The isovalue trades volume between the two unequal labyrinths.',
    equations: [
      {
        label: 'Schoen I-WP level set',
        latex: '2(\\cos x\\cos y + \\cos y\\cos z + \\cos z\\cos x) - (\\cos 2x + \\cos 2y + \\cos 2z) = c',
      },
    ],
    params: [
      { key: 'iso', symbol: 'c', meaning: 'isovalue; shifts volume between the two unequal labyrinths' },
      { key: 'colShift', symbol: '\\phi', meaning: 'colour gradient offset' },
      { key: 'animate', symbol: '\\alpha', meaning: 'breathes the isovalue (0 = still)' },
    ],
    code: `const F = (p) => 2*(cos(x)*cos(y) + cos(y)*cos(z) + cos(z)*cos(x))
              - (cos(2*x) + cos(2*y) + cos(2*z));   // F = isovalue`,
    links: [{ label: 'Triply periodic minimal surface', url: 'https://en.wikipedia.org/wiki/Triply_periodic_minimal_surface' }],
  },
  neovius: {
    title: 'Neovius Surface',
    about:
      'Discovered in 1883 by Edvard Neovius, a student of Schwarz. It shares Schwarz P’s simple-cubic ' +
      'symmetry but adds a fourth term, fattening the nodes where the channels meet into chunky cubic ' +
      'hubs connected by narrow necks.',
    howItWorks:
      'Schwarz P’s three cosines plus a triple-product term, rendered as a level-set isosurface. The ' +
      'isovalue tunes the balance between the bulbous hubs and the connecting necks.',
    equations: [{ label: 'Neovius level set', latex: '3(\\cos x + \\cos y + \\cos z) + 4\\cos x\\cos y\\cos z = c' }],
    params: [
      { key: 'iso', symbol: 'c', meaning: 'isovalue (hub vs neck balance)' },
      { key: 'colShift', symbol: '\\phi', meaning: 'colour gradient offset' },
      { key: 'animate', symbol: '\\alpha', meaning: 'breathes the isovalue (0 = still)' },
    ],
    code: `const F = (p) => 3*(cos(x)+cos(y)+cos(z)) + 4*cos(x)*cos(y)*cos(z);  // F = isovalue`,
    links: [{ label: 'Neovius surface (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Neovius_surface' }],
  },
  chmutov: {
    title: 'Chmutov Octic',
    about:
      'Unlike the minimal surfaces, this is an algebraic surface — a degree-8 polynomial zero set built ' +
      'by Sergei Chmutov from Chebyshev polynomials. Chmutov’s construction packs a near-record number ' +
      'of nodal singularities for its degree, producing a dense, highly symmetric lattice of tunnels ' +
      'and pinch points inside the unit cube.',
    howItWorks:
      'Sum the 8th Chebyshev polynomial T₈ evaluated on each axis; its zero set is the surface. Because ' +
      'the gradient varies a lot, we under-relax the ray-march step, then light it by the gradient.',
    equations: [
      { label: 'Chmutov octic', latex: 'T_8(x) + T_8(y) + T_8(z) = c' },
      { label: '8th Chebyshev polynomial', latex: 'T_8(t) = 128t^8 - 256t^6 + 160t^4 - 32t^2 + 1' },
    ],
    params: [
      { key: 'iso', symbol: 'c', meaning: 'isovalue; sweeps through the family of related level sets' },
      { key: 'colShift', symbol: '\\phi', meaning: 'colour gradient offset' },
      { key: 'animate', symbol: '\\alpha', meaning: 'sweeps the isovalue over time (0 = still)' },
    ],
    code: `const T8 = (t)=>{const a=t*t,b=a*a,c=b*a,d=b*b; return 128*d - 256*c + 160*b - 32*a + 1;};
const F = (p) => T8(p.x) + T8(p.y) + T8(p.z);   // surface: F = isovalue`,
    links: [
      { label: 'Chmutov surfaces', url: 'https://en.wikipedia.org/wiki/Algebraic_surface' },
      { label: 'Chebyshev polynomials', url: 'https://en.wikipedia.org/wiki/Chebyshev_polynomials' },
    ],
  },
  heart: {
    title: 'Heart',
    about:
      'The Taubin heart surface — a sextic (degree-6) algebraic surface whose zero set is a plump, ' +
      'three-dimensional valentine. It’s the canonical example of an implicit surface that would be ' +
      'painful to describe with a parametric formula but falls out of a single polynomial equation.',
    howItWorks:
      'A core ellipsoid term is cubed, then two negative z³ terms pull the top into the two lobes and ' +
      'the bottom into the cusp. We render it the same way as the minimal surfaces: distance ≈ |F|/|∇F|.',
    equations: [
      { label: 'Taubin heart', latex: '\\left(x^2 + \\tfrac94 y^2 + z^2 - 1\\right)^3 - x^2 z^3 - \\tfrac{9}{80}\\,y^2 z^3 = 0' },
    ],
    params: [
      { key: 'iso', symbol: 'c', meaning: 'isovalue; inflates or deflates the heart' },
      { key: 'colShift', symbol: '\\phi', meaning: 'colour gradient offset' },
      { key: 'animate', symbol: '\\alpha', meaning: 'sweeps the isovalue over time (0 = still)' },
    ],
    code: `// cusp axis remapped to world-up so it stands upright
const F = (x,y,z) => { const b = x*x + 2.25*z*z + y*y - 1;
  return b*b*b - x*x*y*y*y - 0.1125*z*z*y*y*y; };`,
    links: [{ label: 'Heart surface (MathWorld)', url: 'https://mathworld.wolfram.com/HeartSurface.html' }],
  },
  tanglecube: {
    title: 'Tanglecube',
    about:
      'A smooth quartic (degree-4) surface that looks like four rounded lobes tangled through a central ' +
      'cage — a favourite test object for implicit-surface renderers because it’s symmetric, bounded, ' +
      'and has no singular points to trip up the ray-march.',
    howItWorks:
      'Each axis contributes a double-well polynomial t⁴ − 5t²; summed with a constant, the zero set is ' +
      'the tangle. The wells along each axis are what carve out the four lobes.',
    equations: [
      { label: 'tanglecube', latex: 'x^4 - 5x^2 + y^4 - 5y^2 + z^4 - 5z^2 + 11.8 = 0' },
    ],
    params: [
      { key: 'iso', symbol: 'c', meaning: 'isovalue; opens and closes the central tangle' },
      { key: 'colShift', symbol: '\\phi', meaning: 'colour gradient offset' },
      { key: 'animate', symbol: '\\alpha', meaning: 'sweeps the isovalue over time (0 = still)' },
    ],
    code: `const F = (x,y,z) => x**4 - 5*x*x + y**4 - 5*y*y + z**4 - 5*z*z + 11.8;`,
    links: [{ label: 'Tanglecube (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Tanglecube' }],
  },
  goursat: {
    title: 'Goursat',
    about:
      'The Goursat surfaces are the family of quartics built only from the symmetric quantities x⁴+y⁴+z⁴ ' +
      'and (x²+y²+z²). This one — x⁴+y⁴+z⁴ = 1 — is the "squircle" in 3D: a cube with the edges and ' +
      'corners rounded off. Push the isovalue and it inflates from a near-sphere toward a sharper cube.',
    howItWorks:
      'The quartic norm x⁴+y⁴+z⁴ measures distance in a way that bulges toward the cube’s corners; its ' +
      'level set is a rounded cube. Raised powers ⇒ sharper edges.',
    equations: [
      { label: 'Goursat (rounded cube)', latex: 'x^4 + y^4 + z^4 = 1 + c' },
    ],
    params: [
      { key: 'iso', symbol: 'c', meaning: 'isovalue; 0 = rounded cube, higher ⇒ larger / squarer' },
      { key: 'colShift', symbol: '\\phi', meaning: 'colour gradient offset' },
      { key: 'animate', symbol: '\\alpha', meaning: 'sweeps the isovalue over time (0 = still)' },
    ],
    code: `const F = (x,y,z) => x**4 + y**4 + z**4 - 1;   // surface: F = isovalue`,
    links: [{ label: 'Goursat surface (MathWorld)', url: 'https://mathworld.wolfram.com/GoursatsSurface.html' }],
  },
  barth: {
    title: 'Barth Sextic',
    about:
      'Wolf Barth’s 1996 sextic is famous for a reason: it has 65 ordinary double points (nodes), the ' +
      'maximum possible for a degree-6 surface. Its equation is laced with the golden ratio φ, and the ' +
      'nodes sit at the vertices of nested icosahedra — a crystalline knot of pinch points.',
    howItWorks:
      'Three factors of the form φ²·a²−b² (cyclically permuted) multiply to give the icosahedral ' +
      'symmetry, minus a squared sphere term that closes it up. The nodes are where the surface pinches ' +
      'to a point, so the ray-march is run with extra steps to resolve them.',
    equations: [
      {
        label: 'Barth sextic',
        latex: '4(\\varphi^2 x^2 - y^2)(\\varphi^2 y^2 - z^2)(\\varphi^2 z^2 - x^2) - (1+2\\varphi)(x^2+y^2+z^2-1)^2 = 0',
      },
      { label: 'golden ratio', latex: '\\varphi = \\tfrac{1+\\sqrt5}{2} \\approx 1.618' },
    ],
    params: [
      { key: 'iso', symbol: 'c', meaning: 'isovalue; perturbs the surface off its singular zero set' },
      { key: 'colShift', symbol: '\\phi', meaning: 'colour gradient offset' },
      { key: 'animate', symbol: '\\alpha', meaning: 'sweeps the isovalue over time (0 = still)' },
    ],
    code: `const P = 2.6180339887;   // φ²
const F = (x,y,z) => { const a=x*x,b=y*y,c=z*z, s=a+b+c-1;
  return 4*(P*a-b)*(P*b-c)*(P*c-a) - 4.2360679*s*s; };`,
    links: [{ label: 'Barth surface (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Barth_surface' }],
  },
};

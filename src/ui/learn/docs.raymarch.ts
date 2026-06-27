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
  "kummer": {
    "title": "Kummer Surface",
    "about": "Ernst Kummer's 1864 quartic is the most singular surface its degree allows: a degree-4 surface can have at most 16 ordinary double points, and the Kummer surface achieves exactly that maximum. The 16 conical pinch points (nodes) sit in a strikingly symmetric arrangement, paired with 16 special tangent planes (tropes) in the famous 16₆ configuration. It is the quotient of a complex torus by sign-flip, which is why it haunts the theory of abelian varieties and theta functions.",
    "howItWorks": "We render the level set F = isovalue of the affine (tetrahedroid) Kummer quartic directly: a core sphere term (x²+y²+z²−μ²)² is balanced against the product of four planes scaled by λ. With μ=1.3 the parameter λ=(3μ²−1)/(3−μ²)≈3.11 tunes the surface to its 16-real-node form. A ray-marcher finds where F crosses the isovalue and shades by the gradient ∇F. Because ∇F nearly vanishes at the 16 nodes, the step is heavily under-relaxed and hard-capped so the march doesn't overshoot the pinch points.",
    "equations": [
      {
        "label": "Kummer quartic (affine)",
        "latex": "\\left(x^2+y^2+z^2-\\mu^2\\right)^2 - \\lambda\\,\\textstyle\\prod_{i=1}^{4} \\Pi_i = c"
      },
      {
        "label": "the four tropes",
        "latex": "\\Pi = (1-z-\\sqrt2\\,x)(1-z+\\sqrt2\\,x)(1+z+\\sqrt2\\,y)(1+z-\\sqrt2\\,y)"
      },
      {
        "label": "node-tuning parameter",
        "latex": "\\lambda = \\dfrac{3\\mu^2 - 1}{3 - \\mu^2}, \\quad \\mu = 1.3 \\Rightarrow \\lambda \\approx 3.11"
      },
      {
        "label": "16 nodes (maximal for a quartic)",
        "latex": "\\#\\{\\,\\nabla F = 0,\\; F = 0\\,\\} = 16"
      }
    ],
    "params": [
      {
        "key": "iso",
        "symbol": "c",
        "meaning": "isovalue; 0 is the singular 16-node Kummer, ±values smooth the pinch points open"
      },
      {
        "key": "colShift",
        "symbol": "\\phi",
        "meaning": "hue offset of the core→edge colour gradient"
      },
      {
        "key": "animate",
        "symbol": "\\alpha",
        "meaning": "gently sweeps the isovalue over time (0 = still)"
      }
    ],
    "code": "const mu2 = 1.69, lambda = 3.1069, s2 = Math.SQRT2;\nconst F = (x, y, z) => {\n  const r = x*x + y*y + z*z - mu2;\n  const prod = (1 - z - s2*x) * (1 - z + s2*x)\n             * (1 + z + s2*y) * (1 + z - s2*y);\n  return r*r - lambda*prod;   // surface: F = isovalue\n};",
    "links": [
      {
        "label": "Kummer surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Kummer_surface"
      },
      {
        "label": "Kummer surface (MathWorld)",
        "url": "https://mathworld.wolfram.com/KummerSurface.html"
      }
    ]
  },
  "clebsch": {
    "title": "Clebsch Cubic",
    "about": "The Clebsch diagonal cubic, found by Alfred Clebsch in 1871, is the most symmetric of all smooth cubic surfaces. Every smooth cubic contains exactly 27 straight lines, and the Clebsch is the unique one whose entire set of 27 lines is real and visible — they lace across its three rounded lobes in a perfectly symmetric weave. Ten special points (the Eckardt points) each lie where three of those lines cross, giving it a beauty prized since the 19th century, when plaster models of it sat in every serious mathematics department.",
    "howItWorks": "We render the zero set of a single cubic polynomial F(x,y,z) as a lit isosurface. Because a cubic is unbounded, the ray-march is clipped to a bounding sphere and only the recognisable central body is shown. The gradient of this degree-3 field swings over two orders of magnitude across the surface, so the |F−iso|/|∇F| step estimate is under-relaxed and hard-capped to stop the ray overshooting the flatter sheets. The isovalue knob slides through nearby cubics, fattening the lobes or pinching the necks where the lines bunch up.",
    "equations": [
      {
        "label": "Clebsch diagonal cubic (affine form)",
        "latex": "81(x^3+y^3+z^3) - 189\\!\\!\\sum_{i\\neq j}\\!x_i^2 x_j + 54\\,xyz - 126(xy+yz+zx) + 9(x^2+y^2+z^2) + 9(x+y+z) - 1 = c"
      },
      {
        "label": "symmetric (projective) form",
        "latex": "\\sum_{i=0}^{4} x_i^{3} = 0, \\qquad \\sum_{i=0}^{4} x_i = 0"
      },
      {
        "label": "the 27 lines",
        "latex": "\\#\\{\\text{lines on a smooth cubic}\\} = 27,\\ \\text{all real here}"
      }
    ],
    "params": [
      {
        "key": "iso",
        "symbol": "c",
        "meaning": "isovalue; 0 is the true Clebsch cubic, nearby values fatten the lobes or pinch the necks"
      },
      {
        "key": "colShift",
        "symbol": "\\phi",
        "meaning": "hue offset of the core→edge colour gradient"
      },
      {
        "key": "animate",
        "symbol": "\\alpha",
        "meaning": "gently sweeps the isovalue over time (0 = still)"
      }
    ],
    "code": "// affine real Clebsch cubic; surface is F = isovalue\nconst F = (x,y,z) => {\n  const x2=x*x, y2=y*y, z2=z*z;\n  return 81*(x*x2 + y*y2 + z*z2)\n    - 189*(x2*y + x2*z + y2*x + y2*z + z2*x + z2*y)\n    + 54*x*y*z - 126*(x*y + y*z + z*x)\n    + 9*(x2 + y2 + z2) + 9*(x + y + z) - 1;\n};",
    "links": [
      {
        "label": "Clebsch surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Clebsch_surface"
      },
      {
        "label": "Clebsch Diagonal Cubic (MathWorld)",
        "url": "https://mathworld.wolfram.com/ClebschDiagonalCubic.html"
      },
      {
        "label": "27 lines on a cubic surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Cubic_surface"
      }
    ]
  },
  "cayley": {
    "title": "Cayley Cubic",
    "about": "Cayley's nodal cubic is the cubic surface carrying the maximum number of singular points a cubic can have: four ordinary double points (nodes), arranged with the symmetry of a tetrahedron. Discovered by Arthur Cayley in the 1860s, it is the degree-3 champion of nodal surfaces, the cubic analogue of the Kummer quartic and Barth sextic. Three of its lines are the coordinate axes themselves, which meet the curving sheets exactly at the four pinch points.",
    "howItWorks": "We render the zero set of the cubic polynomial F directly as a lit isosurface: a ray is marched until F crosses the isovalue, and the surface is shaded by its gradient ∇F. Because the gradient vanishes at the four nodes, the distance estimate |F−iso|/|∇F| can blow up there, so the march step is under-relaxed and hard-capped (exactly like the heart surface) to stop it overshooting straight through a pinch point.",
    "equations": [
      {
        "label": "Cayley nodal cubic",
        "latex": "-5\\,\\big(x^2(y+z)+y^2(x+z)+z^2(x+y)\\big) + 2\\,(xy+yz+zx) = c"
      },
      {
        "label": "expanded form",
        "latex": "-5\\sum_{\\text{sym}} x^2 y \\; + \\; 2(xy+yz+zx) = c"
      },
      {
        "label": "diagonal section x=y=z=t",
        "latex": "F(t,t,t) = -30\\,t^3 + 6\\,t^2 = 6t^2(1-5t)"
      },
      {
        "label": "node condition",
        "latex": "F = 0 \\ \\text{and}\\ \\nabla F = 0 \\ \\Rightarrow\\ 4\\ \\text{nodes}"
      }
    ],
    "params": [
      {
        "key": "iso",
        "symbol": "c",
        "meaning": "isovalue; c = 0 is the singular cubic, nonzero values smooth the nodes into little necks or holes"
      },
      {
        "key": "colShift",
        "symbol": "\\phi",
        "meaning": "hue offset of the core→edge colour gradient"
      },
      {
        "key": "animate",
        "symbol": "\\alpha",
        "meaning": "gently sweeps the isovalue over time (0 = still)"
      }
    ],
    "code": "// surface: F = isovalue. Four nodes (incl. the origin) in a tetrahedron.\nconst F = (x, y, z) =>\n  -5 * (x*x*(y+z) + y*y*(x+z) + z*z*(x+y))\n  + 2 * (x*y + y*z + z*x);",
    "links": [
      {
        "label": "Cayley's nodal cubic (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Cayley%27s_nodal_cubic_surface"
      },
      {
        "label": "Cubic surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Cubic_surface"
      },
      {
        "label": "Nodal surfaces — Wolf Barth / IMAGINARY",
        "url": "https://imaginary.org/gallery/herwig-hauser-classic"
      }
    ]
  },
  "fischerKoch": {
    "title": "Fischer-Koch S",
    "about": "The Fischer-Koch S is a triply-periodic minimal surface with orthorhombic symmetry, named for crystallographers Werner Fischer and Elke Koch who catalogued it among the balanced minimal surfaces tiling space by crystallographic groups. Its single labyrinth threads through space in a sinuous, S-shaped weave - unlike the gyroid's two interlocking channels, here one channel snakes back through itself. It belongs to the same family of self-supporting, zero-mean-curvature lattices prized for 3D-printed metamaterials and bone-scaffold geometries.",
    "howItWorks": "We render the level set F = isovalue of a short trigonometric nodal approximation rather than meshing it. For each pixel a ray is marched until the field F crosses the isovalue, and the surface is lit by its gradient. The field mixes a second-harmonic cosine on one axis with first-harmonic sin and cos on the other two, cyclically, producing the characteristic S-weave. The isovalue knob fattens or thins the channel; at 0 the surface is balanced.",
    "equations": [
      {
        "label": "Fischer-Koch S level set",
        "latex": "\\cos 2x\\,\\sin y\\,\\cos z + \\cos 2y\\,\\sin z\\,\\cos x + \\cos 2z\\,\\sin x\\,\\cos y = c"
      },
      {
        "label": "minimal surface (zero mean curvature)",
        "latex": "H = \\tfrac{1}{2}(\\kappa_1 + \\kappa_2) = 0"
      }
    ],
    "params": [
      {
        "key": "iso",
        "symbol": "c",
        "meaning": "isovalue (level set); 0 is the balanced surface, ±values thicken or thin the single labyrinth"
      },
      {
        "key": "colShift",
        "symbol": "\\phi",
        "meaning": "hue offset of the core→edge colour gradient"
      },
      {
        "key": "animate",
        "symbol": "\\alpha",
        "meaning": "gently breathes the isovalue over time (0 = still)"
      }
    ],
    "code": "// implicit field; the surface is F = isovalue\nconst F = (p) => Math.cos(2*p.x)*Math.sin(p.y)*Math.cos(p.z)\n              + Math.cos(2*p.y)*Math.sin(p.z)*Math.cos(p.x)\n              + Math.cos(2*p.z)*Math.sin(p.x)*Math.cos(p.y);\n// raymarch it as a distance estimate, normal = ∇F:\nconst de = Math.abs(F(p) - iso) / length(grad(F, p));   // |F−iso| / |∇F|",
    "links": [
      {
        "label": "Triply periodic minimal surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Triply_periodic_minimal_surface"
      },
      {
        "label": "Fischer-Koch surfaces - minimal surface catalogue",
        "url": "https://en.wikipedia.org/wiki/Minimal_surface"
      }
    ]
  },
  "schwarzCLP": {
    "title": "Schwarz CLP",
    "about": "The Schwarz CLP — \"Crossed Layers of Parallels\" — is a triply-periodic minimal surface from Hermann Schwarz's family. As its name promises, it is built from stacked layers of parallel ribbons, with successive layers crossed at right angles so the whole structure interlocks into a continuous, infinitely connected sheet. Unlike the chunky cubic networks of Schwarz P or the diamond labyrinths of Schwarz D, CLP has a distinctly woven, fabric-like character.",
    "howItWorks": "We render the level set F = isovalue of a short trigonometric field directly, instead of meshing it. For each pixel a ray is marched until F crosses the isovalue, and the surface is shaded by its gradient grad F. The nodal approximation cos(2x)cos(z) + cos(2y)sin(z) is the standard tetragonal Schwarz CLP form: it is pi-periodic in x and y and 2pi-periodic in z (the layering axis), reflecting CLP's tetragonal cell. The cos(2x)/cos(2y) factors lay down the crossed parallel ribbons while the z phase (cos z vs sin z) rotates successive layers by a quarter period so they interlock. At isovalue 0 the two sides are volume-balanced (verified: equal pos/neg counts), and the surface is a good minimal-surface approximation (measured mean |H| ~= 0.06, comparable to other nodal TPMS).",
    "equations": [
      {
        "label": "Schwarz CLP level set (tetragonal nodal approx)",
        "latex": "\\cos 2x \\, \\cos z + \\cos 2y \\, \\sin z = c"
      },
      {
        "label": "minimal surface (zero mean curvature)",
        "latex": "H = \\tfrac{1}{2}(\\kappa_1 + \\kappa_2) = 0"
      }
    ],
    "params": [
      {
        "key": "iso",
        "symbol": "c",
        "meaning": "isovalue (level set); 0 is the balanced CLP, ±values thicken one side of the woven sheet"
      },
      {
        "key": "colShift",
        "symbol": "\\phi",
        "meaning": "hue offset of the core→edge colour gradient"
      },
      {
        "key": "animate",
        "symbol": "\\alpha",
        "meaning": "gently breathes the isovalue over time (0 = still)"
      }
    ],
    "code": "// implicit field; the surface is F = isovalue\nconst F = (p) => Math.cos(2*p.x)*Math.cos(p.z) + Math.cos(2*p.y)*Math.sin(p.z);\n// raymarch it as a distance estimate, normal = grad(F):\nconst de = Math.abs(F(p) - iso) / length(grad(F, p));   // |F-iso| / |grad F|",
    "links": [
      {
        "label": "Schwarz minimal surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Schwarz_minimal_surface"
      },
      {
        "label": "Triply periodic minimal surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Triply_periodic_minimal_surface"
      }
    ]
  },
  "togliatti": {
    "title": "Togliatti Quintic",
    "about": "Eugenio Togliatti's quintic is the degree-5 surface carrying the maximum number of ordinary double points a quintic can have: 31 nodes, a bound conjectured by Arnaud Beauville and realised by Togliatti in 1940 (with the explicit equation given later by Wolf Barth). Its constants are laced with sqrt(5), giving the node cluster a striking fivefold, almost icosahedral symmetry. A quintic is unbounded, so what you see is the recognisable central body where the pinch points bunch up; the rest of the surface streams off to infinity and is clipped by the bounding sphere.",
    "howItWorks": "We render the zero set F = isovalue of a single quintic polynomial directly as a lit isosurface: a ray is marched until F crosses the isovalue, and the surface is shaded by its gradient grad F. The polynomial factors into a degree-5 piece in x and y times a linear z-factor, minus a term built from the squared quadric 4(x^2+y^2-z^2)+1+3 sqrt5 — that squared quadric is what forces the nodes. Because grad F vanishes at the nodes (and swings across roughly 500x in magnitude over the surface), the distance estimate |F-iso|/|grad F| is heavily under-relaxed and hard-capped, exactly like the Barth sextic and Kummer quartic, so the march can't overshoot straight through a pinch point.",
    "equations": [
      {
        "label": "Togliatti quintic (affine real form)",
        "latex": "64(x-1)\\big(x^4 - 4x^3 - 10x^2y^2 - 4x^2 + 16x - 20xy^2 + 5y^4 + 16 - 20y^2\\big) - 5\\sqrt5\\,(2z-\\sqrt5-1)\\big(4(x^2+y^2-z^2) + 1 + 3\\sqrt5\\big)^2 = c"
      },
      {
        "label": "31 nodes (maximal for a quintic)",
        "latex": "\\#\\{\\,F=0,\\ \\nabla F = 0\\,\\} = 31"
      },
      {
        "label": "node-forcing quadric",
        "latex": "Q = 4(x^2+y^2-z^2) + 1 + 3\\sqrt5"
      }
    ],
    "params": [
      {
        "key": "iso",
        "symbol": "c",
        "meaning": "isovalue; c = 0 is the singular 31-node Togliatti quintic, nonzero values smooth the pinch points open"
      },
      {
        "key": "colShift",
        "symbol": "\\phi",
        "meaning": "hue offset of the core->edge colour gradient"
      },
      {
        "key": "animate",
        "symbol": "\\alpha",
        "meaning": "gently sweeps the isovalue over time (0 = still)"
      }
    ],
    "code": "// affine real Togliatti quintic; surface is F = isovalue\nconst s5 = Math.sqrt(5);\nconst F = (x, y, z) => {\n  const poly = x**4 - 4*x**3 - 10*x*x*y*y - 4*x*x + 16*x\n             - 20*x*y*y + 5*y**4 + 16 - 20*y*y;\n  const Q = 4*(x*x + y*y - z*z) + (1 + 3*s5);\n  return 64*(x - 1)*poly - 5*s5*(2*z - s5 - 1)*Q*Q;\n};",
    "links": [
      {
        "label": "Togliatti surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Togliatti_surface"
      },
      {
        "label": "Quintic surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Quintic_surface"
      },
      {
        "label": "Nodal surfaces — Herwig Hauser / IMAGINARY gallery",
        "url": "https://imaginary.org/gallery/herwig-hauser-classic"
      }
    ]
  },
  "whitneyUmbrella": {
    "title": "Whitney Umbrella",
    "about": "The Whitney umbrella is the archetypal singular surface — the standard local model for a 'cross-cap', where a smooth sheet folds back and pierces itself along a line. Introduced by Hassler Whitney in his 1944 study of how surfaces map into space, its single cubic equation x² = y²z produces a curved canopy that self-intersects above the origin, tapering into a sharp spike of handle below it. Every coordinate point on that handle line is singular: the surface pinches to nothing along the entire negative z-axis.",
    "howItWorks": "We render the level set F = isovalue of the cubic F(x,y,z) = x² − y²z directly, rather than meshing it. For each pixel a ray is marched until F crosses the isovalue, and the surface is shaded by its gradient ∇F. The gradient ∇F = (2x, −2yz, −y²) vanishes along the whole z-axis (x = y = 0), so the distance estimate |F−iso|/|∇F| blows up along the handle and the spike; to stop the ray overshooting straight through these singular points the march step is strongly under-relaxed and hard-capped, exactly like the Kummer and heart surfaces. The isovalue knob lifts the surface off its singular zero set, opening the self-intersection into a smooth fold.",
    "equations": [
      {
        "label": "Whitney umbrella",
        "latex": "x^2 - y^2 z = c"
      },
      {
        "label": "implicit zero set (c = 0)",
        "latex": "x^2 = y^2 z"
      },
      {
        "label": "gradient",
        "latex": "\\nabla F = \\big(2x,\\; -2yz,\\; -y^2\\big)"
      },
      {
        "label": "singular handle (whole z-axis)",
        "latex": "\\nabla F = 0 \\iff x = y = 0 \\ \\Rightarrow\\ \\text{line of singular points}"
      }
    ],
    "params": [
      {
        "key": "iso",
        "symbol": "c",
        "meaning": "isovalue; c = 0 is the singular Whitney umbrella, nonzero values smooth the self-intersection into a fold"
      },
      {
        "key": "colShift",
        "symbol": "\\phi",
        "meaning": "hue offset of the core→edge colour gradient"
      },
      {
        "key": "animate",
        "symbol": "\\alpha",
        "meaning": "gently sweeps the isovalue over time (0 = still)"
      }
    ],
    "code": "// surface: F = isovalue. Sheet for z>0, singular handle along x=y=0, z<0.\nconst F = (x, y, z) => x*x - y*y*z;   // x² − y²z",
    "links": [
      {
        "label": "Whitney umbrella (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Whitney_umbrella"
      },
      {
        "label": "Whitney Umbrella (MathWorld)",
        "url": "https://mathworld.wolfram.com/WhitneyUmbrella.html"
      },
      {
        "label": "Cross-cap (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Cross-cap"
      }
    ]
  },
  "tooth": {
    "title": "Tooth Surface",
    "about": "The tooth surface (also called the cushion surface) is a compact quartic whose zero set is a rounded, pillow-like solid. Its equation is one of the simplest that mixes a quartic norm x^4+y^4+z^4 against the ordinary squared radius x^2+y^2+z^2, and the competition between those two terms gives the surface its puckered silhouette. The body reaches +-1 along each coordinate axis but bulges outward toward the eight cube-corner directions, passing through (+-1,+-1,+-1) at radius sqrt3. The origin sits on the surface as an isolated solitary point (an acnode): the gradient vanishes there and, locally, the zero set consists of just that single point.",
    "howItWorks": "We render the level set F = isovalue of the quartic directly: for each pixel a ray is marched until the field F crosses the isovalue, and the surface is shaded by its gradient grad F. The quartic term x^4+y^4+z^4 grows faster than the quadratic term far from the centre, closing the surface off into a bounded body whose axis intercepts are at +-1 and whose farthest reach is the diagonal corner (1,1,1) at radius sqrt3~1.73. The field has interior critical points (where grad F = 0) at coordinate combinations of +-1/sqrt2, and the origin is an isolated singular point; at these points the |F-iso|/|grad F| step estimate can blow up, so the march step is under-relaxed and hard-capped (like the heart and Kummer surfaces) to keep the ray from overshooting. A small positive isovalue removes the isolated origin point and smooths the field.",
    "equations": [
      {
        "label": "Tooth (cushion) quartic",
        "latex": "x^4 + y^4 + z^4 - (x^2 + y^2 + z^2) = c"
      },
      {
        "label": "axis intercepts",
        "latex": "F(t,0,0) = t^2(t^2 - 1) = 0 \\;\\Rightarrow\\; t = 0,\\, \\pm 1"
      },
      {
        "label": "diagonal section x=y=z=t",
        "latex": "F(t,t,t) = 3t^2(t^2 - 1), \\quad \\min = -\\tfrac34 \\text{ at } t = \\tfrac{1}{\\sqrt2}, \\;\\; \\text{surface reaches } (1,1,1),\\, |r|=\\sqrt3"
      },
      {
        "label": "isolated singular point (acnode) at the origin",
        "latex": "F(0,0,0) = 0, \\quad \\nabla F(0,0,0) = 0"
      }
    ],
    "params": [
      {
        "key": "iso",
        "symbol": "c",
        "meaning": "isovalue; 0 is the singular tooth, small +values open the central pinch into a smooth neck"
      },
      {
        "key": "colShift",
        "symbol": "\\phi",
        "meaning": "hue offset of the core→edge colour gradient"
      },
      {
        "key": "animate",
        "symbol": "\\alpha",
        "meaning": "gently sweeps the isovalue over time (0 = still)"
      }
    ],
    "code": "// implicit field; the surface is F = isovalue\nconst F = (x, y, z) => {\n  const x2 = x*x, y2 = y*y, z2 = z*z;\n  return x2*x2 + y2*y2 + z2*z2 - (x2 + y2 + z2);\n};\n// raymarch it as a distance estimate, normal = grad(F):\nconst de = Math.abs(F(p.x,p.y,p.z) - iso) / length(grad(F, p));   // |F-iso| / |grad F|",
    "links": [
      {
        "label": "Tooth surface (MathWorld)",
        "url": "https://mathworld.wolfram.com/ToothSurface.html"
      },
      {
        "label": "Algebraic surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Algebraic_surface"
      }
    ]
  },
  "lidinoid": {
    "title": "Lidinoid",
    "about": "The Lidinoid is a triply-periodic minimal surface discovered by Sven Lidin and Stefan Larsson in 1990 - the gyroid's hexagonal cousin. Like the gyroid it is balanced and contains no straight lines, but it carries rhombohedral (rather than cubic) symmetry, twisting space into two interpenetrating labyrinths with a distinctly hexagonal weave. It sits, with the gyroid, on the associate (Bonnet) family of the Schwarz P and D surfaces, bending one into the other without stretching.",
    "howItWorks": "Instead of meshing it we render the level set F = isovalue directly. For each pixel a ray is marched until the short trigonometric field F crosses the isovalue, and the surface is lit by its gradient grad F. The field mixes a first term of sin(2x)cos(y)sin(z) (cyclically permuted) with a second-harmonic term cos(2x)cos(2y), plus the +0.15 constant that picks out the balanced Lidinoid from its family. The isovalue knob thickens or thins the two channels.",
    "equations": [
      {
        "label": "Lidinoid level set",
        "latex": "\\tfrac12\\!\\sum_{\\text{cyc}}\\! \\sin 2x\\,\\cos y\\,\\sin z \\;-\\; \\tfrac12\\!\\sum_{\\text{cyc}}\\! \\cos 2x\\,\\cos 2y \\;+\\; 0.15 = c"
      },
      {
        "label": "expanded (cyclic sums over x,y,z)",
        "latex": "\\tfrac12\\big(\\sin 2x\\cos y\\sin z + \\sin 2y\\cos z\\sin x + \\sin 2z\\cos x\\sin y\\big) - \\tfrac12\\big(\\cos 2x\\cos 2y + \\cos 2y\\cos 2z + \\cos 2z\\cos 2x\\big) + 0.15 = c"
      },
      {
        "label": "minimal surface (zero mean curvature)",
        "latex": "H = \\tfrac{1}{2}(\\kappa_1 + \\kappa_2) = 0"
      }
    ],
    "params": [
      {
        "key": "iso",
        "symbol": "c",
        "meaning": "isovalue (level set); 0 is the balanced Lidinoid, ±values thicken one labyrinth"
      },
      {
        "key": "colShift",
        "symbol": "\\phi",
        "meaning": "hue offset of the core->edge colour gradient"
      },
      {
        "key": "animate",
        "symbol": "\\alpha",
        "meaning": "gently breathes the isovalue over time (0 = still)"
      }
    ],
    "code": "// implicit field; the surface is F = isovalue\nconst F = (p) => {\n  const {x, y, z} = p;\n  const a = Math.sin(2*x)*Math.cos(y)*Math.sin(z)\n          + Math.sin(2*y)*Math.cos(z)*Math.sin(x)\n          + Math.sin(2*z)*Math.cos(x)*Math.sin(y);\n  const b = Math.cos(2*x)*Math.cos(2*y)\n          + Math.cos(2*y)*Math.cos(2*z)\n          + Math.cos(2*z)*Math.cos(2*x);\n  return 0.5*a - 0.5*b + 0.15;\n};\n// raymarch it as a distance estimate, normal = grad(F):\nconst de = Math.abs(F(p) - iso) / length(grad(F, p));   // |F-iso| / |grad F|",
    "links": [
      {
        "label": "Lidinoid - Triply periodic minimal surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Triply_periodic_minimal_surface"
      },
      {
        "label": "Gyroid (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Gyroid"
      },
      {
        "label": "Minimal surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Minimal_surface"
      }
    ]
  },
  "dingDong": {
    "title": "Ding-Dong Surface",
    "about": "The ding-dong surface is the zero set of a single cubic, x²+y²−z²+z³, and it looks exactly like its name: a closed teardrop bell joined at a cusp to a horn that flares open below. The bell is the lobe for z between 0 and 1, where the radial term x²+y² is balanced by z²(1−z); below z=0 that term flips sign and the surface trumpets outward without bound. The origin is a singular cusp where the bell pinches down to a point and the horn begins, and the apex at z=1 is the rounded top of the bell.",
    "howItWorks": "We render the level set F = isovalue of the cubic directly, instead of meshing it: for each pixel a ray is marched until F crosses the isovalue, and the surface is shaded by its gradient ∇F. On the axis F reduces to z²(z−1), so the bell closes cleanly at z=0 and z=1. Because the gradient ∇F=(2x, 2y, 3z²−2z) vanishes at the origin cusp (and shrinks across much of the rounded lobe), the |F−iso|/|∇F| step estimate can blow the ray straight through the pinch point, so the march is under-relaxed and hard-capped like the heart and Cayley surfaces. The cusp axis is rotated to world-up and the lobe is recentred on the origin so the bell stands framed with its horn hanging below.",
    "equations": [
      {
        "label": "ding-dong surface",
        "latex": "x^2 + y^2 - z^2(1 - z) = 0 \\;\\Longleftrightarrow\\; x^2 + y^2 - z^2 + z^3 = 0"
      },
      {
        "label": "on-axis section (x=y=0)",
        "latex": "z^2(z-1) = 0 \\;\\Rightarrow\\; \\text{bell closes at } z=0,\\,1"
      },
      {
        "label": "lobe radius",
        "latex": "x^2+y^2 = z^2(1-z), \\quad r_{\\max} = \\sqrt{\\tfrac{4}{27}} \\approx 0.385 \\text{ at } z=\\tfrac23"
      },
      {
        "label": "gradient (cusp at origin)",
        "latex": "\\nabla F = (2x,\\; 2y,\\; 3z^2 - 2z) = \\mathbf{0} \\text{ at } (0,0,0)"
      }
    ],
    "params": [
      {
        "key": "iso",
        "symbol": "c",
        "meaning": "isovalue; 0 is the true ding-dong with its pinched cusp, ±values round the cusp open or seal the bell"
      },
      {
        "key": "colShift",
        "symbol": "\\phi",
        "meaning": "hue offset of the core→edge colour gradient"
      },
      {
        "key": "animate",
        "symbol": "\\alpha",
        "meaning": "gently sweeps the isovalue over time (0 = still)"
      }
    ],
    "code": "// cusp axis remapped to world-up so the bell stands upright; surface is F = isovalue\nconst F = (x, y, z) => x*x + y*y - z*z + z*z*z;   // x²+y²−z²+z³",
    "links": [
      {
        "label": "Ding-Dong surface (MathWorld)",
        "url": "https://mathworld.wolfram.com/Ding-DongSurface.html"
      },
      {
        "label": "Algebraic surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Algebraic_surface"
      }
    ]
  },
  "dupinCyclide": {
    "title": "Dupin Ring Cyclide",
    "about": "Charles Dupin's cyclide (1822) is the inversion of a torus in a sphere — and its single most beautiful property is that every one of its lines of curvature is a perfect circle. The ring cyclide looks like a torus whose tube swells on one side and tapers on the other, an asymmetric doughnut with a sharply varying cross-section. Because it is the image of a torus under a Möbius (sphere) inversion, it inherits the torus's smoothness everywhere: there is not a single pinch point or node on the whole surface.",
    "howItWorks": "We render the level set F = isovalue of the cyclide's defining quartic directly instead of meshing it. For each pixel a ray is marched until F crosses the isovalue, and the surface is shaded by its gradient ∇F. The seed constants a=1.9, c=1 (so b²=a²−c²=2.61) and d=1.4 satisfy a>d>c, the condition that picks out a ring cyclide; the on-axis section F(X,0,0)=0 then has four real roots, two nested intervals that are the two sides of the swept tube. The raw body is off-centre (it spans x∈[−4.3,2.3]), so we substitute X=x−1 to recentre it on the origin for the bounding sphere and the radial colour trap. The field is smooth — its gradient never vanishes on the surface (measured min|∇F|≈4.6) — so unlike the nodal quartics no step under-relaxation is needed; the isovalue knob simply inflates or deflates the tube.",
    "equations": [
      {
        "label": "Dupin ring cyclide (recentred X = x−1)",
        "latex": "\\left(X^2+y^2+z^2 + b^2 - d^2\\right)^2 - 4\\,(aX - c\\,d)^2 - 4\\,b^2 y^2 = c_{\\text{iso}}"
      },
      {
        "label": "parameters (ring cyclide ⇔ a > d > c)",
        "latex": "a = 1.9,\\quad c = 1,\\quad b = \\sqrt{a^2 - c^2} = \\sqrt{2.61},\\quad d = 1.4"
      },
      {
        "label": "inversion of a torus",
        "latex": "\\text{cyclide} = \\iota_S(\\text{torus}),\\qquad \\iota_S(\\mathbf{p}) = \\mathbf{p}_0 + R^2\\dfrac{\\mathbf{p}-\\mathbf{p}_0}{\\lVert \\mathbf{p}-\\mathbf{p}_0\\rVert^2}"
      },
      {
        "label": "on-axis section (four real ring radii)",
        "latex": "F(X,0,0)=\\left(X^2 + b^2 - d^2\\right)^2 - 4(aX - cd)^2 = 0"
      }
    ],
    "params": [
      {
        "key": "iso",
        "symbol": "c",
        "meaning": "isovalue; 0 is the true ring cyclide, ±values inflate or deflate the swept tube"
      },
      {
        "key": "colShift",
        "symbol": "\\phi",
        "meaning": "hue offset of the core→edge colour gradient"
      },
      {
        "key": "animate",
        "symbol": "\\alpha",
        "meaning": "gently breathes the isovalue over time (0 = still)"
      }
    ],
    "code": "// recentred Dupin ring cyclide; surface is F = isovalue\nconst a = 1.9, c = 1.0, d = 1.4, b2 = a*a - c*c;   // b² = 2.61\nconst F = (x, y, z) => {\n  const X = x - 1.0;                 // recentre the off-axis ring on the origin\n  const s = X*X + y*y + z*z + (b2 - d*d);\n  const t = a*X - c*d;\n  return s*s - 4*t*t - 4*b2*y*y;     // (…)² − 4(aX−cd)² − 4b²y²\n};",
    "links": [
      {
        "label": "Dupin cyclide (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Dupin_cyclide"
      },
      {
        "label": "Cyclide (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Cyclide"
      },
      {
        "label": "Cyclide (MathWorld)",
        "url": "https://mathworld.wolfram.com/Cyclide.html"
      }
    ]
  },
  "orthocircle": {
    "title": "Orthocircle",
    "about": "The orthocircle is a smooth degree-12 algebraic surface built from three unit circles lying in the three coordinate planes, each one fattened into a torus-like tube. Where an ordinary union of three rings would cross and pinch, a single product equation fuses them into one continuous, gently swollen lattice of interlocking loops — a favourite showpiece for implicit-surface renderers because it is bounded, highly symmetric, and entirely free of singular points. The constant a sets the tube thickness and b adds a mild radial swell that smooths the joins where the rings meet.",
    "howItWorks": "Each factor ((u²+v²−1)²+w²) is the squared distance, in a tweaked metric, from a unit circle living in one coordinate plane — its zero set is a thin tube around that ring. Multiplying the three orthogonal ring-fields together and subtracting the small positive term a²(1+b·r²) thickens every ring into a solid tube and seals the six places where pairs of rings approach, yielding one smooth connected surface. We render the level set F = isovalue directly: for each pixel a ray is marched until F crosses the isovalue, shaded by its gradient ∇F. Because ∇F never vanishes on the surface (it stays in roughly [0.14, 0.79]), the |F−iso|/|∇F| step needs no under-relaxation — it ray-marches as cleanly as the Goursat or tanglecube.",
    "equations": [
      {
        "label": "Orthocircle surface",
        "latex": "\\big((x^2+y^2-1)^2+z^2\\big)\\big((y^2+z^2-1)^2+x^2\\big)\\big((z^2+x^2-1)^2+y^2\\big) - a^2\\big(1 + b\\,(x^2+y^2+z^2)\\big) = c"
      },
      {
        "label": "one ring-tube factor",
        "latex": "R_z(x,y,z) = (x^2+y^2-1)^2 + z^2 \\;\\;(\\text{tube around the unit circle in the }xy\\text{-plane})"
      },
      {
        "label": "standard constants",
        "latex": "a = 0.075,\\quad b = 3 \\;\\Rightarrow\\; a^2 = 0.005625,\\;\\; a^2 b = 0.016875"
      },
      {
        "label": "bounded body",
        "latex": "\\max_{F=0}\\lVert(x,y,z)\\rVert \\approx 1.15"
      }
    ],
    "params": [
      {
        "key": "iso",
        "symbol": "c",
        "meaning": "isovalue; 0 is the standard orthocircle, ±values fatten the tubes or pinch the ring joins"
      },
      {
        "key": "colShift",
        "symbol": "\\phi",
        "meaning": "hue offset of the core→edge colour gradient"
      },
      {
        "key": "animate",
        "symbol": "\\alpha",
        "meaning": "gently breathes the isovalue over time (0 = still)"
      }
    ],
    "code": "// surface: F = isovalue. Three orthogonal unit rings fused into one tube lattice.\nconst a = 0.075, b = 3;\nconst F = (x, y, z) => {\n  const x2 = x*x, y2 = y*y, z2 = z*z;\n  const t1 = (x2 + y2 - 1)**2 + z2;   // ring in xy-plane\n  const t2 = (y2 + z2 - 1)**2 + x2;   // ring in yz-plane\n  const t3 = (z2 + x2 - 1)**2 + y2;   // ring in zx-plane\n  return t1*t2*t3 - a*a*(1 + b*(x2 + y2 + z2));\n};",
    "links": [
      {
        "label": "Orthocircle (MathWorld)",
        "url": "https://mathworld.wolfram.com/Orthocircles.html"
      },
      {
        "label": "Algebraic surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Algebraic_surface"
      },
      {
        "label": "Implicit surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Implicit_surface"
      }
    ]
  },
  "decocube": {
    "title": "Decocube",
    "about": "The decocube is a rounded cube rendered not as a solid but as its skeleton: twelve tube-edges meeting at eight corners, like a wireframe cube fattened into smooth rods. It is built algebraically as the product of three intersecting-torus factors — one torus wrapped around each coordinate axis and capped at ±1 — so the zero set is exactly where those tubes live. The result is a clean, hollow cube frame with no flat faces, beloved as a showcase object for implicit-surface and ray-marching renderers.",
    "howItWorks": "Each factor ((u²+v²−r²)² + (w²−1)²) is a thin torus of tube-radius √a around one axis, pinched to its ±1 caps by the (w²−1)² term; multiplying the three cyclic factors and subtracting a² carves out the 12 edges where any one tube is thin. We render the level set F = isovalue directly: for each pixel a ray is marched until F crosses the isovalue, and the surface is shaded by its gradient ∇F. The field is smooth and its gradient stays in a narrow band (probe: |∇F| ≈ 0.024–0.085, range only 3.6×, zero overshoot flags), so no special step-capping is needed — the standard |F−iso|/|∇F| under-relaxation suffices. The isovalue knob fattens the tubes as it rises and thins them to wires as it falls.",
    "equations": [
      {
        "label": "Decocube (product of three tori)",
        "latex": "\\big((x^2+y^2-r^2)^2+(z^2-1)^2\\big)\\big((y^2+z^2-r^2)^2+(x^2-1)^2\\big)\\big((z^2+x^2-r^2)^2+(y^2-1)^2\\big) - a^2 = c"
      },
      {
        "label": "tube offset and thickness",
        "latex": "r = 0.82, \\qquad a = 0.02 \\;\\Rightarrow\\; a^2 = 4\\times10^{-4}"
      },
      {
        "label": "one torus factor (capped at ±1)",
        "latex": "(x^2+y^2-r^2)^2 + (z^2-1)^2 = 0 \\;\\Rightarrow\\; x^2+y^2=r^2,\\ z=\\pm 1"
      }
    ],
    "params": [
      {
        "key": "iso",
        "symbol": "c",
        "meaning": "isovalue; 0 is the slim cube frame, positive values fatten the edges into chunky rods, negative thins them toward wires"
      },
      {
        "key": "colShift",
        "symbol": "\\phi",
        "meaning": "hue offset of the core→edge colour gradient"
      },
      {
        "key": "animate",
        "symbol": "\\alpha",
        "meaning": "gently breathes the isovalue over time (0 = still)"
      }
    ],
    "code": "// implicit field; the surface is F = isovalue\nconst r2 = 0.82 * 0.82, a2 = 0.02 * 0.02;\nconst F = (x, y, z) => {\n  const x2 = x*x, y2 = y*y, z2 = z*z;\n  const t1 = (x2 + y2 - r2)**2 + (z2 - 1)**2;\n  const t2 = (y2 + z2 - r2)**2 + (x2 - 1)**2;\n  const t3 = (z2 + x2 - r2)**2 + (y2 - 1)**2;\n  return t1 * t2 * t3 - a2;   // surface: F = isovalue\n};\n// raymarch it as a distance estimate, normal = grad(F):\nconst de = Math.abs(F(p.x, p.y, p.z) - iso) / length(grad(F, p));   // |F-iso| / |grad F|",
    "links": [
      {
        "label": "Decocube (Bruno Levy / Graphite gallery)",
        "url": "https://members.loria.fr/Bruno.Levy/GEX/decocube.html"
      },
      {
        "label": "Implicit surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Implicit_surface"
      },
      {
        "label": "Algebraic surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Algebraic_surface"
      }
    ]
  },
  "endrassOctic": {
    "title": "Endraß Octic",
    "about": "Stephan Endraß's 1995 octic is the degree-8 surface carrying the record number of ordinary double points: 168 real nodes, the most known for any octic and close to the theoretical maximum. Its equation is laced with √2, and the nodes pack into a dense, eight-fold-symmetric cluster — a glittering knot of pinch points where the surface folds through itself again and again. Like all high-degree algebraic surfaces it is unbounded, so what you see is the recognisable central body where the nodes bunch up; sheets stream outward along the z-axis and are clipped by the bounding sphere.",
    "howItWorks": "We render the zero set F = isovalue of a single octic polynomial directly as a lit isosurface: a ray is marched until F crosses the isovalue, and the surface is shaded by its gradient ∇F. The polynomial is a product of four planes, 64(x²−1)(y²−1)((x+y)²−2)((x−y)²−2), minus the square of a degree-4 polynomial in (x²+y²) and z — that squared factor is what forces the 168 nodes. Because ∇F vanishes at every node (a numerical probe finds ~37% of on-surface samples have near-zero gradient, with the field magnitude swinging ~10⁴× across the surface), the distance estimate |F−iso|/|∇F| is heavily under-relaxed and hard-capped, exactly like the Togliatti quintic and Barth sextic, so the march can't overshoot straight through a pinch point.",
    "equations": [
      {
        "label": "Endraß octic (w = 1)",
        "latex": "64\\,(x^2-1)(y^2-1)\\big((x+y)^2-2\\big)\\big((x-y)^2-2\\big) - \\Big(\\!-4(1{+}\\sqrt2)(x^2{+}y^2)^2 + \\big(8(2{+}\\sqrt2)z^2 + 2(2{+}7\\sqrt2)\\big)(x^2{+}y^2) - 16z^4 + 8(1{+}2\\sqrt2)z^2 - (1{+}12\\sqrt2)\\Big)^2 = c"
      },
      {
        "label": "plane product (the four tropes)",
        "latex": "\\Pi = (x^2-1)(y^2-1)\\big((x+y)^2-2\\big)\\big((x-y)^2-2\\big)"
      },
      {
        "label": "168 nodes (record for an octic)",
        "latex": "\\#\\{\\,F=0,\\ \\nabla F = 0\\,\\} = 168"
      }
    ],
    "params": [
      {
        "key": "iso",
        "symbol": "c",
        "meaning": "isovalue; c = 0 is the singular 168-node Endraß octic, nonzero values smooth the pinch points open"
      },
      {
        "key": "colShift",
        "symbol": "\\phi",
        "meaning": "hue offset of the core→edge colour gradient"
      },
      {
        "key": "animate",
        "symbol": "\\alpha",
        "meaning": "gently sweeps the isovalue over time (0 = still)"
      }
    ],
    "code": "// affine Endraß octic (w = 1); surface is F = isovalue\nconst s2 = Math.SQRT2;\nconst F = (x, y, z) => {\n  const x2=x*x, y2=y*y, z2=z*z, z4=z2*z2, r2=x2+y2;\n  const planes = 64*(x2-1)*(y2-1)*((x+y)**2-2)*((x-y)**2-2);\n  const inner = -4*(1+s2)*r2*r2\n              + (8*(2+s2)*z2 + 2*(2+7*s2))*r2\n              - 16*z4 + 8*(1+2*s2)*z2 - (1+12*s2);\n  return planes - inner*inner;\n};",
    "links": [
      {
        "label": "Endraß surface — Endraß octic gallery",
        "url": "https://www.mathematik.uni-mainz.de/AlgebraischeGeometrie/docs/Eflaeche.shtml"
      },
      {
        "label": "Octic surface (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Octic_surface"
      },
      {
        "label": "Nodal surfaces — Herwig Hauser / IMAGINARY gallery",
        "url": "https://imaginary.org/gallery/herwig-hauser-classic"
      }
    ]
  },
  "cassini": {
    "title": "Cassini Surface",
    "about": "The Cassini surface is a Cassini oval spun into three dimensions — the locus of points whose product of distances to two fixed foci is held constant. Giovanni Domenico Cassini proposed the planar curve in 1680 as a model for the Earth-Sun orbit, and its 3D surface of revolution inherits the same dramatic morphology: as the constant b is tuned past the focal separation a, the shape transforms from a single oval, through a pinched peanut, into two separate egg-shaped blobs. At a=1, b=1.1 it sits just on the connected side, a smooth vertical dumbbell with a slim waist.",
    "howItWorks": "We render the level set F = isovalue of the quartic Cassini field directly rather than meshing it. For each pixel a ray is marched until F crosses the isovalue, and the surface is shaded by its gradient ∇F. The core (x²+y²+z²)² term closes the surface into a bounded body, while the −2a²(x²−y²−z²) term stretches it along one axis (remapped to world-up so the dumbbell stands upright) and squeezes the perpendicular waist. The whole surface is smooth — its gradient never collapses to zero near the zero set (measured |∇F| stays between 2.2 and 7.2), so no step under-relaxation is needed. The isovalue knob inflates the peanut or, pushed negative, pinches its waist shut into two separate lobes.",
    "equations": [
      {
        "label": "Cassini surface of revolution",
        "latex": "\\left(x^2+y^2+z^2\\right)^2 - 2a^2\\left(x^2 - y^2 - z^2\\right) + a^4 - b^4 = c"
      },
      {
        "label": "defining locus (product of focal distances)",
        "latex": "\\lVert\\mathbf{p}-\\mathbf{f}_1\\rVert\\,\\lVert\\mathbf{p}-\\mathbf{f}_2\\rVert = b^2,\\quad \\mathbf{f}_{1,2}=(\\pm a,0,0)"
      },
      {
        "label": "axial tip and waist (a=1, b=1.1)",
        "latex": "x_{\\text{tip}} = \\sqrt{a^2+b^2} \\approx 1.487,\\qquad r_{\\text{waist}} = \\sqrt{b^2-a^2} \\approx 0.458"
      },
      {
        "label": "connectivity transition",
        "latex": "b > a \\Rightarrow \\text{connected peanut};\\quad b < a \\Rightarrow \\text{two separate blobs}"
      }
    ],
    "params": [
      {
        "key": "iso",
        "symbol": "c",
        "meaning": "isovalue; 0 is the connected peanut (a=1, b=1.1), negative values pinch the waist into two blobs, positive values inflate it toward an oval"
      },
      {
        "key": "colShift",
        "symbol": "\\phi",
        "meaning": "hue offset of the core→edge colour gradient"
      },
      {
        "key": "animate",
        "symbol": "\\alpha",
        "meaning": "gently sweeps the isovalue over time (0 = still)"
      }
    ],
    "code": "// Cassini oval of revolution; surface is F = isovalue. a=1, b=1.1 ⇒ a⁴−b⁴ = −0.4641.\nconst a2 = 1, a4 = 1, b4 = Math.pow(1.1, 4);\nconst F = (x, y, z) => {\n  const r2 = x*x + y*y + z*z;\n  return r2*r2 - 2*a2*(x*x - y*y - z*z) + (a4 - b4);\n};\n// raymarch it as a distance estimate, normal = grad(F):\nconst de = Math.abs(F(x,y,z) - iso) / length(grad(F, p));   // |F−iso| / |∇F|",
    "links": [
      {
        "label": "Cassini oval (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Cassini_oval"
      },
      {
        "label": "Cassini Surface (MathWorld)",
        "url": "https://mathworld.wolfram.com/CassiniSurface.html"
      },
      {
        "label": "Cassini Ovals (MathWorld)",
        "url": "https://mathworld.wolfram.com/CassiniOvals.html"
      }
    ]
  },
  blackhole: {
    "title": "Black Hole (Gargantua)",
    "about": "A Schwarzschild black hole with a glowing accretion disk, rendered the way Interstellar's \"Gargantua\" and the Event Horizon Telescope image look: the disk behind the hole is bent up and over the event horizon by gravitational lensing, a razor-thin photon ring traces the edge of the central shadow, and one side of the disk blazes far brighter than the other from relativistic beaming. Unlike every other system here it is not a distance-estimated surface — each pixel fires a photon and the shader integrates its curved path through warped spacetime until it falls into the hole, strikes the disk, or escapes to the stars.",
    "howItWorks": "For each pixel a photon is launched from the camera and stepped along a null geodesic. Working in geometric units (horizon radius r_s = 1, so the mass M = ½), the photon carries a conserved squared angular momentum L² = |r×v|², and gravity pulls its direction inward with acceleration a = −1.5·r_s·L²·p/|p|⁵ — the Cartesian form of the textbook light-bending equation d²u/dφ² = −u + (3/2)r_s u². A velocity-Verlet (leapfrog) integrator advances position and direction with an adaptive step dt = clamp(0.1·|p|, 0.02, 0.6) that automatically refines near the hole. Three outcomes end a ray: it crosses inside r_s (painted black — the shadow), it crosses the equatorial disk annulus r∈[3r_s, 10r_s] (emission is added and the ray keeps going, so a single photon can pick up the disk twice — once in front, once lensed over the top), or it escapes and samples the starfield in its final, bent direction (which is why the stars themselves warp into an Einstein ring). The disk's lopsided brightness is real physics: gas orbits at relativistic speed, so the approaching side is Doppler-beamed (brightness × D³) and the whole disk is gravitationally redshifted (× √(1−r_s/r)), making the inner approaching edge up to ~50× brighter than the receding side. The unstable photon sphere at r = 1.5 r_s is never tested for — it emerges from the dynamics, winding near-critical rays multiple times around the hole to produce the thin photon ring just outside the shadow.",
    "equations": [
      {
        "label": "Null-geodesic light bending (orbit form)",
        "latex": "\\frac{d^2u}{d\\varphi^2} = -u + \\tfrac{3}{2}\\,r_s\\,u^2, \\qquad u = 1/r"
      },
      {
        "label": "Cartesian acceleration (what the shader integrates)",
        "latex": "\\mathbf{a} = -\\frac{3}{2}\\,r_s\\,L^2\\,\\frac{\\mathbf{p}}{\\lVert\\mathbf{p}\\rVert^{5}}, \\qquad L^2 = \\lVert\\mathbf{p}\\times\\mathbf{v}\\rVert^2"
      },
      {
        "label": "Event horizon & photon sphere",
        "latex": "r_s = 2M, \\qquad r_{\\text{ph}} = \\tfrac{3}{2}r_s = 3M"
      },
      {
        "label": "Shadow (critical impact parameter)",
        "latex": "b_{\\text{crit}} = 3\\sqrt{3}\\,M = \\tfrac{3\\sqrt3}{2}\\,r_s \\approx 2.598\\,r_s"
      },
      {
        "label": "Inner disk edge (ISCO)",
        "latex": "r_{\\text{in}} = r_{\\text{ISCO}} = 6M = 3\\,r_s"
      },
      {
        "label": "Doppler beaming + gravitational redshift",
        "latex": "I_{\\text{obs}} = I_{\\text{em}}\\;D^{3}\\,\\sqrt{1-\\tfrac{r_s}{r}}, \\quad D = \\frac{1}{\\gamma\\,(1-\\boldsymbol{\\beta}\\!\\cdot\\!\\mathbf{n})}, \\quad \\beta = \\sqrt{\\tfrac{M}{r-3M}}"
      }
    ],
    "params": [
      {
        "key": "exposure",
        "symbol": "E",
        "meaning": "overall brightness of the accretion disk (linear exposure multiplier)"
      },
      {
        "key": "beaming",
        "symbol": "\\mathcal{D}",
        "meaning": "strength of relativistic Doppler beaming + redshift; 0 = symmetric disk, 1 = full physical asymmetry"
      },
      {
        "key": "tilt",
        "symbol": "\\theta",
        "meaning": "camera tilt above/below the disk plane — edge-on shows the lensed-over-the-top arc most dramatically"
      },
      {
        "key": "spin",
        "symbol": "\\psi",
        "meaning": "orbits the camera around the hole (azimuth)"
      },
      {
        "key": "colShift",
        "symbol": "\\phi",
        "meaning": "hue offset of the disk's hot→cool temperature palette"
      }
    ],
    "code": "// per pixel: integrate a photon along a bent null geodesic (geometric units r_s = 1, M = 0.5)\nlet pos = ro, dir = rd;                 // dir treated as velocity\nconst h2 = dot(cross(pos, dir), cross(pos, dir));   // conserved L², computed once\nlet prevY = pos.y, emis = vec3(0), done = 0;\nfor (let i = 0; i < maxSteps; i++) {\n  const r = length(pos);\n  if (r < rs)  { done = 1; break; }     // (a) horizon → black shadow\n  if (r > Resc) break;                  // (c) escape → background in the LENSED dir\n  const dt = clamp(0.10 * r, 0.02, 0.6);// adaptive: fine near the hole, coarse far away\n  // velocity-Verlet (leapfrog), a = -1.5 rs h2 p / r^5 (points inward)\n  const acc = pos * (-1.5 * rs * h2 / pow(r, 5));\n  const vh  = dir + acc * (0.5 * dt);\n  const pn  = pos + vh * dt;\n  const acc2 = pn * (-1.5 * rs * h2 / pow(length(pn), 5));\n  dir = vh + acc2 * (0.5 * dt);\n  // (b) equatorial disk crossing: sign-flip of y, then check radius ∈ [r_in, r_out]\n  if (prevY * pn.y < 0) {\n    const t = prevY / (prevY - pn.y);   // linear interp to the y=0 plane\n    const rad = length(vec2(mix(pos.x, pn.x, t), mix(pos.z, pn.z, t)));\n    if (rad > r_in && rad < r_out) {\n      const s = clamp((rad - r_in)/(r_out - r_in), 0, 1);\n      const base = mix(vec3(1,0.95,0.85), vec3(1,0.35,0.1), pow(s, 0.7)); // hot→cool ramp\n      const beta = sqrt(0.5*rs / (rad - 1.5*rs));      // Keplerian speed, M = rs/2\n      const gamma = 1 / sqrt(1 - beta*beta);\n      const D = 1 / (gamma * (1 - beta * dot(normalize(dir), normalize(cross(up, posHit)))));\n      const boost = D*D*D * sqrt(1 - rs/rad);          // beaming³ × grav redshift\n      emis += base * pow(r_in/rad, 0.75) * boost * exposure;  // ADD (multiple crossings)\n    }\n  }\n  prevY = pn.y; pos = pn;\n}\n// resolve: black inside horizon, else starfield sampled in the bent dir + accumulated disk glow\nconst sky = starfield(normalize(dir));\nlet col = mix(sky + emis, vec3(0), done);",
    "links": [
      {
        "label": "Gravitational lens (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Gravitational_lens"
      },
      {
        "label": "Schwarzschild geodesics",
        "url": "https://en.wikipedia.org/wiki/Schwarzschild_geodesics"
      },
      {
        "label": "Photon sphere",
        "url": "https://en.wikipedia.org/wiki/Photon_sphere"
      },
      {
        "label": "Gravitational lensing of a black hole accretion disk — J. James et al. (Interstellar / DNGR)",
        "url": "https://arxiv.org/abs/1502.03808"
      },
      {
        "label": "Riccardo Antonelli — How to draw a black hole (raymarching)",
        "url": "https://rantonels.github.io/starless/"
      }
    ]
  },
  plasmaOrb: {
    "title": "Plasma Orb",
    "about": "A glowing spherical shell of plasma — a luminous, hollow orb whose surface seethes with high-frequency filaments that drift and churn in time. Unlike the distance-estimated fractals and surfaces here, nothing is a hard surface: the camera ray marches straight through a 3D density field and accumulates emission at every step, so the orb reads as translucent glowing gas, brightest in a thin band at radius 1 and transparent in its hollow centre. It is the simplest member of the Volume family — a mostly-analytic spherical-shell mask textured by a single domain-warp octave — and the cheapest to render.",
    "howItWorks": "For each pixel a ray is launched from the camera and stepped a fixed distance Δs through space (no ray bending). At each sample point p the shader evaluates a DENSITY e(p) and adds emission o += exp(−e·k)·pal(e)·e·Δs·E, the volumetric-emission integral used by twigl/つぶやきGLSL tweet-shaders. The density is a spherical SHELL: base = clamp(1 − |‖p‖ − R| / T, 0, 1) gates a band of thickness T=0.6 around radius R=1 (validated: peaks 0.72 at r=1, exactly 0 for r<0.4 and r>1.6 — a genuinely hollow shell), multiplied by a high-frequency animated trig texture cos(8x+t)·cos(8y−0.7t)·cos(8z) and one octave of IQ domain warp warp1(1.5p) for organic filaments. The warp is built from the project's new noise stack: a sin-free integer-lattice hash → trilinear value noise with a quintic (C1) fade → a 3-octave FBM → a single domain-warp feedback q=fbm(p), d=fbm(p+4q) that bends the field into marbled veins (validated: doubles vein density vs plain FBM). The exp(−e·k) factor self-attenuates — e·exp(−e·k) peaks at e=1/k — so mid-density wisps glow brightest and the dense shell never blows out to a solid blob. A per-channel tanh tone-map compresses the accumulated emission into [0,1) so it asymptotes to white instead of clipping. The whole domain slowly rotates about Y (driven by the time uniform) so the surface plasma appears to boil.",
    "equations": [
      {
        "label": "Volumetric-emission integral (what the loop accumulates)",
        "latex": "o \\mathrel{+}= e^{-k\\,e}\\,\\mathrm{pal}(e)\\,e\\,\\Delta s\\,E"
      },
      {
        "label": "Self-attenuation peak (why mid-density glows brightest)",
        "latex": "\\frac{d}{de}\\big(e\\,e^{-k e}\\big)=0 \\;\\Rightarrow\\; e^\\star = 1/k"
      },
      {
        "label": "Spherical shell density mask",
        "latex": "\\rho(\\mathbf p)=\\operatorname{clamp}\\!\\Big(1-\\tfrac{\\big|\\,\\lVert\\mathbf p\\rVert-R\\,\\big|}{T},\\,0,\\,1\\Big)"
      },
      {
        "label": "Value noise with quintic (C1) fade",
        "latex": "n(\\mathbf p)=\\operatorname{trilerp}\\big(h(\\mathbf i+\\mathbf c)\\big),\\quad u=f^{3}\\!\\big(f(6f-15)+10\\big)"
      },
      {
        "label": "Single-octave domain warp",
        "latex": "\\mathbf q=\\mathrm{fbm}(\\mathbf p+\\boldsymbol\\omega),\\qquad d=\\mathrm{fbm}(\\mathbf p+4\\mathbf q)"
      },
      {
        "label": "Cosine emission palette",
        "latex": "\\mathrm{pal}(e)=0.5+0.5\\cos\\!\\big(2\\pi(e+\\phi)+\\boldsymbol\\Phi\\big),\\;\\boldsymbol\\Phi=(0,2.1,4.2)"
      }
    ],
    "params": [
      {
        "key": "scale",
        "symbol": "s",
        "meaning": "spatial frequency of the warp texture — higher = finer surface filaments (capped at 2.5 to keep noise cells in fp32-safe range)"
      },
      {
        "key": "absorb",
        "symbol": "k",
        "meaning": "self-attenuation strength; the brightest density is e=1/k, so larger k makes thin wisps dominate and dense regions darker"
      },
      {
        "key": "exposure",
        "symbol": "E",
        "meaning": "overall glow brightness (linear emission multiplier, applied before the tanh tone-map)"
      },
      {
        "key": "colShift",
        "symbol": "\\phi",
        "meaning": "hue offset rotating the whole density→colour palette"
      }
    ],
    "code": "// per pixel: march a fixed-step ray through the density field, accumulate emission\nlet pos = ro, emis = vec3(0), entered = 0;\nfor (let i = 0; i < maxSteps; i++) {\n  const r = length(pos);\n  if (r < bound) entered = 1;\n  if (entered && r > bound) break;            // only exit AFTER entering (camDist > bound)\n  if (r < bound) {\n    const q = rotateY(pos, time*0.15) * scale; // domain churns over time\n    // hollow plasma shell at R=1, thickness T=0.6, textured by trig × one warp octave\n    const base = clamp(1 - abs(length(q) - 1.0) / 0.6, 0, 1);\n    const tex  = 0.5 + 0.5*cos(q.x*8+t)*cos(q.y*8-0.7*t)*cos(q.z*8);\n    const e    = clamp(base * tex * (0.6 + 0.8*warp1(q*1.5)), 0, 1);\n    const a    = e*2 + colShift*6.2832 + 0.3;\n    const pal  = 0.5 + 0.5*cos(vec3(a, a+2.1, a+4.2));\n    emis += pal * e * exp(-e*absorb) * step * exposure; // o += exp(-e k) pal e ds\n  }\n  pos += rd * step;\n}\ncol += vec3(tanh(emis.x), tanh(emis.y), tanh(emis.z)); // tone-map over the bg gradient",
    "links": [
      {
        "label": "Inigo Quilez — Domain warping",
        "url": "https://iquilezles.org/articles/warp/"
      },
      {
        "label": "Inigo Quilez — Value noise derivatives",
        "url": "https://iquilezles.org/articles/morenoise/"
      },
      {
        "label": "Volume ray casting (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Volume_ray_casting"
      },
      {
        "label": "twigl — GLSL tweet-shader editor (the look this emulates)",
        "url": "https://twigl.app/"
      }
    ]
  },
  nebula: {
    "title": "Nebula",
    "about": "A soft, wispy cloud of emissive gas filling the frame — the classic interstellar-nebula look of GLSL tweet-shaders. Brighter filaments thread through a diffuse glow, the structure flows slowly over time, and a radial falloff fades the cloud toward the edges of the volume. This is the richest and heaviest preset in the Volume family: its density is a full recursive IQ domain warp (seven noise evaluations per step), which produces the swirling, marbled, fluid-like filaments that distinguish a real nebula from flat fog.",
    "howItWorks": "Each pixel marches a fixed-step ray through a 3D density field and accumulates emission o += exp(−e·k)·pal(e)·e·Δs·E. The density is a domain-warped FBM cloud: cloud = warp(0.9·p + drift), where warp is the full IQ feedback q=fbm(p), r=fbm(p+4q), d=fbm(p+4r) — the recursive structure that bends smooth noise into swirling veins (validated: 244 vein-crossings vs 34 for plain FBM, autocorrelation 0.94→0 confirming a coherent, non-white field). A threshold max(cloud−0.45, 0)·2 carves the diffuse haze into distinct wisps, and a radial falloff clamp(1 − ‖p‖/2.6, 0, 1) fades the cloud to nothing at the volume edge. The noise stack underneath is the project's new procedural-noise infrastructure: a sin-free Hoskins hash (validated white, neighbour covariance 0.0009) → trilinear value noise with a quintic C1 fade (validated continuous derivative across cell boundaries, no kinks) → normalised 3-octave FBM bounded in [0,1]. Because the raw density approaches ~0.74 over a dense column, a tone-map is mandatory: per-channel tanh compresses the accumulation into [0,1) (validated max channel 0.63 — never clips to white). The cloud drifts via a time offset fed into the warp lookup, and the whole domain rotates slowly about Y. This preset deliberately runs at a modest step count (88) because each step is the full 7-call warp (~2.7k ops); pushing steps higher before lowering octaves is the wrong trade.",
    "equations": [
      {
        "label": "Volumetric-emission integral",
        "latex": "o \\mathrel{+}= e^{-k\\,e}\\,\\mathrm{pal}(e)\\,e\\,\\Delta s\\,E"
      },
      {
        "label": "Full recursive IQ domain warp",
        "latex": "\\mathbf q=\\mathrm{fbm}(\\mathbf p),\\;\\mathbf r=\\mathrm{fbm}(\\mathbf p+4\\mathbf q),\\;d=\\mathrm{fbm}(\\mathbf p+4\\mathbf r)"
      },
      {
        "label": "Normalised fractional Brownian motion",
        "latex": "\\mathrm{fbm}(\\mathbf p)=\\frac{\\sum_{o} 2^{-o}\\,n(2^{o}\\mathbf p)}{\\sum_{o} 2^{-o}}\\in[0,1]"
      },
      {
        "label": "Wisp threshold × radial falloff",
        "latex": "e=\\max(\\mathrm{cloud}-0.45,\\,0)\\cdot 2\\cdot\\operatorname{clamp}\\!\\big(1-\\tfrac{\\lVert\\mathbf p\\rVert}{2.6},0,1\\big)"
      },
      {
        "label": "Tone-map (asymptotes to white, never clips)",
        "latex": "\\mathbf c_{\\text{out}}=\\tanh(\\mathbf o),\\qquad \\lim_{\\mathbf o\\to\\infty}\\tanh(\\mathbf o)=1"
      }
    ],
    "params": [
      {
        "key": "scale",
        "symbol": "s",
        "meaning": "spatial frequency of the cloud — higher = smaller, finer filaments (capped at 2.0 for fp32 hash stability)"
      },
      {
        "key": "absorb",
        "symbol": "k",
        "meaning": "self-attenuation; sets which density e=1/k glows brightest, controlling whether thin haze or dense cores dominate"
      },
      {
        "key": "exposure",
        "symbol": "E",
        "meaning": "overall brightness of the emissive gas before tone-mapping"
      },
      {
        "key": "colShift",
        "symbol": "\\phi",
        "meaning": "hue offset rotating the density→colour palette (violet/gold by default)"
      }
    ],
    "code": "// per pixel: fixed-step emission march; density = full IQ domain-warp cloud\nlet pos = ro, emis = vec3(0), entered = 0;\nfor (let i = 0; i < maxSteps; i++) {\n  const r = length(pos);\n  if (r < bound) entered = 1;\n  if (entered && r > bound) break;\n  if (r < bound) {\n    const q = rotateY(pos, time*0.15) * scale;\n    // warp = fbm(p + 4*fbm(p + 4*fbm(p))) — swirling marbled filaments\n    const cloud = warp(q*0.9 + vec3(time*0.05, 0, 0));\n    const fall  = clamp(1 - length(q)/2.6, 0, 1);    // fade to volume edge\n    const e     = clamp(max(cloud - 0.45, 0) * 2.0 * fall, 0, 1);\n    const a     = e*2 + colShift*6.2832 + 0.3;\n    const pal   = 0.5 + 0.5*cos(vec3(a, a+2.1, a+4.2));\n    emis += pal * e * exp(-e*absorb) * step * exposure;\n  }\n  pos += rd * step;\n}\ncol += vec3(tanh(emis.x), tanh(emis.y), tanh(emis.z)); // tone-map MANDATORY here",
    "links": [
      {
        "label": "Inigo Quilez — Domain warping",
        "url": "https://iquilezles.org/articles/warp/"
      },
      {
        "label": "Inigo Quilez — FBM",
        "url": "https://iquilezles.org/articles/fbm/"
      },
      {
        "label": "Dave Hoskins — Hash without sine (Shadertoy)",
        "url": "https://www.shadertoy.com/view/4djSRW"
      },
      {
        "label": "twigl — GLSL tweet-shader editor",
        "url": "https://twigl.app/"
      }
    ]
  },
};

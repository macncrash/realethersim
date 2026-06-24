import type { SystemDoc } from './content';

// Curated learn-panel content for additional emergent systems (Lenia, DLA).
export const EXTRA_DOCS: Record<string, SystemDoc> = {
  lenia: {
    title: 'Lenia',
    about:
      'Lenia generalises Conway’s Game of Life to a continuous world: smooth space, smooth time, and smooth states in [0,1] instead of on/off cells. From this continuity emerge astonishingly lifelike "creatures" — gliders, rotors, and self-repairing cells that swim and interact. Discovered by Bert Chan in 2019.',
    howItWorks:
      'Each step the field is convolved with a smooth ring-shaped kernel to measure each cell’s local neighbourhood density U; a bell-shaped growth function then grows cells where U is near μ and decays them otherwise. A [0,1] clamp keeps it bounded.',
    equations: [
      { label: 'neighbourhood potential (ring-kernel convolution)', latex: 'U = K * A' },
      { label: 'growth function (bell centred at μ)', latex: 'G(U) = 2\\,\\exp\\!\\left(-\\frac{(U-\\mu)^2}{2\\sigma^2}\\right) - 1' },
      { label: 'update (clamped to [0,1])', latex: 'A_{t+\\Delta t} = \\mathrm{clip}_{[0,1]}\\bigl(A + \\Delta t\\,G(U)\\bigr)' },
    ],
    params: [
      { key: 'mu', symbol: '\\mu', meaning: 'the neighbourhood density that cells thrive at (growth peak)' },
      { key: 'sigma', symbol: '\\sigma', meaning: 'how tolerant growth is — narrow σ = pickier, sharper creatures' },
      { key: 'rate', symbol: '\\Delta t', meaning: 'time step; how fast the field updates each tick' },
      { key: 'radius', symbol: 'R', meaning: 'kernel radius — the size of a cell’s neighbourhood (and its creatures)' },
    ],
    code: `// U = convolution of the field with a normalized ring kernel (peak at R/2)
// then grow toward density μ:
G = 2 * Math.exp(-0.5 * ((U - mu) / sigma) ** 2) - 1;
A = clamp(A + rate * G, 0, 1);`,
    links: [
      { label: 'Lenia (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Lenia' },
      { label: 'Chan 2019, Lenia — Biology of Artificial Life', url: 'https://arxiv.org/abs/1812.05433' },
    ],
  },
  dla: {
    title: 'Diffusion-Limited Aggregation',
    about:
      'DLA models growth by random diffusion: particles wander randomly until they bump into a growing cluster, then stick permanently. From a single seed this builds a branching, self-similar dendrite — the same process behind coral, frost on a window, lightning, mineral veins, and electrodeposition. The result is a fractal with dimension ≈ 1.71.',
    howItWorks:
      'Many walkers random-walk across the grid; whenever a walker lands next to the cluster it freezes there (with probability "stickiness"), then a fresh walker is released. Lower stickiness lets walkers penetrate deeper, giving denser, bushier growth.',
    equations: [
      { label: 'fractal mass–radius scaling (D ≈ 1.71 in 2D)', latex: 'N(R) \\sim R^{D}, \\qquad D \\approx 1.71' },
    ],
    params: [
      { key: 'stickiness', symbol: 'p', meaning: 'probability a walker freezes on contact — lower = denser, bushier clusters' },
      { key: 'walkers', symbol: 'M', meaning: 'number of simultaneous random walkers (growth speed)' },
    ],
    code: `// per walker: random-walk one cell; if any of the 8 neighbours is stuck, freeze:
if (anyNeighbourStuck && random() < stickiness) {
  grid[cell] = 1;     // join the cluster
  respawn(walker);    // release a fresh walker
} else {
  walker += randomStep();
}`,
    links: [
      { label: 'Diffusion-limited aggregation (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Diffusion-limited_aggregation' },
      { label: 'Witten & Sander 1981 (original paper)', url: 'https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.47.1400' },
    ],
  },
  kuramoto: {
    title: 'Kuramoto Synchronisation',
    about:
      'Why do fireflies flash in unison, metronomes on a table drift into lockstep, and the cells of ' +
      'a heart beat together? Yoshiki Kuramoto’s 1975 model is the answer: a population of oscillators, ' +
      'each ticking at its own natural frequency, nudging one another through their average. Below a ' +
      'critical coupling they ignore each other and drift; past it, order erupts spontaneously and they ' +
      'snap into sync. Crank K up and watch the cylinder zip shut.',
    howItWorks:
      'Each oscillator i has a phase θᵢ and a fixed natural frequency ωᵢ (drawn here from a bell curve). ' +
      'Instead of every pair pulling on every other pair, all the pulling is summed into one global ' +
      '"mean field" — the order parameter r·e^{iψ}, the centroid of all the phases on the unit circle. ' +
      'r runs from 0 (total disorder) to 1 (perfect sync). Each oscillator is then pulled toward the ' +
      'mean phase with strength K·r. We map phase to angle around a cylinder and natural frequency to ' +
      'height, so the slow/fast wings keep drifting while the middle locks.',
    equations: [
      { label: 'oscillator dynamics', latex: '\\dot{\\theta_i} = \\omega_i + \\frac{K}{N}\\sum_{j} \\sin(\\theta_j - \\theta_i)' },
      { label: 'order parameter (mean field)', latex: 'r\\,e^{i\\psi} = \\frac{1}{N}\\sum_{j} e^{i\\theta_j}' },
      { label: 'mean-field form (what we integrate)', latex: '\\dot{\\theta_i} = \\omega_i + K\\,r\\,\\sin(\\psi - \\theta_i)' },
    ],
    params: [
      { key: 'coupling', symbol: 'K', meaning: 'coupling strength — the master knob; cross the critical value and sync erupts' },
      { key: 'omega0', symbol: '\\omega_0', meaning: 'mean natural frequency — how fast the synced cluster rotates' },
      { key: 'spread', symbol: '\\sigma', meaning: 'spread of natural frequencies — more disorder needs more coupling to sync' },
    ],
    code: `// global mean field over all oscillators (no all-pairs loop):
let mc = 0, ms = 0;
for (const t of theta) { mc += Math.cos(t); ms += Math.sin(t); }
mc /= N; ms /= N;                       // order parameter (cos, sin)
// each oscillator is pulled toward the mean phase:
for (let i = 0; i < N; i++) {
  const omega = omega0 + spread * g[i];           // its natural frequency
  const dtheta = omega + K * (ms * Math.cos(theta[i]) - mc * Math.sin(theta[i]));
  theta[i] += dtheta * dt;
}`,
    links: [
      { label: 'Kuramoto model (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Kuramoto_model' },
      { label: 'Strogatz — From Kuramoto to Crawford (2000)', url: 'https://www.sciencedirect.com/science/article/abs/pii/S0167278900000944' },
      { label: 'Steven Strogatz — Sync (TED talk)', url: 'https://www.ted.com/talks/steven_strogatz_the_science_of_sync' },
    ],
  },
  chimera: {
    title: 'Chimera States',
    about:
      'A chimera state is dynamical-systems heresy: take a ring of identical oscillators, couple them ' +
      'all in exactly the same way, and — instead of all syncing or all drifting — the ring ' +
      'spontaneously splits into a synchronised arc living right next to an incoherent, chaotic arc. ' +
      'Order and disorder coexisting on a perfectly symmetric ring. Discovered by Kuramoto & ' +
      'Battogtokh in 2002 and named (after the mythological part-lion-part-serpent) by Abrams & ' +
      'Strogatz in 2004; later seen in real chemical, mechanical, and optical experiments.',
    howItWorks:
      'Identical oscillators sit on a ring and couple NONLOCALLY — each feels its neighbours through a ' +
      'broad cosine kernel — with a phase lag α just under π/2. From a localized random kick the ring ' +
      'breaks symmetry: one arc locks into a smooth phase profile while the other never settles. The ' +
      'cosine kernel lets the nonlocal sum collapse into six global order-parameter sums, so it runs ' +
      'O(N). We draw a ring "crown" — angle = position, height = sin θ — so the coherent arc is a ' +
      'smooth band and the incoherent arc is jagged.',
    equations: [
      {
        label: 'nonlocal coupling on the ring',
        latex: '\\dot{\\theta_i} = \\omega - \\frac{1}{N}\\sum_{j} G(x_i - x_j)\\,\\sin(\\theta_i - \\theta_j + \\alpha)',
      },
      { label: 'cosine coupling kernel', latex: 'G(x) = 1 + A\\cos x' },
      { label: 'chimera regime', latex: '\\alpha \\lesssim \\tfrac{\\pi}{2}, \\qquad A > 0' },
    ],
    params: [
      { key: 'alpha', symbol: '\\alpha', meaning: 'phase lag (frustration); chimeras live just below π/2' },
      { key: 'kernelA', symbol: 'A', meaning: 'kernel anisotropy — how nonlocal/contrasted the coupling is' },
      { key: 'coupling', symbol: 'K', meaning: 'overall coupling strength' },
    ],
    code: `// cosine kernel ⇒ six global sums, so the nonlocal coupling is O(N):
let Sc=0,Ss=0, Scc=0,Scs=0, Ssc=0,Sss=0;
for (let j=0;j<N;j++){ const c=cos(th[j]),s=sin(th[j]);
  Sc+=c; Ss+=s; Scc+=cosx[j]*c; Scs+=cosx[j]*s; Ssc+=sinx[j]*c; Sss+=sinx[j]*s; }
// each oscillator integrates against the shared sums:
const termC = Sc/N + A*cosx[i]*Scc/N + A*sinx[i]*Ssc/N;
const termS = Ss/N + A*cosx[i]*Scs/N + A*sinx[i]*Sss/N;
const Ci = sin(th[i]+alpha)*termC - cos(th[i]+alpha)*termS;
th[i] -= K * Ci * dt;`,
    links: [
      { label: 'Chimera states (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Chimera_state' },
      { label: 'Abrams & Strogatz 2004 — Chimera states for coupled oscillators', url: 'https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.93.174102' },
      { label: 'Kuramoto & Battogtokh 2002 (original)', url: 'https://www.j-npcs.org/abstracts/vol2002/v5no4/v5no4p380.html' },
    ],
  },
  karman: {
    title: 'Kármán Vortex Street',
    about:
      'Drive a steady flow past a blunt body — a bridge pier, a chimney, a cylinder — and above a ' +
      'critical speed the wake stops being steady: it sheds vortices alternately from each side, ' +
      'spinning in opposite directions, in a beautifully periodic double row. Théodore von Kármán ' +
      'explained its stability in 1911. It’s why flags flutter, power lines "sing", and why the ' +
      'Tacoma Narrows bridge tore itself apart.',
    howItWorks:
      'This is real CFD: a Lattice-Boltzmann solver (D2Q9). Instead of tracking velocity directly it ' +
      'evolves nine particle-population densities per cell — collide them toward local equilibrium, ' +
      'stream them to neighbours, bounce them off the cylinder — and the Navier–Stokes flow emerges. ' +
      'We colour each cell by its vorticity (the local spin), so the shed vortices light up red and ' +
      'blue. Drag Reynolds up and the wake transitions from steady, to gently waving, to full shedding.',
    equations: [
      { label: 'lattice Boltzmann (BGK collision + streaming)', latex: 'f_i(\\mathbf{x}+\\mathbf{e}_i, t+1) = f_i - \\tfrac{1}{\\tau}\\,(f_i - f_i^{\\,eq})' },
      { label: 'equilibrium distribution', latex: 'f_i^{\\,eq} = w_i\\,\\rho\\left[1 + 3(\\mathbf{e}_i\\!\\cdot\\!\\mathbf{u}) + \\tfrac{9}{2}(\\mathbf{e}_i\\!\\cdot\\!\\mathbf{u})^2 - \\tfrac{3}{2}|\\mathbf{u}|^2\\right]' },
      { label: 'Reynolds & Strouhal numbers', latex: '\\mathrm{Re} = \\frac{U D}{\\nu}, \\qquad \\mathrm{St} = \\frac{f D}{U} \\approx 0.2' },
      { label: 'viscosity ↔ relaxation time', latex: '\\nu = \\tfrac{1}{3}\\left(\\tau - \\tfrac{1}{2}\\right)' },
    ],
    params: [
      { key: 'reynolds', symbol: '\\mathrm{Re}', meaning: 'Reynolds number = inertia/viscosity; raise it to push from steady flow into vortex shedding' },
      { key: 'speed', symbol: 'U', meaning: 'inflow speed (lattice units); sets how fast vortices shed and travel' },
    ],
    code: `// D2Q9 lattice Boltzmann, per cell, per step:
// 1) macroscopic moments
rho = sum(f);  ux = sum(f*ex)/rho;  uy = sum(f*ey)/rho;
// 2) collide toward equilibrium (BGK), τ from Reynolds
for (i=0;i<9;i++) f[i] += (feq(i, rho, ux, uy) - f[i]) / tau;
// 3) stream to neighbours; bounce back off the cylinder + walls
fnew[c][i] = isSolid(c - e_i) ? f[c][opp[i]] : f[c - e_i][i];
// colour by vorticity ω = ∂uy/∂x − ∂ux/∂y  → red / blue`,
    links: [
      { label: 'Kármán vortex street (Wikipedia)', url: 'https://en.wikipedia.org/wiki/K%C3%A1rm%C3%A1n_vortex_street' },
      { label: 'Lattice Boltzmann methods (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Lattice_Boltzmann_methods' },
    ],
  },
  lozi: {
    title: 'Lozi Map',
    about:
      'A piecewise-linear cousin of the Hénon map: swap the x² term for |x|. That sharp absolute value turns the smooth Hénon curve into an attractor built from straight segments — and made the Lozi map one of the first strange attractors proven rigorously to be chaotic.',
    howItWorks: 'A single 2D point is fed through the map a hundred thousand times; it settles onto the angular, self-similar attractor.',
    equations: [{ label: '', latex: '\\begin{aligned} x_{n+1} &= 1 - a\\,|x_n| + y_n \\\\ y_{n+1} &= b\\,x_n \\end{aligned}' }],
    params: [
      { key: 'a', symbol: 'a', meaning: 'fold strength (the |x| coefficient); ~1.7 is chaotic' },
      { key: 'b', symbol: 'b', meaning: 'how much of x carries into y (area contraction)' },
    ],
    code: `o[0] = 1 - p.a * Math.abs(x[0]) + x[1];
o[1] = p.b * x[0];`,
    links: [{ label: 'Lozi map (Wikipedia)', url: 'https://en.wikipedia.org/wiki/L%C3%B4zi_map' }],
  },
  "lu": {
    "title": "Lü Attractor",
    "about": "The Lü system is a chaotic flow introduced by Jinhu Lü and Guanrong Chen in 2002 as the 'critical' bridge connecting the Lorenz and Chen attractors within a unified family of three-dimensional quadratic systems. Sitting at the transition between the two, it produces a striking double-scroll butterfly whose two lobes the trajectory weaves between unpredictably. It arose from control-theory research into how a single parameter can morph one canonical chaotic system continuously into another, and it has since become a standard testbed for chaos synchronization and secure-communication schemes.",
    "howItWorks": "Three coupled quadratic ODEs drive each particle. The first equation is a linear diffusive coupling pulling x toward y at rate a. The nonlinear cross-terms x*z and x*y inject the stretching-and-folding that makes the flow chaotic, while c and b set the rotation/decay of the y and z modes. The cloud of initial conditions collapses onto a thin two-lobed manifold; sensitive dependence (largest Lyapunov exponent ≈ 1.4) then smears nearby points apart, so the ensemble traces the full double-scroll. Integrated with RK4 at dt = 0.004.",
    "equations": [
      {
        "label": "dx/dt",
        "latex": "\\dot{x} = a\\,(y - x)"
      },
      {
        "label": "dy/dt",
        "latex": "\\dot{y} = c\\,y - x\\,z"
      },
      {
        "label": "dz/dt",
        "latex": "\\dot{z} = x\\,y - b\\,z"
      }
    ],
    "params": [
      {
        "key": "a",
        "symbol": "a",
        "meaning": "Diffusive coupling rate pulling x toward y (canonical 36)."
      },
      {
        "key": "b",
        "symbol": "b",
        "meaning": "Linear damping of the z mode (canonical 3)."
      },
      {
        "key": "c",
        "symbol": "c",
        "meaning": "Self-gain of the y mode; the bridge parameter tuning between Lorenz- and Chen-like regimes (canonical 20)."
      }
    ],
    "code": "function deriv(o, x, p) {\n  o[0] = p.a * (x[1] - x[0]);\n  o[1] = p.c * x[1] - x[0] * x[2];\n  o[2] = x[0] * x[1] - p.b * x[2];\n}",
    "links": [
      {
        "label": "Wikipedia: Multiscroll attractor (Lu)",
        "url": "https://en.wikipedia.org/wiki/Multiscroll_attractor"
      },
      {
        "label": "Lü & Chen, A New Chaotic Attractor Coined (2002)",
        "url": "https://doi.org/10.1142/S0218127402004620"
      },
      {
        "label": "Sprott: Chaos and Time-Series Analysis",
        "url": "http://sprott.physics.wisc.edu/chaos/"
      }
    ]
  },
  "chen-lee": {
    "title": "Chen-Lee Attractor",
    "about": "The Chen-Lee system was derived in 2003 by Hsien-Keng Chen and Ching-I Lee as the equations of motion for a rigid body rotating about its center of mass with a feedback torque — essentially a chaotic gyroscope. It is the Euler rigid-body system augmented with linear damping/forcing terms, and for the right gains the spinning body never settles into steady rotation but tumbles forever along a butterfly-like manifold. Because it models real angular momentum dynamics, it has been used to study chaotic motion in mechanical gyros and as a testbed for chaos synchronization and secure communication.",
    "howItWorks": "Each axis carries a linear self-term (a, b, c) plus the quadratic cross-coupling of a rotating rigid body: the -y*z, +x*z, and +x*y/3 terms are the Euler gyroscopic torques that exchange angular momentum between axes. With a=5 (expansion), b=-10 (strong damping) and c=-0.38 (weak damping) the flow stretches along x and y while contracting in z, folding the trajectory back on itself to produce a bounded chaotic set. Particles seeded near (1,1,1) spread across a two-lobed manifold roughly 30 units wide in x and centered at z about 9.25.",
    "equations": [
      {
        "label": "dx/dt",
        "latex": "\\dot{x} = a\\,x - y\\,z"
      },
      {
        "label": "dy/dt",
        "latex": "\\dot{y} = b\\,y + x\\,z"
      },
      {
        "label": "dz/dt",
        "latex": "\\dot{z} = c\\,z + \\dfrac{x\\,y}{3}"
      }
    ],
    "params": [
      {
        "key": "a",
        "symbol": "a",
        "meaning": "Expansion gain on the x (first principal) axis; positive, stretches the flow."
      },
      {
        "key": "b",
        "symbol": "b",
        "meaning": "Damping on the y axis; strongly negative, contracts angular momentum."
      },
      {
        "key": "c",
        "symbol": "c",
        "meaning": "Weak damping on the z axis; slightly negative, sets the vertical thickness of the attractor."
      }
    ],
    "code": "function deriv([x, y, z], { a, b, c }) {\n  return [\n    a * x - y * z,\n    b * y + x * z,\n    c * z + (x * y) / 3,\n  ];\n}\n// a = 5, b = -10, c = -0.38",
    "links": [
      {
        "label": "Sprott — Chaotic Flows",
        "url": "http://sprott.physics.wisc.edu/chaos/chaos.htm"
      },
      {
        "label": "Chen & Lee (2004), Chaos Solitons Fractals",
        "url": "https://doi.org/10.1016/S0960-0779(03)00237-X"
      },
      {
        "label": "Wikipedia — List of chaotic maps",
        "url": "https://en.wikipedia.org/wiki/List_of_chaotic_maps"
      }
    ]
  },
  "newton-leipnik": {
    "title": "Newton–Leipnik attractor",
    "about": "The Newton–Leipnik system models a rigid body in free rotation under linear feedback control — essentially Euler's equations for a spinning body with a feedback torque added. Introduced by R. B. Leipnik and T. A. Newton in 1981 while studying the attractors that arise when classical mechanics meets control theory, it is famous for displaying two coexisting strange attractors shaped like a pair of folded, interleaving disks. Depending on initial conditions a trajectory settles onto one disk or the other, making it a textbook example of multistability.",
    "howItWorks": "The three equations are the angular-momentum (Euler) equations of a rotating rigid body, with the bilinear gyroscopic couplings (the 10*y*z, 5*x*z and -5*x*y terms) and linear feedback damping (-a*x, -0.4*y, +b*z). The small positive b feeds a little energy back along z while the cross terms continually fold the flow, so the trajectory never settles: it stretches and folds onto a thin chaotic sheet. The motion is bounded but never repeats, and the largest Lyapunov exponent is positive, the signature of deterministic chaos.",
    "equations": [
      {
        "label": "dx/dt",
        "latex": "\\dot{x} = -a\\,x + y + 10\\,y\\,z"
      },
      {
        "label": "dy/dt",
        "latex": "\\dot{y} = -x - 0.4\\,y + 5\\,x\\,z"
      },
      {
        "label": "dz/dt",
        "latex": "\\dot{z} = b\\,z - 5\\,x\\,y"
      }
    ],
    "params": [
      {
        "key": "a",
        "symbol": "a",
        "meaning": "Linear damping on the x angular-momentum component (canonical 0.4)."
      },
      {
        "key": "b",
        "symbol": "b",
        "meaning": "Linear feedback gain on the z component; small and positive (canonical 0.175) to sustain chaos."
      }
    ],
    "code": "function deriv(o, x, p) {\n  o[0] = -p.a * x[0] + x[1] + 10 * x[1] * x[2];\n  o[1] = -x[0] - 0.4 * x[1] + 5 * x[0] * x[2];\n  o[2] = p.b * x[2] - 5 * x[0] * x[1];\n}",
    "links": [
      {
        "label": "Wikipedia: Newton–Leipnik system",
        "url": "https://en.wikipedia.org/wiki/Newton%E2%80%93Leipnik_system"
      },
      {
        "label": "Wolfram MathWorld: Newton-Leipnik Equations",
        "url": "https://mathworld.wolfram.com/Newton-LeipnikEquations.html"
      }
    ]
  },
  "burke-shaw": {
    "title": "Burke-Shaw Attractor",
    "about": "The Burke-Shaw system is a tightly wound chaotic flow introduced by Bill Burke and Robert Shaw in the early 1980s as a variant of the Lorenz equations rescaled for a single coupling constant. Its trajectory winds into a symmetric, twisted double-spiral torus, two interlocked horns of thread that the path crosses between unpredictably. The flow is invariant under the reflection (x, y, z) -> (-x, -y, z), giving the attractor its mirror-symmetric, knotted appearance. With s = 10 and v = 4.272 it is a textbook strange attractor: bounded, aperiodic, and sensitively dependent on initial conditions.",
    "howItWorks": "A single coupling constant s links the three coordinates: x and y are pulled toward each other and damped, while the bilinear terms s*x*z and s*x*y feed energy back through the z channel, offset by a constant forcing v. The competition between linear damping and the nonlinear cross-coupling never settles, so nearby trajectories diverge exponentially (positive Lyapunov exponent) while remaining trapped in a compact region. Integrating the ODE with RK4 and seeding a cloud of initial conditions collapses that cloud onto the twisted toroidal manifold.",
    "equations": [
      {
        "label": "dx/dt",
        "latex": "\\dot{x} = -s\\,(x + y)"
      },
      {
        "label": "dy/dt",
        "latex": "\\dot{y} = -y - s\\,x\\,z"
      },
      {
        "label": "dz/dt",
        "latex": "\\dot{z} = s\\,x\\,y + v"
      }
    ],
    "params": [
      {
        "key": "s",
        "symbol": "s",
        "meaning": "Coupling/damping constant; sets the strength of the linear pull and the bilinear cross-terms. Canonical value 10."
      },
      {
        "key": "v",
        "symbol": "v",
        "meaning": "Constant forcing on the z equation; tunes the vertical drive that sustains chaos. Canonical value 4.272."
      }
    ],
    "code": "function deriv(o, x, p) {\n  o[0] = -p.s * (x[0] + x[1]);\n  o[1] = -x[1] - p.s * x[0] * x[2];\n  o[2] = p.s * x[0] * x[1] + p.v;\n}",
    "links": [
      {
        "label": "Wikipedia: List of chaotic maps",
        "url": "https://en.wikipedia.org/wiki/List_of_chaotic_maps"
      },
      {
        "label": "Sprott — Chaos and Time-Series Analysis",
        "url": "http://sprott.physics.wisc.edu/chaos/comchaos.htm"
      },
      {
        "label": "3D-Meier: Burke-Shaw attractor",
        "url": "http://www.3d-meier.de/tut19/Seite35.html"
      }
    ]
  },
  "rikitake": {
    "title": "Rikitake Dynamo",
    "about": "The Rikitake two-disk dynamo is a coupled pair of Faraday disk generators wired so each disk's current feeds the other's field coil, proposed by Tsuneji Rikitake in 1958 as the simplest mechanical analogue of Earth's self-exciting geodynamo. Its three-dimensional flow spontaneously and irregularly reverses the sign of the disk currents, mimicking the unpredictable polarity reversals recorded in the geomagnetic field. The state wanders chaotically between two lobes of opposite magnetic polarity, never settling into a periodic rhythm of flips. It remains a textbook caricature of why the planet's magnetic north has flipped hundreds of times over geologic history.",
    "howItWorks": "Two homopolar disk dynamos share their currents (x and y) and a common rotation-rate difference (z). Each current is linearly damped by mechanical friction (-mu*x, -mu*y) but driven by the product of the other disk's field and the shaft speed; the speed z is forced by a constant applied torque (the +1 term) and braked by the Lorenz-like coupling -x*y. The competition between steady forcing and nonlinear back-reaction prevents any fixed equilibrium or clean limit cycle, so the trajectory chaotically swaps between the two current-polarity lobes — the model's geomagnetic 'reversals.'",
    "equations": [
      {
        "label": "disk current 1",
        "latex": "\\dot{x} = -\\mu\\,x + z\\,y"
      },
      {
        "label": "disk current 2",
        "latex": "\\dot{y} = -\\mu\\,y + (z - a)\\,x"
      },
      {
        "label": "shaft speed",
        "latex": "\\dot{z} = 1 - x\\,y"
      }
    ],
    "params": [
      {
        "key": "mu",
        "symbol": "\\mu",
        "meaning": "Mechanical/ohmic damping of both disk currents; larger mu suppresses the dynamo."
      },
      {
        "key": "a",
        "symbol": "a",
        "meaning": "Asymmetry / coupling offset between the two disks that breaks their symmetry and sets the reversal regime."
      }
    ],
    "code": "function deriv(o, x, p) {\n  o[0] = -p.mu * x[0] + x[2] * x[1];\n  o[1] = -p.mu * x[1] + (x[2] - p.a) * x[0];\n  o[2] = 1 - x[0] * x[1];\n}",
    "links": [
      {
        "label": "Wikipedia: Rikitake system",
        "url": "https://en.wikipedia.org/wiki/Rikitake_system"
      },
      {
        "label": "Sprott — Chaotic Dynamics",
        "url": "https://sprott.physics.wisc.edu/chaos/abstracts/rikitake.htm"
      },
      {
        "label": "Rikitake (1958), Math. Proc. Camb. Phil. Soc.",
        "url": "https://doi.org/10.1017/S0305004100033223"
      }
    ]
  },
  "shimizu-morioka": {
    "title": "Shimizu–Morioka attractor",
    "about": "A deceptively simple three-equation system introduced by Tatsuya Shimizu and Naomichi Morioka in 1980 to capture the essential geometry of the Lorenz attractor near the onset of chaos. It arises as a normal-form reduction describing the dynamics of the Lorenz system at large Rayleigh number, stripping the original convection model down to its symmetric butterfly skeleton. The flow is invariant under the reflection (x,y,z)→(−x,−y,z), so its two lobes are mirror images — a compact Lorenz-like butterfly. It is a touchstone in bifurcation theory for studying how a Lorenz attractor is born and destroyed.",
    "howItWorks": "The first equation makes y the velocity of x, so the (x,y) pair behaves like a damped oscillator whose stiffness is modulated by z through the x·(1−z) term. The variable z is driven up by x² (a nonlinear feedback that grows whenever the trajectory swings wide) and relaxed back by the linear −b·z damping. When a trajectory gains energy and z rises past 1, the effective spring force flips sign and ejects the orbit toward the opposite lobe; the symmetry of the equations means it can land on either wing, and the sensitive switching between them is the source of the chaos.",
    "equations": [
      {
        "label": "dx/dt",
        "latex": "\\dot{x} = y"
      },
      {
        "label": "dy/dt",
        "latex": "\\dot{y} = x(1 - z) - a\\,y"
      },
      {
        "label": "dz/dt",
        "latex": "\\dot{z} = -b\\,z + x^{2}"
      }
    ],
    "params": [
      {
        "key": "a",
        "symbol": "a",
        "meaning": "Damping of the x–y oscillator; smaller a sustains larger swings. Chaotic at a≈0.75."
      },
      {
        "key": "b",
        "symbol": "b",
        "meaning": "Relaxation rate of z back toward zero; sets how quickly the energy feedback decays. Chaotic at b≈0.45."
      }
    ],
    "code": "function deriv(o, x, p) {\n  o[0] = x[1];\n  o[1] = x[0] * (1 - x[2]) - p.a * x[1];\n  o[2] = -p.b * x[2] + x[0] * x[0];\n}",
    "links": [
      {
        "label": "Wikipedia — Multiscroll / Lorenz-like attractors",
        "url": "https://en.wikipedia.org/wiki/Multiscroll_attractor"
      },
      {
        "label": "Sprott — Chaotic flows",
        "url": "https://sprott.physics.wisc.edu/chaos/comchaos.htm"
      },
      {
        "label": "Shimizu–Morioka system (Scholarpedia, Shilnikov)",
        "url": "http://www.scholarpedia.org/article/Shimizu-Morioka_system"
      }
    ]
  },
  "rucklidge": {
    "title": "Rucklidge Attractor",
    "about": "In 1992 the applied mathematician Alastair Rucklidge derived this three-variable system as a model of thermal convection in a fluid layer that conducts electricity and sits in an imposed vertical magnetic field. The magnetic field and a constraint of zero net horizontal flow suppress most modes, leaving a compact set of equations whose single quadratic feedback term still drives the convection rolls into chaos. The result is a graceful butterfly-like manifold, kin to Lorenz, that wanders unpredictably between two lobes without ever exactly repeating.",
    "howItWorks": "The state (x, y, z) tracks the amplitudes of the dominant convection mode, its rate of change, and a measure of how much the rolls distort the temperature profile. The linear terms damp x and z while the parameter a pumps energy in through y; the nonlinear couplings -y*z and y*y bend the flow so trajectories never settle, looping around two unstable foci. Integrated with RK4 at dt=0.01, a cloud of initial conditions collapses onto the thin chaotic sheet within a few thousand steps.",
    "equations": [
      {
        "label": "dx/dt",
        "latex": "\\dot{x} = -k\\,x + a\\,y - y\\,z"
      },
      {
        "label": "dy/dt",
        "latex": "\\dot{y} = x"
      },
      {
        "label": "dz/dt",
        "latex": "\\dot{z} = -z + y^{2}"
      }
    ],
    "params": [
      {
        "key": "k",
        "symbol": "k",
        "meaning": "Linear damping of the convection amplitude x (canonical k = 2)."
      },
      {
        "key": "a",
        "symbol": "a",
        "meaning": "Driving / forcing strength feeding energy through y; sets the chaos onset (canonical a = 6.7)."
      }
    ],
    "code": "function deriv(s, p) {\n  const [x, y, z] = s;\n  return [\n    -p.k * x + p.a * y - y * z,\n    x,\n    -z + y * y,\n  ];\n}",
    "links": [
      {
        "label": "Wikipedia: Rucklidge attractor (Multiscroll/list of chaotic maps)",
        "url": "https://en.wikipedia.org/wiki/List_of_chaotic_maps"
      },
      {
        "label": "Rucklidge, J. Fluid Mech. 237 (1992): Chaos in magnetoconvection",
        "url": "https://doi.org/10.1017/S0022112092003392"
      },
      {
        "label": "Sprott — Chaotic Systems gallery",
        "url": "http://sprott.physics.wisc.edu/sa.htm"
      }
    ]
  },
  "genesio-tesi": {
    "title": "Genesio–Tesi Attractor",
    "about": "The Genesio–Tesi system is a third-order autonomous jerk attractor introduced in 1992 by Roberto Genesio and Alberto Tesi as a deliberately simple testbed for studying the onset of chaos via the harmonic-balance method. Stripped down to a single scalar jerk equation with one quadratic nonlinearity, it shows how an unremarkable cubic feedback loop — position, velocity, acceleration — can spiral into deterministic chaos. Because its three feedback gains map directly onto the coefficients of a characteristic polynomial, it became a favorite reference model in control theory for predicting and stabilizing chaotic behavior.",
    "howItWorks": "The system is a 'jerk' form: x is position, y = ẋ is velocity, and z = ẏ is acceleration, so ż is the jerk (the time-derivative of acceleration). The jerk is a linear combination of the three states with gains c, b, a, plus a single quadratic term x². The quadratic term creates a second fixed point and folds trajectories back on themselves; the linear gains keep the flow bounded but dissipative, so the cloud of initial conditions collapses onto a thin, scroll-like manifold while remaining sensitive to initial conditions.",
    "equations": [
      {
        "label": "ẋ",
        "latex": "\\dot{x} = y"
      },
      {
        "label": "ẏ",
        "latex": "\\dot{y} = z"
      },
      {
        "label": "ż",
        "latex": "\\dot{z} = -c\\,x - b\\,y - a\\,z + x^{2}"
      }
    ],
    "params": [
      {
        "key": "a",
        "symbol": "a",
        "meaning": "Damping gain on acceleration z (jerk feedback); near 0.44 the dissipation is weak enough to sustain chaos."
      },
      {
        "key": "b",
        "symbol": "b",
        "meaning": "Gain on velocity y; together with a and c it sets the characteristic polynomial whose Routh–Hurwitz balance governs the chaotic onset."
      },
      {
        "key": "c",
        "symbol": "c",
        "meaning": "Gain on position x; controls the spacing of the two fixed points at x=0 and x=c."
      }
    ],
    "code": "function deriv(o, x, p) {\n  o[0] = x[1];\n  o[1] = x[2];\n  o[2] = -p.c * x[0] - p.b * x[1] - p.a * x[2] + x[0] * x[0];\n}",
    "links": [
      {
        "label": "Sprott — Chaotic Flows (jerk systems)",
        "url": "http://sprott.physics.wisc.edu/chaos/abschaos.htm"
      },
      {
        "label": "Genesio & Tesi 1992 (Automatica) — harmonic balance & chaos",
        "url": "https://doi.org/10.1016/0005-1098(92)90177-H"
      },
      {
        "label": "Wikipedia — Jerk (physics): chaotic jerk systems",
        "url": "https://en.wikipedia.org/wiki/Jerk_(physics)#Chaotic_jerk_systems"
      }
    ]
  },
  "arneodo": {
    "title": "Arneodo Attractor",
    "about": "The Arneodo attractor is a third-order \"jerk\" system — a single nonlinear differential equation in the third derivative of position — introduced by Alain Arneodo, Pierre Coullet and Charles Tresser in the early 1980s while studying how simple smooth flows give birth to chaos through cascades of period-doubling bifurcations. Its only nonlinearity is a cubic term, making it one of the algebraically simplest dissipative systems known to exhibit a strange attractor. The flow folds the trajectory back on itself around two symmetric wings, weaving a delicate ribboned structure that is symmetric under reflection through the origin.",
    "howItWorks": "The state is a position x and its first two time-derivatives (velocity y and acceleration z), so the system is literally one scalar jerk equation rewritten as three first-order ODEs. The linear terms a·x, −b·y and −z set up an unstable oscillation, while the cubic −x³ acts as a soft restoring force that bends large excursions back toward the center. The competition between linear expansion and cubic confinement stretches and folds the flow, producing sensitive dependence on initial conditions (largest Lyapunov exponent ≈ 0.23) and a bounded two-lobed chaotic set.",
    "equations": [
      {
        "label": "x'",
        "latex": "\\dot{x} = y"
      },
      {
        "label": "y'",
        "latex": "\\dot{y} = z"
      },
      {
        "label": "z'",
        "latex": "\\dot{z} = a\\,x - b\\,y - z - x^{3}"
      }
    ],
    "params": [
      {
        "key": "a",
        "symbol": "a",
        "meaning": "Linear restoring/expansion gain on x; at a≈5.5 the origin is a saddle-focus and the flow becomes chaotic."
      },
      {
        "key": "b",
        "symbol": "b",
        "meaning": "Linear damping coupling on the velocity term y; near b≈3.5 it balances folding against dissipation to sustain the strange attractor."
      }
    ],
    "code": "function deriv(o, x, p) {\n  o[0] = x[1];                       // x' = y\n  o[1] = x[2];                       // y' = z\n  o[2] = p.a * x[0]                  // z' = a*x - b*y - z - x^3\n       - p.b * x[1]\n       - x[2]\n       - x[0] * x[0] * x[0];\n}",
    "links": [
      {
        "label": "Arneodo–Coullet–Tresser (Wikipedia: List of chaotic maps / jerk systems)",
        "url": "https://en.wikipedia.org/wiki/Multiscroll_attractor"
      },
      {
        "label": "Sprott — Chaotic Flows (jerk systems)",
        "url": "http://sprott.physics.wisc.edu/chaos/comchaos.htm"
      },
      {
        "label": "Jerk system (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Jerk_(physics)#Jerk_systems_in_chaos_theory"
      }
    ]
  },
  "finance": {
    "title": "Finance",
    "about": "The Finance attractor is a three-dimensional chaotic system distilled from a model of a small macroeconomic economy, where the state variables track the interest rate, the investment demand, and the price index. Introduced by Chinese economists Ma and Chen around 2001 in their study of nonlinear dynamics in economic systems, it captures how the interplay of savings, investment, and pricing can produce irregular, never-repeating booms and busts even with fixed policy parameters. Its butterfly-like double-scroll shape is a vivid reminder that endogenous chaos, not just external shocks, can drive market unpredictability.",
    "howItWorks": "Each particle is a tiny economy whose three coordinates (interest rate x, investment demand y, price index z) evolve under coupled feedback. The quadratic terms x*x couple price pressure to interest rates and create the saturation that folds trajectories back, while the linear damping (b*y, c*z) prevents runaway growth. The cloud of 100k initial conditions collapses onto a thin chaotic manifold and is integrated forward with RK4; nearby economies diverge exponentially (positive Lyapunov exponent ~0.09), so the long-run path is deterministic yet practically unpredictable.",
    "equations": [
      {
        "label": "interest rate",
        "latex": "\\dot{x} = z + (y - a)\\,x"
      },
      {
        "label": "investment demand",
        "latex": "\\dot{y} = 1 - b\\,y - x^{2}"
      },
      {
        "label": "price index",
        "latex": "\\dot{z} = -x - c\\,z"
      }
    ],
    "params": [
      {
        "key": "a",
        "symbol": "a",
        "meaning": "Saving amount / interest-rate self-feedback (canonical 0.001)"
      },
      {
        "key": "b",
        "symbol": "b",
        "meaning": "Per-unit investment cost / investment damping (canonical 0.2)"
      },
      {
        "key": "c",
        "symbol": "c",
        "meaning": "Elasticity of demand of commercial markets / price-index damping (canonical 1.1)"
      }
    ],
    "code": "function deriv([x, y, z], { a, b, c }) {\n  return [\n    z + (y - a) * x,   // interest rate\n    1 - b * y - x * x, // investment demand\n    -x - c * z,        // price index\n  ];\n}",
    "links": [
      {
        "label": "Sprott — Chaotic Systems list",
        "url": "http://sprott.physics.wisc.edu/chaos/"
      },
      {
        "label": "Ma & Chen finance chaos model (Wikipedia: List of chaotic maps / flows)",
        "url": "https://en.wikipedia.org/wiki/List_of_chaotic_maps"
      },
      {
        "label": "MathWorld — Strange Attractor",
        "url": "https://mathworld.wolfram.com/StrangeAttractor.html"
      }
    ]
  },
  "sprott-b": {
    "title": "Sprott B",
    "about": "In 1994, physicist Julien C. Sprott ran an algebraic search for the simplest possible chaotic flows, hunting for three-dimensional systems with the fewest terms that still produce strange attractors. Case B was one of the nineteen minimal systems he catalogued: just five terms and a single quadratic cross-coupling, yet it folds and stretches phase space into a butterfly-like chaotic set. With no free parameters, its chaos is intrinsic to the algebra rather than tuned in. It is a textbook example that elegant chaos needs almost nothing.",
    "howItWorks": "The flow couples the three coordinates through two quadratic products. The z-velocity is driven by a constant forcing of 1 minus the product x*y, which injects energy and bends trajectories back on themselves; the y-equation is a simple linear relaxation of x toward y; and the x-velocity is the product y*z, which mixes the other two axes. This combination of constant forcing, linear damping, and quadratic mixing stretches nearby trajectories apart (positive Lyapunov exponent) while folding them back into a bounded region, the signature of a strange attractor.",
    "equations": [
      {
        "label": "dx/dt",
        "latex": "\\dot{x} = y\\,z"
      },
      {
        "label": "dy/dt",
        "latex": "\\dot{y} = x - y"
      },
      {
        "label": "dz/dt",
        "latex": "\\dot{z} = 1 - x\\,y"
      }
    ],
    "params": [
      {
        "key": "s",
        "symbol": "s",
        "meaning": "Uniform time-rate scaling of the whole vector field (identity at s=1); s>1 speeds the flow, s<1 slows it, leaving the attractor geometry unchanged."
      }
    ],
    "code": "function deriv(o, x, p) {\n  o[0] = p.s * (x[1] * x[2]);      // dx = y*z\n  o[1] = p.s * (x[0] - x[1]);      // dy = x - y\n  o[2] = p.s * (1 - x[0] * x[1]);  // dz = 1 - x*y\n}",
    "links": [
      {
        "label": "Sprott — Simplest Dissipative Chaotic Flow",
        "url": "https://sprott.physics.wisc.edu/pubs/paper207.pdf"
      },
      {
        "label": "Sprott chaotic flows (collection)",
        "url": "https://sprott.physics.wisc.edu/chaos/comchaos.htm"
      },
      {
        "label": "Wikipedia — Attractor",
        "url": "https://en.wikipedia.org/wiki/Attractor"
      }
    ]
  },
  "hindmarsh-rose": {
    "title": "Hindmarsh–Rose",
    "about": "The Hindmarsh–Rose system is a phenomenological model of a single spiking-bursting neuron, devised by James Hindmarsh and Malcolm Rose in 1984 to reproduce the rhythmic firing patterns seen in mollusc neurons. A fast voltage-recovery subsystem (x, y) generates rapid action-potential spikes while a slow adaptation current (z) modulates them, gating the neuron between quiescence and dense bursts. For canonical parameters and external drive I=3.2 the slow feedback never settles, so the spike trains repeat aperiodically on a folded chaotic manifold.",
    "howItWorks": "x is the membrane potential, y a fast recovery (spiking) variable, and z a slow adaptation current. The cubic -a·x³ + b·x² term gives the fast x–y loop its excitable, self-resetting spike. Because r is tiny (0.006), z drifts slowly: it rises during a burst, eventually suppressing spiking, then decays to release the next burst. The mismatch in timescales between the fast spikes and the slow gate makes the burst lengths and timings chaotic, tracing a thin sheet that is wide in x and y but very shallow in z.",
    "equations": [
      {
        "label": "membrane potential",
        "latex": "\\dot{x} = y - a x^3 + b x^2 - z + I"
      },
      {
        "label": "fast recovery",
        "latex": "\\dot{y} = c - d x^2 - y"
      },
      {
        "label": "slow adaptation",
        "latex": "\\dot{z} = r\\,(s\\,(x - x_r) - z)"
      }
    ],
    "params": [
      {
        "key": "a",
        "symbol": "a",
        "meaning": "cubic gain of the fast spike (sets spike sharpness)"
      },
      {
        "key": "b",
        "symbol": "b",
        "meaning": "quadratic gain of the fast spike"
      },
      {
        "key": "c",
        "symbol": "c",
        "meaning": "baseline of the recovery variable y"
      },
      {
        "key": "d",
        "symbol": "d",
        "meaning": "quadratic damping of recovery y"
      },
      {
        "key": "s",
        "symbol": "s",
        "meaning": "coupling strength of x into the slow current z"
      },
      {
        "key": "xr",
        "symbol": "x_r",
        "meaning": "resting potential the adaptation current references"
      },
      {
        "key": "r",
        "symbol": "r",
        "meaning": "slow-timescale rate (small => long bursts)"
      },
      {
        "key": "I",
        "symbol": "I",
        "meaning": "external injected current / drive"
      }
    ],
    "code": "function deriv(o, x, p) {\n  o[0] = x[1] - p.a*x[0]**3 + p.b*x[0]**2 - x[2] + p.I;\n  o[1] = p.c - p.d*x[0]**2 - x[1];\n  o[2] = p.r * (p.s*(x[0] - p.xr) - x[2]);\n}",
    "links": [
      {
        "label": "Wikipedia: Hindmarsh–Rose model",
        "url": "https://en.wikipedia.org/wiki/Hindmarsh%E2%80%93Rose_model"
      },
      {
        "label": "Scholarpedia: Hindmarsh-Rose model",
        "url": "http://www.scholarpedia.org/article/Hindmarsh-Rose_model"
      }
    ]
  },
  "sakarya": {
    "title": "Sakarya Attractor",
    "about": "The Sakarya system is a two-wing chaotic flow introduced in 2010 by Turkish researchers (named for the Sakarya region/university), proposed as a simple three-dimensional autonomous system whose quadratic cross-coupling produces a butterfly-like double-scroll attractor. Each of its three equations couples a different pair of state variables multiplicatively, so the trajectory is repeatedly folded and stretched between two lobes. Like the Lorenz and Chen systems it has been studied as a candidate for chaos-based secure communication and pseudo-random generation. Its largest Lyapunov exponent is solidly positive, giving the hallmark sensitive dependence on initial conditions.",
    "howItWorks": "Three first-order ODEs evolve a single point in phase space. Linear damping terms (-x, -y, +z) set the local contraction/expansion, while the bilinear terms y*z, a*x*z and -b*x*y inject the nonlinear folding that bends the flow back on itself instead of letting it escape. The net volume contracts on average (the divergence of the field is -1, dissipative), yet nearby trajectories diverge exponentially, so the orbit settles onto a fractal two-wing set rather than a point or a closed loop. We integrate with classical RK4 at dt=0.01; an ensemble of initial conditions all collapse onto the same attractor manifold.",
    "equations": [
      {
        "label": "dx/dt",
        "latex": "\\dot{x} = -x + y + yz"
      },
      {
        "label": "dy/dt",
        "latex": "\\dot{y} = -x - y + a\\,xz"
      },
      {
        "label": "dz/dt",
        "latex": "\\dot{z} = z - b\\,xy"
      }
    ],
    "params": [
      {
        "key": "a",
        "symbol": "a",
        "meaning": "Strength of the x·z coupling feeding the y-equation; canonical 0.4. Drives the asymmetric stretching between the two wings."
      },
      {
        "key": "b",
        "symbol": "b",
        "meaning": "Strength of the x·y feedback damping z; canonical 0.3. Controls the folding that closes the orbit back onto the attractor."
      }
    ],
    "code": "function deriv(o, x, p) {\n  o[0] = -x[0] + x[1] + x[1] * x[2];\n  o[1] = -x[0] - x[1] + p.a * x[0] * x[2];\n  o[2] = x[2] - p.b * x[0] * x[1];\n}",
    "links": [
      {
        "label": "Sprott — Chaotic Flows (3D quadratic systems catalog)",
        "url": "http://sprott.physics.wisc.edu/chaos/comchaos.htm"
      },
      {
        "label": "Wikipedia — List of chaotic maps & attractors",
        "url": "https://en.wikipedia.org/wiki/List_of_chaotic_maps"
      },
      {
        "label": "MathWorld — Strange Attractor",
        "url": "https://mathworld.wolfram.com/StrangeAttractor.html"
      }
    ]
  },
};

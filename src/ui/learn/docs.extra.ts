import type { SystemDoc } from './content';

// Curated learn-panel content for additional emergent systems (Lenia, DLA).
export const EXTRA_DOCS: Record<string, SystemDoc> = {
  'henon-heiles': {
    title: 'Hénon–Heiles',
    about:
      'In 1964 Michel Hénon and Carl Heiles asked whether a star orbiting in a galaxy conserves a third quantity beyond its energy and angular momentum. Their toy potential — a harmonic well with a cubic distortion that gives it three-fold symmetry — became one of the cleanest windows into *conservative* chaos. Unlike a strange attractor nothing dissipates: energy is exactly conserved and the motion fills a constant-energy surface. Below the escape energy E = 1/6 the orbits split into two coexisting worlds — orderly KAM tori and a chaotic sea — the shape chaos takes before it looks fully random.',
    howItWorks:
      'A particle moves in the potential V(x,y) = ½(x²+y²) + λ(x²y − ⅓y³). Hamilton’s equations turn the energy H into four coupled first-order ODEs for position (x,y) and momentum (px,py), integrated with RK4 across an ensemble of ~100k slightly different starting points. The equipotential V = 1/6 forms a triangle with three saddle channels; seed energies stay below it so every orbit remains bound. We render (x, y, px) — a 3-D slice of the 4-D phase space.',
    equations: [
      { label: 'Hamiltonian (energy)', latex: 'H = \\tfrac12(p_x^2+p_y^2) + \\tfrac12(x^2+y^2) + \\lambda\\,(x^2 y - \\tfrac13 y^3)' },
      { label: 'position', latex: '\\dot x = p_x, \\qquad \\dot y = p_y' },
      { label: 'momentum', latex: '\\dot p_x = -x - 2\\lambda x y, \\qquad \\dot p_y = -y - \\lambda(x^2 - y^2)' },
      { label: 'escape energy (λ=1)', latex: 'E_{\\text{esc}} = \\tfrac16' },
    ],
    params: [
      { key: 'lambda', symbol: '\\lambda', meaning: 'strength of the cubic (anharmonic) coupling; λ=1 is the classic case with escape energy 1/6' },
    ],
    code: `// H = ½(px²+py²) + ½(x²+y²) + λ(x²y − ⅓y³)
dx  = px;
dy  = py;
dpx = -x - 2*lambda*x*y;
dpy = -y - lambda*(x*x - y*y);`,
    links: [
      { label: 'Hénon–Heiles system (Wikipedia)', url: 'https://en.wikipedia.org/wiki/H%C3%A9non%E2%80%93Heiles_system' },
      { label: 'KAM theorem (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Kolmogorov%E2%80%93Arnold%E2%80%93Moser_theorem' },
    ],
  },
  'double-pendulum': {
    title: 'Double Pendulum',
    about:
      'A pendulum hanging from a pendulum — two rigid arms, one joint, gravity. It is the most famous demonstration of deterministic chaos: the equations are exact and reversible, yet two pendulums released from almost the same angle diverge into completely different motions within seconds. Here ~100k pendulums start from a tight cloud of nearly identical angles; watch it explode apart as sensitive dependence on initial conditions takes over. Like Hénon–Heiles it is conservative — energy is preserved, so the motion never settles onto an attractor.',
    howItWorks:
      'The state is four numbers: the two arm angles (θ1,θ2) and their angular velocities (ω1,ω2). The coupled Euler–Lagrange equations (equal masses and lengths) give the angular accelerations; RK4 advances every pendulum each frame. Because an arm can swing over the top, the raw angles grow without bound — so instead of plotting angles we render the lower bob’s actual Cartesian position (x₂,y₂), which always stays within reach, using the upper arm’s x as depth.',
    equations: [
      { label: 'angles evolve by their velocities', latex: '\\dot\\theta_1=\\omega_1,\\qquad \\dot\\theta_2=\\omega_2' },
      { label: 'angular acceleration · arm 1 (m=l=1, Δ=θ₁−θ₂)', latex: '\\dot\\omega_1 = \\frac{-3g\\sin\\theta_1 - g\\sin(\\theta_1-2\\theta_2) - 2\\sin\\Delta\\,(\\omega_2^2+\\omega_1^2\\cos\\Delta)}{3-\\cos 2\\Delta}' },
      { label: 'angular acceleration · arm 2', latex: '\\dot\\omega_2 = \\frac{2\\sin\\Delta\\,(2\\omega_1^2 + 2g\\cos\\theta_1 + \\omega_2^2\\cos\\Delta)}{3-\\cos 2\\Delta}' },
      { label: 'lower bob (rendered position, not an ODE)', latex: 'x_2=\\sin\\theta_1+\\sin\\theta_2,\\quad y_2=-\\cos\\theta_1-\\cos\\theta_2' },
    ],
    params: [
      { key: 'g', symbol: 'g', meaning: 'gravitational strength; sets the swing rate and how energetic (chaotic) the motion is' },
    ],
    code: `// equal masses & lengths; Δ = θ1 − θ2, den = 3 − cos(2Δ)
dω1 = (-3*g*sin(θ1) - g*sin(θ1-2θ2) - 2*sin(Δ)*(ω2² + ω1²*cos(Δ))) / den;
dω2 = ( 2*sin(Δ)*(2*ω1² + 2*g*cos(θ1) + ω2²*cos(Δ)) ) / den;`,
    links: [
      { label: 'Double pendulum (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Double_pendulum' },
      { label: 'Chaos theory (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Chaos_theory' },
    ],
  },
  pendulumWave: {
    title: 'Pendulum Wave',
    about:
      'The "pendulum snake" — a row of uncoupled pendulums whose lengths are tuned so that, in one fixed cycle, the longest completes a set number of swings and each shorter neighbour does exactly one more. Released together from a straight line they drift out of step into a travelling wave, tangle into what looks like chaos, then — because every period divides the cycle evenly — snap back into perfect alignment. It is the opposite of chaos: fully deterministic and exactly periodic, yet mesmerising. A staple science-museum demo (famously at Harvard).',
    howItWorks:
      'Each pendulum is an independent simple-harmonic oscillator with its own angular frequency ωᵢ = 2π(baseOsc + i)/T. No integrator is needed — the motion is the closed form θᵢ(t) = A·cos(ωᵢ t), which can never drift or blow up. Because every ωᵢ·T is an exact integer multiple of 2π, all phases realign every T seconds. We render the pendulums as hanging strings that swing in depth (z), so the travelling wave reads as a curtain rippling across the row.',
    equations: [
      { label: 'per-pendulum frequency (index i sets it)', latex: '\\omega_i = \\dfrac{2\\pi\\,(\\text{baseOsc} + i)}{T}' },
      { label: 'closed-form motion (no integration)', latex: '\\theta_i(t) = A\\,\\cos(\\omega_i\\,t)' },
      { label: 'exact re-synchronisation every cycle', latex: '\\omega_i\\,T = 2\\pi\\,(\\text{baseOsc}+i) \\in 2\\pi\\,\\mathbb{Z}' },
    ],
    params: [
      { key: 'baseOsc', symbol: 'n_0', meaning: 'swings the longest (first) pendulum makes per cycle; each successive one does +1' },
      { key: 'cycleTime', symbol: 'T', meaning: 'seconds for the whole row to drift apart and re-synchronise' },
      { key: 'amplitude', symbol: 'A', meaning: 'swing amplitude (radians)' },
    ],
    code: `// each pendulum i has its own frequency from its index
omega_i = 2*Math.PI * (baseOsc + i) / cycleTime;
phase_i = (phase_i + omega_i * dt) % (2*Math.PI);
theta_i = amplitude * Math.cos(phase_i);   // exact SHM`,
    links: [
      { label: 'Pendulum wave (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Pendulum_wave' },
      { label: 'Simple harmonic motion (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Simple_harmonic_motion' },
    ],
  },
  duffing: {
    title: 'Duffing (forced)',
    about:
      'A mass sitting in a double-well potential, gently damped and shaken by a periodic force — the textbook example of how a simple nonlinear oscillator slides into chaos. For the right drive, the particle hops between the two wells in a sequence that never repeats: tiny differences in starting point grow exponentially (a positive Lyapunov exponent). Strobe the motion once per drive cycle and the scattered points trace a fractal strange attractor.',
    howItWorks:
      'The driven equation ẍ + δẋ − x + x³ = γcos(ωt) is made autonomous by carrying the drive phase φ = ωt as a third variable, giving three first-order ODEs for (x, v, φ) integrated with RK4 across ~100k starting points. The cubic −x + x³ is the double well; δ damps; γ and ω set the forcing. The phase φ grows without bound, so for display it is wrapped to [−π, π) — the attractor folds neatly onto a phase cylinder.',
    equations: [
      { label: 'forced Duffing oscillator (double well)', latex: '\\ddot x + \\delta\\dot x - x + x^3 = \\gamma\\cos(\\omega t)' },
      { label: 'autonomous first-order form', latex: '\\dot x = v,\\quad \\dot v = -\\delta v + x - x^3 + \\gamma\\cos\\varphi,\\quad \\dot\\varphi = \\omega' },
      { label: 'drive phase wrapped for display', latex: '\\varphi \\;\\to\\; ((\\varphi \\bmod 2\\pi) + 2\\pi)\\bmod 2\\pi - \\pi' },
    ],
    params: [
      { key: 'delta', symbol: '\\delta', meaning: 'damping; small values let chaos persist, large values settle to a cycle' },
      { key: 'gamma', symbol: '\\gamma', meaning: 'drive amplitude; the main knob that pushes the system into chaos' },
      { key: 'omega', symbol: '\\omega', meaning: 'drive frequency' },
    ],
    code: `// state [x, v, φ];  φ = ωt carried so the system is autonomous
dx = v;
dv = -delta*v + x - x*x*x + gamma*Math.cos(phi);
dphi = omega;`,
    links: [
      { label: 'Duffing equation (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Duffing_equation' },
      { label: 'Strange attractor (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Attractor#Strange_attractor' },
    ],
  },
  'magnetic-pendulum': {
    title: 'Magnetic Pendulum',
    about:
      'An iron bob swings on a string above three magnets set at the corners of a triangle. Eventually friction parks it over one magnet — but which one depends so exquisitely on where it started that the map of "starting point → final magnet" is a fractal, with the three colours interwoven down to infinitely fine scales. Release a whole disc of ~100k bobs and watch them stream and settle into the three basins.',
    howItWorks:
      'Newton’s second law in the plane: a central spring-like pull toward the origin, linear friction, and an attraction to each magnet softened by a length h that removes the 1/r² blow-up at close range. The state is the bob’s position and velocity (x, y, vₓ, v_y), advanced with RK4. We render (x, y, |v|): the basin plane with speed as height, so fast bobs ride high and settling ones sink onto the magnet sites (drawn as rings).',
    equations: [
      { label: 'planar equation of motion', latex: '\\ddot{\\mathbf r} = -k\\,\\mathbf r - c\\,\\dot{\\mathbf r} + \\sum_{j=1}^{3} \\frac{s\\,(\\mathbf m_j - \\mathbf r)}{\\big(|\\mathbf m_j - \\mathbf r|^2 + h^2\\big)^{3/2}}' },
      { label: 'magnets on a unit triangle', latex: '\\mathbf m_j = \\big(\\cos\\theta_j,\\ \\sin\\theta_j\\big),\\quad \\theta_j = \\tfrac{\\pi}{2},\\ -\\tfrac{\\pi}{6},\\ \\tfrac{7\\pi}{6}' },
    ],
    params: [
      { key: 'k', symbol: 'k', meaning: 'central restoring strength (the “gravity” pulling the bob back to centre)' },
      { key: 'c', symbol: 'c', meaning: 'friction; higher values settle the bobs faster' },
      { key: 'h', symbol: 'h', meaning: 'magnet softening length — smooths the pull at close range (kept ≥ 0.12 for stability)' },
      { key: 'strength', symbol: 's', meaning: 'magnet strength' },
    ],
    code: `// softened pull toward each magnet (no 1/r² singularity)
let ax = -k*px - c*vx, ay = -k*py - c*vy;
for (const [mx,my] of magnets) {
  const dx=mx-px, dy=my-py, r2=dx*dx+dy*dy+h*h;
  const inv = strength / (r2*Math.sqrt(r2));   // = s / r2^1.5
  ax += dx*inv;  ay += dy*inv;
}`,
    links: [
      { label: 'Magnetic pendulum & fractal basins', url: 'https://en.wikipedia.org/wiki/Magnetic_pendulum' },
      { label: 'Basin of attraction (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Attractor#Basins_of_attraction' },
    ],
  },
  kuramotoSivashinsky: {
    title: 'Kuramoto–Sivashinsky',
    about:
      'One of the simplest equations that turns order into turbulence all by itself. Born from models of flame fronts and thin liquid films, it balances an instability that pumps energy into long, lazy waves against a strong damping that crushes short, sharp ones; the nonlinearity then shuffles energy between scales. The result is never-repeating, cell-like spatiotemporal chaos. Shown here as a scrolling space–time plot — each new row of the field slides toward you over time.',
    howItWorks:
      'The field u(x,t) on a periodic domain of length L obeys uₜ = −u·uₓ − uₓₓ − uₓₓₓₓ. The −uₓₓ term is anti-diffusion (it grows long waves); −uₓₓₓₓ is hyper-diffusion (it kills short ones). It is solved in Fourier space with ETDRK2: the stiff linear operator λ(k) = k² − k⁴ is integrated *exactly* via the integrating factor e^{λΔt}, so the fourth-derivative term doesn’t force an impossibly small timestep. Space is the x-axis, time is the depth axis, and the field height drives both the relief and the colour.',
    equations: [
      { label: 'Kuramoto–Sivashinsky equation', latex: 'u_t = -\\,u\\,u_x - u_{xx} - u_{xxxx}' },
      { label: 'linear operator in Fourier space (per wavenumber k)', latex: '\\lambda(k) = k^2 - k^4' },
      { label: 'exact linear step (integrating factor)', latex: '\\hat u \\;\\to\\; e^{\\lambda \\Delta t}\\,\\hat u \\;+\\; (\\text{nonlinear correction})' },
    ],
    params: [
      { key: 'domainL', symbol: 'L', meaning: 'domain length; chaos sets in around L ≈ 22 and grows richer (more cells) as L increases' },
      { key: 'relief', symbol: 'h_y', meaning: 'vertical scale of the rendered height field (cosmetic)' },
      { key: 'spaceN', symbol: 'N', meaning: 'spatial / spectral resolution (grid points)' },
      { key: 'timeM', symbol: 'M', meaning: 'rows of time history kept in the scrolling plot' },
    ],
    code: `// spectral ETDRK2: linear part λ=k²−k⁴ solved exactly
const lam = k*k - k*k*k*k;          // per wavenumber
E = Math.exp(lam*dt);               // exact linear factor
// nonlinear term  −½·∂ₓ(u²)  in spectral space = −½·i·k·FFT(u²)
// û_{n+1} = E·û + Q·N(û) + (N(a)−N(û))·f2   (Cox–Matthews)`,
    links: [
      { label: 'Kuramoto–Sivashinsky equation (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Kuramoto%E2%80%93Sivashinsky_equation' },
      { label: 'Exponential time differencing (Kassam & Trefethen)', url: 'https://people.maths.ox.ac.uk/trefethen/publication/PDF/2005_111.pdf' },
    ],
  },
  'einstein-rosen': {
    title: 'Einstein–Rosen Bridge',
    about:
      'In 1935 Einstein and Rosen rewrote the Schwarzschild solution — the geometry around a spherical mass — and found it describes two universes joined by a "bridge": a non-traversable wormhole. This is the picture of spacetime as a stretched rubber sheet, made precise. It is Flamm’s paraboloid: the curved 2-D space around a black hole, lifted into 3-D so its curvature is visible. The narrow waist is the throat (the horizon at r = 2M); the two flaring funnels are the two asymptotically flat sheets.',
    howItWorks:
      'Take the equatorial slice of the Schwarzschild metric at a frozen instant and ask which surface of revolution in flat 3-D has the same intrinsic geometry. The answer has height z(r) = √(8M(r − 2M)) for r ≥ 2M; reflecting it and gluing the two copies at the throat gives the full bridge. We sample by embedding height h rather than radius r (so the throat, where the surface turns vertical, stays smooth): r = 2M + h²/(8M), then sweep the angle φ around. A static surface — drag the mass and reach to reshape it.',
    equations: [
      { label: 'embedding height (Flamm’s paraboloid)', latex: 'z(r) = \\sqrt{8M\\,(r - 2M)}, \\qquad r \\ge 2M' },
      { label: 'radius at embedding height h (= z, sampled directly)', latex: 'r = 2M + \\frac{h^2}{8M}' },
      { label: 'surface of revolution', latex: '(x,\\,y,\\,z) = (r\\cos\\varphi,\\; h,\\; r\\sin\\varphi)' },
    ],
    params: [
      { key: 'mass', symbol: 'M', meaning: 'black-hole mass; sets the throat radius (2M) and how sharply the funnels flare' },
      { key: 'reach', symbol: 'h_{\\max}', meaning: 'how far each sheet extends from the throat' },
    ],
    code: `// Flamm's paraboloid, parametrized by embedding height h (both sheets):
const h   = (a*2 - 1) * reach;     // −reach … +reach
const r   = 2*M + (h*h) / (8*M);   // throat radius 2M
const phi = b * 2*Math.PI;
x = r*Math.cos(phi);  y = h;  z = r*Math.sin(phi);`,
    links: [
      { label: 'Einstein–Rosen bridge (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Einstein%E2%80%93Rosen_bridge' },
      { label: 'Schwarzschild metric (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Schwarzschild_metric' },
    ],
  },
  grayScottField: {
    title: 'Gray-Scott (Turing)',
    about:
      'The Gray-Scott reaction-diffusion system is the canonical model of Alan Turing’s 1952 idea that two chemicals diffusing and reacting can spontaneously break symmetry into stable patterns — the mechanism behind leopard spots, fish stripes, and seashell markings. Two substances U and V spread across a grid at different speeds while V autocatalyses (U + 2V → 3V) and decays. Sweeping just two numbers, the feed rate f and kill rate k, walks through Pearson’s whole zoo: solitons, spots, stripes, mazes, coral growth, and self-replicating "mitosis" cells.',
    howItWorks:
      'Each cell holds concentrations U and V. Every tick they diffuse (a 9-point Laplacian averages each cell toward its neighbours) at rates D_u and D_v, V is produced by the cubic reaction U·V² and removed at rate f+k, and U is fed back toward 1 at rate f. Because V diffuses slower than U, local peaks of V are reinforced while their surroundings are depleted — the short-range-activation / long-range-inhibition that Turing showed makes patterns. V drives the relief height and colour; the grid is toroidal so patterns wrap seamlessly.',
    equations: [
      { label: 'U (slow feed)', latex: '\\dot{U} = D_u\\nabla^2 U - U V^2 + f\\,(1 - U)' },
      { label: 'V (autocatalytic)', latex: '\\dot{V} = D_v\\nabla^2 V + U V^2 - (f + k)\\,V' },
      { label: '9-point Laplacian', latex: '\\nabla^2\\!\\approx 0.2\\!\\sum_{\\text{edge}} + 0.05\\!\\sum_{\\text{diag}} - 1' },
    ],
    params: [
      { key: 'feed', symbol: 'f', meaning: 'feed rate replenishing U; with k it selects the pattern (Pearson classification)' },
      { key: 'kill', symbol: 'k', meaning: 'removal rate of V; f≈k≈0.06 gives coral/mitosis, lower k gives spots & worms' },
      { key: 'diffU', symbol: 'D_u', meaning: 'diffusion rate of U (the fast inhibitor)' },
      { key: 'diffV', symbol: 'D_v', meaning: 'diffusion rate of V (the slow activator) — D_v < D_u is what enables patterns' },
      { key: 'relief', symbol: 'h', meaning: 'how far V displaces the grid into 3D relief' },
    ],
    code: `// per cell, 9-point Laplacian on a toroidal grid
const uvv = u*v*v;
uNext = u + (Du*lapU - uvv + f*(1 - u));
vNext = v + (Dv*lapV + uvv - (f + k)*v);`,
    links: [
      { label: 'Reaction–diffusion (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Reaction%E2%80%93diffusion_system' },
      { label: 'Turing pattern (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Turing_pattern' },
      { label: 'Pearson, Complex Patterns in a Simple System (1993)', url: 'https://www.science.org/doi/10.1126/science.261.5118.189' },
      { label: 'Karl Sims — Reaction-Diffusion tutorial', url: 'https://www.karlsims.com/rd.html' },
    ],
  },
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
  "icon-sanddollar": {
    "title": "Icon · sanddollar",
    "about": "A symmetric icon from Michael Field and Martin Golubitsky's 'Symmetry in Chaos'. The plane is treated as the complex number z = x + iy, and a single polynomial map — equivariant under the dihedral group — is iterated a million times by a swarm of points. Because the map commutes with rotation by 2π/5, the resulting strange attractor is forced into a five-fold mandala: a chaotic orbit that nonetheless paints a perfectly symmetric flower. This particular tuning (λ = -2.34) blooms into a dense, lace-like five-petalled disc reminiscent of a sand dollar's radial test.",
    "howItWorks": "Each step computes zz̄ = x²+y² and the complex power (x+iy)⁴ (unrolled), whose real part times one more factor of z gives Re(z⁵). A scalar amplitude p = λ + α·zz̄ + β·Re(z⁵) modulates the radial push, while γ injects the z⁴ term and ω adds a swirl. Because every ingredient is built from rotationally-invariant quantities (zz̄, z⁵, z⁴), rotating any orbit point by 2π/5 yields another orbit point — so 100k seeds settle onto a set with exact five-fold rotational symmetry.",
    "equations": [
      {
        "label": "modulus & power",
        "latex": "z\\bar{z} = x^2 + y^2,\\quad (z_r + i z_i) = (x+iy)^4,\\quad z_n = x\\,z_r - y\\,z_i = \\operatorname{Re}(z^5)"
      },
      {
        "label": "amplitude",
        "latex": "p = \\lambda + \\alpha\\, z\\bar{z} + \\beta\\, z_n"
      },
      {
        "label": "x'",
        "latex": "x' = p\\,x + \\gamma\\, z_r - \\omega\\, y"
      },
      {
        "label": "y'",
        "latex": "y' = p\\,y - \\gamma\\, z_i + \\omega\\, x"
      }
    ],
    "params": [
      {
        "key": "lambda",
        "symbol": "λ",
        "meaning": "Linear gain / contraction; drives the overall radius and onset of chaos (-2.34 here)."
      },
      {
        "key": "alpha",
        "symbol": "α",
        "meaning": "Coupling to the squared modulus zz̄; the isotropic nonlinear restoring term."
      },
      {
        "key": "beta",
        "symbol": "β",
        "meaning": "Coupling to Re(z⁵); injects the five-fold angular harmonic that shapes the petals."
      },
      {
        "key": "gamma",
        "symbol": "γ",
        "meaning": "Weight of the z⁴ (z_r, z_i) term; adds the higher-order symmetric distortion."
      },
      {
        "key": "omega",
        "symbol": "ω",
        "meaning": "Rotational swirl coupling x↔y; 0 keeps reflection symmetry, nonzero twists the mandala."
      }
    ],
    "code": "const zzbar = x*x + y*y;\nconst a2 = x*x - y*y, b2 = 2*x*y;\nconst zr = a2*a2 - b2*b2, zi = 2*a2*b2; // (x+iy)^4\nconst zn = x*zr - y*zi;                 // Re(z^5)\nconst p = lambda + alpha*zzbar + beta*zn;\nx2 = p*x + gamma*zr - omega*y;\ny2 = p*y - gamma*zi + omega*x;",
    "links": [
      {
        "label": "Symmetry in Chaos (Field & Golubitsky)",
        "url": "https://en.wikipedia.org/wiki/Symmetry_in_Chaos"
      },
      {
        "label": "Symmetric icon / attractor (Paul Bourke)",
        "url": "https://paulbourke.net/fractals/icon/"
      },
      {
        "label": "Attractor — Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Attractor"
      },
      {
        "label": "Martin Golubitsky",
        "url": "https://en.wikipedia.org/wiki/Martin_Golubitsky"
      }
    ]
  },
  "icon-trinity": {
    "title": "Icon · trinity",
    "about": "A symmetric icon from Field and Golubitsky's \"Symmetry in Chaos,\" tuned to threefold rotational symmetry (D3 / Z3). The map iterates a single point through a polynomial built from the complex power z^n, and the chaotic orbit — averaged over a million bounces — settles into a lacy mandala that looks identical when spun by 120°. Each visited pixel is colored by how often the wandering point lands there, turning deterministic chaos into a stained-glass rosette. This is the n=3 'trinity' member of that family: three-armed, square-bounded, centered on the origin.",
    "howItWorks": "From the point z = x + iy the map forms three real invariants of the rotation group: zzbar = |z|² (rotation-invariant), and the real and imaginary parts of z² and z³ (the complex power, unrolled here for n=3). A scalar p = lambda + alpha·|z|² + beta·Re(z³) scales the radial push, gamma couples in z^{n-1} = z² to break the map away from a pure spiral, and omega adds a rotation. Because every term commutes with rotation by 2π/3, the attractor it carves out inherits exact threefold symmetry. Seed near the origin, discard the first ~1000 iterates as transient, then accumulate.",
    "equations": [
      {
        "label": "complex power (n=3)",
        "latex": "z_r = x^2 - y^2,\\quad z_i = 2xy,\\quad |z|^2 = x^2 + y^2,\\quad z_n = x\\,z_r - y\\,z_i"
      },
      {
        "label": "radial scalar",
        "latex": "p = \\lambda + \\alpha\\,|z|^2 + \\beta\\,z_n"
      },
      {
        "label": "x'",
        "latex": "x' = p\\,x + \\gamma\\,z_r - \\omega\\,y"
      },
      {
        "label": "y'",
        "latex": "y' = p\\,y - \\gamma\\,z_i + \\omega\\,x"
      }
    ],
    "params": [
      {
        "key": "lambda",
        "symbol": "λ",
        "meaning": "Linear gain on the radial push; the dominant stability/scale control."
      },
      {
        "key": "alpha",
        "symbol": "α",
        "meaning": "Coefficient of |z|² — quadratic radial feedback that bounds the orbit."
      },
      {
        "key": "beta",
        "symbol": "β",
        "meaning": "Coefficient of Re(zⁿ); injects the n-fold angular modulation."
      },
      {
        "key": "gamma",
        "symbol": "γ",
        "meaning": "Coupling of z^{n-1} into the output; sharpens the petal structure."
      },
      {
        "key": "omega",
        "symbol": "ω",
        "meaning": "Rotation term; twists the arms and tunes chirality."
      }
    ],
    "code": "const zr=x*x-y*y, zi=2*x*y, zz=x*x+y*y, zn=x*zr-y*zi;\nconst p=lambda+alpha*zz+beta*zn;\nx=p*x+gamma*zr-omega*y;\ny=p*y-gamma*zi+omega*x;",
    "links": [
      {
        "label": "Symmetric icons (Field & Golubitsky)",
        "url": "https://en.wikipedia.org/wiki/Symmetry_in_Chaos"
      },
      {
        "label": "Symmetric Chaos — MathWorld",
        "url": "https://mathworld.wolfram.com/SymmetricChaos.html"
      },
      {
        "label": "Sprott: Symmetric Icons",
        "url": "http://sprott.physics.wisc.edu/fractals/icons/"
      },
      {
        "label": "Cyclic / dihedral symmetry group",
        "url": "https://en.wikipedia.org/wiki/Cyclic_symmetry_in_three_dimensions"
      }
    ]
  },
  "icon-pentagram": {
    "title": "Icon · Pentagram",
    "about": "A symmetric icon from Michael Field and Martin Golubitsky's 'Symmetry in Chaos.' Take a single point, square the radius, raise the complex number to the fifth power, and feed the result back as a nonlinear kick — millions of iterations later the wandering orbit has painted a five-fold mandala that no single step ever planned. The chaos is locally unpredictable yet globally obeys the dihedral symmetry baked into the z^n term, so a pentagram-petalled flower emerges from pure feedback. Rotating the finished cloud by 72 degrees leaves it unchanged.",
    "howItWorks": "Each step works in the complex plane with z = x + iy. The map computes the squared modulus zz̄ = x²+y², the real part of z⁵ (which carries the 5-fold symmetry), and a state-dependent scalar p = λ + α·zz̄ + β·Re(z⁵). It then pushes z outward/inward by p while adding a rotated copy of z⁴ scaled by γ and a rigid rotation scaled by ω. Because every term is built from powers of z that are invariant (or equivariant) under rotation by 2π/5, the attractor the orbit settles onto inherits exact C₅ rotational symmetry. With β=ω=0 the symmetry is the full dihedral D₅, giving the mirror-symmetric pentagram.",
    "equations": [
      {
        "label": "modulus",
        "latex": "z\\bar{z} = x^2 + y^2"
      },
      {
        "label": "z^4 (unrolled)",
        "latex": "z_r = x^4 - 6x^2y^2 + y^4,\\quad z_i = 4xy(x^2 - y^2)"
      },
      {
        "label": "n-fold term",
        "latex": "z_n = \\operatorname{Re}(z^5) = x\\,z_r - y\\,z_i"
      },
      {
        "label": "scalar",
        "latex": "p = \\lambda + \\alpha\\,z\\bar{z} + \\beta\\,z_n"
      },
      {
        "label": "iterate",
        "latex": "x' = p\\,x + \\gamma\\,z_r - \\omega\\,y,\\quad y' = p\\,y - \\gamma\\,z_i + \\omega\\,x"
      }
    ],
    "params": [
      {
        "key": "lambda",
        "symbol": "λ",
        "meaning": "Linear gain on the current point; sets overall expansion/contraction and the size of the attractor."
      },
      {
        "key": "alpha",
        "symbol": "α",
        "meaning": "Cubic radial nonlinearity (couples to zz̄); the dominant chaos/folding control."
      },
      {
        "key": "beta",
        "symbol": "β",
        "meaning": "Couples to Re(zⁿ); breaks reflection to give a chiral spin while keeping rotational symmetry."
      },
      {
        "key": "gamma",
        "symbol": "γ",
        "meaning": "Strength of the symmetry-creating zⁿ⁻¹ kick that imprints the five petals."
      },
      {
        "key": "omega",
        "symbol": "ω",
        "meaning": "Rigid rotation per step; nonzero twists the pattern, destroying mirror symmetry."
      }
    ],
    "code": "const x2=x*x, y2=y*y;\nconst zr=x2*x2-6*x2*y2+y2*y2;      // Re(z^4)\nconst zi=4*x*y*(x2-y2);             // Im(z^4)\nconst zn=x*zr-y*zi;                 // Re(z^5)\nconst p=lambda+alpha*(x2+y2)+beta*zn;\nconst nx=p*x+gamma*zr-omega*y;\nconst ny=p*y-gamma*zi+omega*x;\nx=nx; y=ny;",
    "links": [
      {
        "label": "Symmetry in Chaos (Field & Golubitsky)",
        "url": "https://en.wikipedia.org/wiki/Symmetry_in_Chaos"
      },
      {
        "label": "Symmetric icon / chaotic attractor",
        "url": "https://mathworld.wolfram.com/StrangeAttractor.html"
      },
      {
        "label": "Cyclic / dihedral symmetry group",
        "url": "https://en.wikipedia.org/wiki/Dihedral_group"
      },
      {
        "label": "Sprott — Strange Attractors",
        "url": "http://sprott.physics.wisc.edu/sa.htm"
      }
    ]
  },
  "icon-hexagon": {
    "title": "Icon · hexagon",
    "about": "A symmetric icon from Field and Golubitsky's book \"Symmetry in Chaos\" — a chaotic map deliberately engineered so its strange attractor obeys an exact rotational symmetry. This one carries the dihedral/cyclic symmetry of order six, so the orbit paints a six-petalled mandala that is unchanged when you spin the page by 60°. Each point is fed through a complex polynomial whose terms are individually invariant under the sixfold rotation group, so chaos and crystalline order coexist on the same picture. Field and Golubitsky popularised these 'symmetric icons' in the early 1990s as proof that deterministic chaos can be made beautiful and orderly at once.",
    "howItWorks": "Treat the point (x,y) as a complex number z = x + iy. Each step builds three rotation-invariant quantities: the squared modulus z·z̄ = x²+y², and the real and imaginary parts of zⁿ (here n=6) via the complex power z⁵ (=z^{n-1}). A radial gain p = λ + α·(z z̄) + β·Re(zⁿ) scales the point, while the γ term injects the symmetric polynomial z^{n-1} and the ω term adds a small rotation. Because every term respects the 60° rotation, the whole map commutes with that rotation, and the attractor it settles onto must share the symmetry. Iterate ~1.5M times, discard the transient, and the cloud fills a sixfold mandala.",
    "equations": [
      {
        "label": "modulus",
        "latex": "z\\bar z = x^2 + y^2"
      },
      {
        "label": "complex power",
        "latex": "z^{n-1} = (x+iy)^{5} = z_r + i\\,z_i"
      },
      {
        "label": "n-th real part",
        "latex": "z_n = \\operatorname{Re}(z^{n}) = x\\,z_r - y\\,z_i"
      },
      {
        "label": "gain",
        "latex": "p = \\lambda + \\alpha\\,z\\bar z + \\beta\\,z_n"
      },
      {
        "label": "x'",
        "latex": "x' = p\\,x + \\gamma\\,z_r - \\omega\\,y"
      },
      {
        "label": "y'",
        "latex": "y' = p\\,y - \\gamma\\,z_i + \\omega\\,x"
      }
    ],
    "params": [
      {
        "key": "lambda",
        "symbol": "\\lambda",
        "meaning": "Linear feedback gain; the dominant contraction/expansion term that sets the overall size of the attractor."
      },
      {
        "key": "alpha",
        "symbol": "\\alpha",
        "meaning": "Coupling to the squared radius z z̄; controls radial bunching of the petals."
      },
      {
        "key": "beta",
        "symbol": "\\beta",
        "meaning": "Coupling to Re(zⁿ); modulates the sharpness and reach of the sixfold lobes."
      },
      {
        "key": "gamma",
        "symbol": "\\gamma",
        "meaning": "Strength of the symmetric polynomial z^{n-1}; imprints the actual n-fold petal structure."
      },
      {
        "key": "omega",
        "symbol": "\\omega",
        "meaning": "Small antisymmetric rotation term; breaks the reflection symmetry to give a chiral pinwheel (Z_n rather than D_n)."
      }
    ],
    "code": "const X=x[0], Y=x[1];\nconst zzbar=X*X+Y*Y;\nconst x2=X*X-Y*Y, y2=2*X*Y;        // z^2\nconst x4=x2*x2-y2*y2, y4=2*x2*y2;   // z^4\nconst zr=x4*X-y4*Y, zi=x4*Y+y4*X;   // z^5 = z^(n-1)\nconst zn=X*zr-Y*zi;                  // Re(z^6)\nconst p=lambda+alpha*zzbar+beta*zn;\no[0]=p*X+gamma*zr-omega*Y;\no[1]=p*Y-gamma*zi+omega*X;",
    "links": [
      {
        "label": "Symmetric icon (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Symmetry_in_Chaos"
      },
      {
        "label": "Field & Golubitsky, Symmetry in Chaos",
        "url": "https://www.maths.manchester.ac.uk/~mdc/MartinGolubitskySymmetryInChaos.html"
      },
      {
        "label": "Paul Bourke — Symmetric icons / chaos",
        "url": "https://paulbourke.net/fractals/icons/"
      },
      {
        "label": "Clifford Pickover (attractors)",
        "url": "https://en.wikipedia.org/wiki/Clifford_A._Pickover"
      }
    ]
  },
  "icon-heptagon": {
    "title": "Icon · heptagon",
    "about": "A symmetric icon from Field and Golubitsky's \"Symmetry in Chaos\" — chaotic dynamics tamed by an enforced symmetry group. Each iterate runs a point through a complex polynomial whose terms are invariant under rotation by 2π/7, so the strange attractor it traces is forced into a seven-fold mandala. The chaos lives in the radial fine structure; the heptagonal lattice is exact. The result looks less like a fractal and more like a stained-glass rose window grown from a single equation.",
    "howItWorks": "Treat the plane as the complex plane z = x + iy. The map mixes the rotation-invariant scalars |z|² and Re(zⁿ) into a radial gain p, then advances z while folding in the degree-(n−1) term zⁿ⁻¹ (here n = 7). Because every term commutes with multiplication by a 7th root of unity, applying the map and then rotating by 2π/7 gives the same set as rotating first — the attractor must carry D₇ symmetry. 100k points seeded near the origin all relax onto the same icon.",
    "equations": [
      {
        "label": "Rotation-invariant gain",
        "latex": "p = \\lambda + \\alpha\\,(x^2+y^2) + \\beta\\,\\mathrm{Re}\\,(x+iy)^7"
      },
      {
        "label": "x update",
        "latex": "x' = p\\,x + \\gamma\\,\\mathrm{Re}\\,(x+iy)^6 - \\omega\\,y"
      },
      {
        "label": "y update",
        "latex": "y' = p\\,y - \\gamma\\,\\mathrm{Im}\\,(x+iy)^6 + \\omega\\,x"
      }
    ],
    "params": [
      {
        "key": "lambda",
        "symbol": "λ",
        "meaning": "linear radial gain — overall expansion of the basin"
      },
      {
        "key": "alpha",
        "symbol": "α",
        "meaning": "quadratic |z|² feedback that bends orbits back inward"
      },
      {
        "key": "beta",
        "symbol": "β",
        "meaning": "strength of the Re(zⁿ) symmetry-locking term"
      },
      {
        "key": "gamma",
        "symbol": "γ",
        "meaning": "weight of the zⁿ⁻¹ term that sculpts the seven petals"
      },
      {
        "key": "omega",
        "symbol": "ω",
        "meaning": "rotational shear, breaking the mirror to a pure swirl"
      }
    ],
    "code": "function step(x, y, {lambda, alpha, beta, gamma, omega}) {\n  const zzbar = x*x + y*y;\n  let zr = 1, zi = 0;            // accumulate (x+iy)^6\n  for (let k = 0; k < 6; k++) { const r = zr*x - zi*y, i = zr*y + zi*x; zr = r; zi = i; }\n  const zn = zr*x - zi*y;        // Re((x+iy)^7)\n  const p = lambda + alpha*zzbar + beta*zn;\n  return [p*x + gamma*zr - omega*y, p*y - gamma*zi + omega*x];\n}",
    "links": [
      {
        "label": "Symmetry in Chaos (Field & Golubitsky)",
        "url": "https://en.wikipedia.org/wiki/Symmetry_in_Chaos"
      },
      {
        "label": "Attractor — Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Attractor"
      },
      {
        "label": "Sprott: Symmetric Icons",
        "url": "http://sprott.physics.wisc.edu/fractals/icons/"
      },
      {
        "label": "Dihedral group D₇ — MathWorld",
        "url": "https://mathworld.wolfram.com/DihedralGroup.html"
      }
    ]
  },
  "icon-clamshell": {
    "title": "Icon · Clamshell",
    "about": "A symmetric icon from Field and Golubitsky's \"Symmetry in Chaos\" — a chaotic map deliberately engineered to commute with a cyclic rotation group, so its strange attractor is forced into a perfect mandala. This instance carries four-fold (C4) rotational symmetry: every chaotic point landed by the orbit has three rotated twins, and the densest petals fold inward like the ribbed lip of a clamshell. The map is the n=4 case of the general Field–Golubitsky icon family, built around a complex polynomial in z = x + iy whose nonlinear feedback both stretches (chaos) and rotates (symmetry).",
    "howItWorks": "Treat the state as a complex number z = x + iy. Compute the symmetric radial term zzbar = |z|² and the n-fold angular term zn = Re(zⁿ); together with z^(n-1) these build a real scaling factor p = lambda + alpha·zzbar + beta·zn. The new point is p·z plus a gamma-weighted z^(n-1) twist and an omega-weighted 90° rotation. Because every term is invariant (or equivariant) under rotation by 2π/4, the chaotic attractor inherits exact C4 symmetry. For n=4 the complex power z^(n-1)=z³ is unrolled: zr = x³−3xy², zi = 3x²y−y³.",
    "equations": [
      {
        "label": "radial & angular invariants",
        "latex": "z\\bar z = x^2+y^2,\\quad z_r+iz_i=(x+iy)^3,\\quad z_n=x\\,z_r-y\\,z_i"
      },
      {
        "label": "scaling factor",
        "latex": "p=\\lambda+\\alpha\\,z\\bar z+\\beta\\,z_n"
      },
      {
        "label": "x update",
        "latex": "x' = p\\,x+\\gamma\\,z_r-\\omega\\,y"
      },
      {
        "label": "y update",
        "latex": "y' = p\\,y-\\gamma\\,z_i+\\omega\\,x"
      }
    ],
    "params": [
      {
        "key": "lambda",
        "symbol": "λ",
        "meaning": "Linear scaling / overall gain; tunes the attractor between contraction and chaotic spread."
      },
      {
        "key": "alpha",
        "symbol": "α",
        "meaning": "Coupling to the rotation-invariant radius |z|², controlling radial nonlinearity."
      },
      {
        "key": "beta",
        "symbol": "β",
        "meaning": "Coupling to the n-fold angular term Re(zⁿ); sharpens the petal lobes."
      },
      {
        "key": "gamma",
        "symbol": "γ",
        "meaning": "Strength of the z^(n-1) symmetric twist that imprints the C4 arms."
      },
      {
        "key": "omega",
        "symbol": "ω",
        "meaning": "Infinitesimal-rotation term breaking reflection symmetry, giving the swirl/handedness."
      }
    ],
    "code": "function step(x, y, {lambda, alpha, beta, gamma, omega}) {\n  const zr = x*x*x - 3*x*y*y;      // Re(z^3)\n  const zi = 3*x*x*y - y*y*y;      // Im(z^3)\n  const zn = x*zr - y*zi;          // Re(z^4)\n  const zzbar = x*x + y*y;         // |z|^2\n  const p = lambda + alpha*zzbar + beta*zn;\n  return [ p*x + gamma*zr - omega*y,\n           p*y - gamma*zi + omega*x ];\n}",
    "links": [
      {
        "label": "Symmetry in Chaos (Field & Golubitsky)",
        "url": "https://en.wikipedia.org/wiki/Symmetric_icon"
      },
      {
        "label": "Symmetric icons — Paul Bourke",
        "url": "https://paulbourke.net/fractals/icons/"
      },
      {
        "label": "Attractor — Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Attractor"
      },
      {
        "label": "Strange attractors — Sprott",
        "url": "http://sprott.physics.wisc.edu/sa.htm"
      }
    ]
  },
  "gingerbreadman": {
    "title": "Gingerbreadman Map",
    "about": "A deceptively simple piecewise-linear map whose only nonlinearity is a single absolute value, yet it carpets the plane with a chaotic sea pocked by ghostly hexagonal islands of stability. Devil Pickover popularized it in the 1980s, and Roger Bourke's plots gave it its name: the speckled chaotic region traces the rough outline of a gingerbread man. It is area-preserving (conservative), so unlike dissipative strange attractors it has no shrinking basin — every orbit wanders forever on its own invariant set, either a stable island ring or the surrounding chaotic ocean.",
    "howItWorks": "Each step replaces the point (x, y) with (1 - y + |x|, y becomes the old x). The fold introduced by |x| is the sole source of chaos: it reflects the left half-plane, and the linear shear then stretches and re-stacks the plane. Because the Jacobian determinant is exactly 1 everywhere, areas are preserved — orbits neither collapse to an attractor nor blow up to infinity, instead filling a measure-positive chaotic sea threaded with quasi-periodic islands. Seeding a cloud in the sea near (-0.1, 0) lights up the full speckled body.",
    "equations": [
      {
        "label": "x update",
        "latex": "x_{n+1} = 1 - y_n + |x_n|"
      },
      {
        "label": "y update",
        "latex": "y_{n+1} = x_n"
      }
    ],
    "params": [
      {
        "key": "s",
        "symbol": "s",
        "meaning": "Fold strength multiplying |x| (s = 1 is the canonical area-preserving Gingerbreadman; other values warp the sea)."
      }
    ],
    "code": "o[0] = 1 - x[1] + s*Math.abs(x[0]); o[1] = x[0];",
    "links": [
      {
        "label": "Wikipedia: Gingerbreadman map",
        "url": "https://en.wikipedia.org/wiki/Gingerbreadman_map"
      },
      {
        "label": "Wolfram MathWorld: Gingerbreadman Map",
        "url": "https://mathworld.wolfram.com/GingerbreadmanMap.html"
      },
      {
        "label": "Clifford Pickover, Computers, Pattern, Chaos and Beauty",
        "url": "https://en.wikipedia.org/wiki/Clifford_A._Pickover"
      }
    ]
  },
  "standard": {
    "title": "Standard (Chirikov) Map",
    "about": "Born from Boris Chirikov's 1969 study of how chaos creeps into nearly-integrable systems, the standard map is the discrete heartbeat of the kicked rotor: a free-spinning pendulum that receives a sharp gravitational kick once per period. It is the universal local model for the transition to chaos in Hamiltonian systems, the prototype on which the Chirikov resonance-overlap criterion was forged. Living on the torus [0,2π)², its phase portrait at the kick strength K=1.2 is a stunning mosaic of order and disorder: smooth KAM curves and nested island chains float untouched inside a turbulent chaotic sea. Seeding particles across the whole torus paints the entire portrait at once.",
    "howItWorks": "Each step the momentum p receives a kick K·sin(x) that depends on the current angle x, then the angle advances by the updated momentum. Both coordinates are wrapped modulo 2π onto the torus. For small K the motion stays on invariant KAM curves (integrable-like); as K grows these curves break up one by one. At K=1.2 the last great barriers are already shattered, leaving a connected chaotic sea riddled with surviving elliptic islands — the signature mixed phase space of Hamiltonian chaos.",
    "equations": [
      {
        "label": "Momentum kick",
        "latex": "p_{n+1} = (p_n + K\\sin x_n) \\bmod 2\\pi"
      },
      {
        "label": "Angle advance",
        "latex": "x_{n+1} = (x_n + p_{n+1}) \\bmod 2\\pi"
      }
    ],
    "params": [
      {
        "key": "K",
        "symbol": "K",
        "meaning": "Kick strength / nonlinearity. K≈0.9716 is the critical value where the last KAM curve breaks; K=1.2 gives a mixed sea-plus-islands portrait."
      }
    ],
    "code": "const TAU = 2*Math.PI;\nlet np = (y + K*Math.sin(x)) % TAU; if (np<0) np+=TAU;\nlet nx = (x + np) % TAU; if (nx<0) nx+=TAU;\nx = nx; y = np;",
    "links": [
      {
        "label": "Wikipedia: Standard map",
        "url": "https://en.wikipedia.org/wiki/Standard_map"
      },
      {
        "label": "Wikipedia: Chirikov criterion",
        "url": "https://en.wikipedia.org/wiki/Chirikov_criterion"
      },
      {
        "label": "Scholarpedia: Chirikov standard map",
        "url": "http://www.scholarpedia.org/article/Chirikov_standard_map"
      },
      {
        "label": "MathWorld: Standard Map",
        "url": "https://mathworld.wolfram.com/StandardMap.html"
      }
    ]
  },
  "duffing-map": {
    "title": "Duffing Map",
    "about": "The Duffing map is the discrete-time cousin of the Duffing oscillator, the classic forced nonlinear spring that Georg Duffing studied in 1918 to model structures that stiffen as they bend. Stripping the differential equation down to a two-step recurrence keeps its defining cubic restoring force y³, and that single nonlinearity is enough to fold the plane into a strange attractor. At a=2.75, b=0.2 the orbit settles onto a thin, twice-folded chaotic ribbon with perfect odd symmetry about the origin. It is a textbook example of how a smooth mechanical system, once sampled in time, becomes a fractal.",
    "howItWorks": "Each step shifts the old y into the new x, then drives the new y by a linear stretch a·y, a memory term -b·x that feeds the previous position back in, and a cubic -y³ that bends large excursions back toward the center. The competition between the linear amplification and the cubic restoring force stretches and folds the state cloud on every iteration, so points seeded near the origin spread out and converge onto the same attractor.",
    "equations": [
      {
        "label": "x update",
        "latex": "x_{n+1} = y_n"
      },
      {
        "label": "y update",
        "latex": "y_{n+1} = -b\\,x_n + a\\,y_n - y_n^{3}"
      }
    ],
    "params": [
      {
        "key": "a",
        "symbol": "a",
        "meaning": "Linear amplification of y; raising it widens the attractor and tunes the route into chaos."
      },
      {
        "key": "b",
        "symbol": "b",
        "meaning": "Damping / feedback strength coupling the previous x back into y (acts like the oscillator's friction)."
      }
    ],
    "code": "const nx = y;\nconst ny = -b*x + a*y - y*y*y;\nx = nx; y = ny;",
    "links": [
      {
        "label": "Duffing map (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Duffing_map"
      },
      {
        "label": "Duffing equation (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Duffing_equation"
      },
      {
        "label": "Duffing Differential Equation (MathWorld)",
        "url": "https://mathworld.wolfram.com/DuffingDifferentialEquation.html"
      }
    ]
  },
  "kings-dream": {
    "title": "King's Dream",
    "about": "Clifford Pickover devised this trigonometric quadratic map and gave it the evocative name \"The King's Dream\" in his books on visual mathematics and computer art. Each point is folded through a pair of sine waves whose interference weaves a delicate, lacework attractor with crisp two-fold (180°) rotational symmetry. Like Pickover's other dream maps it has no physical origin — it is pure aesthetic exploration of how simple iterated sines can spin chaos into ornament. Sweeping the four parameters morphs the figure between webs, swirls, and ribbed shells.",
    "howItWorks": "Start a swarm of points near the origin and repeatedly apply the map. The two output coordinates each mix a sine of the other coordinate with a scaled sine of the same coordinate, so x feeds y and y feeds x through frequencies b and a. The orbit never escapes — every term is a bounded sine — yet the folding is sensitive to initial conditions, so the cloud spreads across a fractal-like attractor instead of a single curve. Because the map commutes with (x,y)→(−x,−y), the rendered set is symmetric under a half-turn about the center.",
    "equations": [
      {
        "label": "x update",
        "latex": "x_{n+1} = \\sin(b\\,y_n) + c\\,\\sin(b\\,x_n)"
      },
      {
        "label": "y update",
        "latex": "y_{n+1} = \\sin(a\\,x_n) + d\\,\\sin(a\\,y_n)"
      }
    ],
    "params": [
      {
        "key": "a",
        "symbol": "a",
        "meaning": "frequency of the sines driving the y update (acts on x and y)"
      },
      {
        "key": "b",
        "symbol": "b",
        "meaning": "frequency of the sines driving the x update (acts on y and x)"
      },
      {
        "key": "c",
        "symbol": "c",
        "meaning": "self-coupling weight of sin(b·x) in the x update"
      },
      {
        "key": "d",
        "symbol": "d",
        "meaning": "self-coupling weight of sin(a·y) in the y update"
      }
    ],
    "code": "const nx = Math.sin(b*y) + c*Math.sin(b*x);\nconst ny = Math.sin(a*x) + d*Math.sin(a*y);\nx = nx; y = ny;",
    "links": [
      {
        "label": "Clifford Pickover — Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Clifford_A._Pickover"
      },
      {
        "label": "Pickover attractor — Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Pickover_attractor"
      },
      {
        "label": "Sprott — Strange Attractors: Creating Patterns in Chaos",
        "url": "http://sprott.physics.wisc.edu/sa.htm"
      }
    ]
  },
  "sprott-quadratic": {
    "title": "Sprott Quadratic",
    "about": "In the early 1990s physicist Julien C. Sprott ran a now-famous computer search through the space of simple quadratic maps, asking a blunt question: how common is chaos? He let a program iterate the general two-dimensional quadratic recurrence with coefficients drawn from a coarse alphabet, kept only the sets whose orbits stayed bounded yet had a positive Lyapunov exponent, and harvested thousands of strange attractors — each a unique fractal lacework. This map is one such survivor: twelve plain numbers, two parabolic update rules, and an orbit that never repeats but never escapes, tracing out a folded, asymmetric web.",
    "howItWorks": "Each point is pushed through two coupled quadratic polynomials in x and y. Stretching (the positive Lyapunov exponent measured at ~0.34) pulls nearby points apart while the bounded basin folds them back, so a cloud of 100k seeds settles onto the same intricate attractor. Because every term — constant, linear, square, and cross-product — is tunable, nudging any coefficient continuously reshapes or destroys the figure; most settings blow up to infinity, which is exactly why Sprott's filtered catalog is special.",
    "equations": [
      {
        "label": "x next",
        "latex": "x' = a_0 + a_1 x + a_2 x^2 + a_3 xy + a_4 y + a_5 y^2"
      },
      {
        "label": "y next",
        "latex": "y' = a_6 + a_7 x + a_8 x^2 + a_9 xy + a_{10} y + a_{11} y^2"
      }
    ],
    "params": [
      {
        "key": "a0",
        "symbol": "a₀",
        "meaning": "x constant offset"
      },
      {
        "key": "a1",
        "symbol": "a₁",
        "meaning": "x linear-in-x weight"
      },
      {
        "key": "a2",
        "symbol": "a₂",
        "meaning": "x quadratic x² weight (fold strength)"
      },
      {
        "key": "a3",
        "symbol": "a₃",
        "meaning": "x cross xy weight (shear coupling)"
      },
      {
        "key": "a4",
        "symbol": "a₄",
        "meaning": "x linear-in-y weight"
      },
      {
        "key": "a5",
        "symbol": "a₅",
        "meaning": "x quadratic y² weight"
      },
      {
        "key": "a6",
        "symbol": "a₆",
        "meaning": "y constant offset"
      },
      {
        "key": "a7",
        "symbol": "a₇",
        "meaning": "y linear-in-x weight"
      },
      {
        "key": "a8",
        "symbol": "a₈",
        "meaning": "y quadratic x² weight"
      },
      {
        "key": "a9",
        "symbol": "a₉",
        "meaning": "y cross xy weight"
      },
      {
        "key": "a10",
        "symbol": "a₁₀",
        "meaning": "y linear-in-y weight"
      },
      {
        "key": "a11",
        "symbol": "a₁₁",
        "meaning": "y quadratic y² weight"
      }
    ],
    "code": "const X = x, Y = y;\nx = a0 + a1*X + a2*X*X + a3*X*Y + a4*Y + a5*Y*Y;\ny = a6 + a7*X + a8*X*X + a9*X*Y + a10*Y + a11*Y*Y;",
    "links": [
      {
        "label": "Sprott — Strange Attractors: Creating Patterns in Chaos",
        "url": "http://sprott.physics.wisc.edu/sa.htm"
      },
      {
        "label": "J. C. Sprott home page (chaos & attractor catalogs)",
        "url": "http://sprott.physics.wisc.edu/"
      },
      {
        "label": "Wikipedia — Attractor (strange attractors)",
        "url": "https://en.wikipedia.org/wiki/Attractor"
      },
      {
        "label": "Wikipedia — Lyapunov exponent",
        "url": "https://en.wikipedia.org/wiki/Lyapunov_exponent"
      }
    ]
  },
  "zaslavsky": {
    "title": "Zaslavsky Map",
    "about": "The Zaslavsky map is a dissipative kicked-rotor model introduced by George M. Zaslavsky in the 1970s to study Hamiltonian chaos and the emergence of stochastic webs in nearly-integrable systems. Each step kicks the phase x on a circle (the mod-1 torus) while the conjugate variable y is simultaneously driven by a cosine impulse and bled away by an exponential damping factor e^(-gamma). The competition between the resonant kick and the dissipation folds the orbit into a filamentary fractal attractor — a torn, leaf-like sheet that is the dissipative cousin of Zaslavsky's famous symmetric stochastic web. Tuning gamma sets how hard the strange attractor is squeezed against the y=0 axis.",
    "howItWorks": "x lives on a circle and is advanced by a constant drift nu plus a y-dependent term and a phase-dependent cosine kick, then wrapped back into [0,1) by the mod operation. y is the kicked-and-damped momentum: it receives the same cosine kick (scaled by eps) and is then multiplied by the contraction factor e^(-gamma) < 1, which guarantees a bounded attractor. The auxiliary constant mu = (1 - e^(-gamma))/gamma couples the damping strength into the x-update so the map reduces smoothly to the conservative standard map as gamma -> 0. Stretching from the kick plus folding from the wrap and contraction produces sensitive dependence and a fractal limit set.",
    "equations": [
      {
        "label": "phase (mod 1)",
        "latex": "x_{n+1} = \\left(x_n + \\nu\\,(1 + \\mu\\,y_n) + \\varepsilon\\,\\nu\\,\\mu\\,\\cos(2\\pi x_n)\\right)\\bmod 1"
      },
      {
        "label": "damped momentum",
        "latex": "y_{n+1} = e^{-\\gamma}\\left(y_n + \\varepsilon\\,\\cos(2\\pi x_n)\\right)"
      },
      {
        "label": "coupling constant",
        "latex": "\\mu = \\dfrac{1 - e^{-\\gamma}}{\\gamma}"
      }
    ],
    "params": [
      {
        "key": "nu",
        "symbol": "\\nu",
        "meaning": "Phase drift / kick strength on the circle; sets how far x advances each step."
      },
      {
        "key": "eps",
        "symbol": "\\varepsilon",
        "meaning": "Perturbation amplitude of the cosine kick driving both x and y."
      },
      {
        "key": "gamma",
        "symbol": "\\gamma",
        "meaning": "Dissipation rate; the momentum is contracted by e^(-gamma) each step (gamma -> 0 is the conservative limit)."
      }
    ],
    "code": "const e = Math.exp(-gamma);\nconst m = (1 - e) / gamma;\nconst c = Math.cos(2 * Math.PI * x);\nconst n = x + nu * (1 + m * y) + eps * nu * m * c;\nx = n - Math.floor(n);   // mod 1\ny = e * (y + eps * c);",
    "links": [
      {
        "label": "Wikipedia: Zaslavskii map",
        "url": "https://en.wikipedia.org/wiki/Zaslavskii_map"
      },
      {
        "label": "Scholarpedia: Zaslavsky web map (G. Zaslavsky)",
        "url": "http://www.scholarpedia.org/article/Zaslavsky_web_map"
      },
      {
        "label": "Sprott: Strange Attractors",
        "url": "http://sprott.physics.wisc.edu/sa.htm"
      }
    ]
  },
  "martin": {
    "title": "Martin (Hopalong)",
    "about": "Barry Martin's 'sine Hopalong' map, popularized by A.K. Dewdney in Scientific American's Computer Recreations column (September 1986) under the name 'hopalong'. This sine variant replaces the classic square-root term with x' = y - sin(x), y' = a - x, so a single point 'hops' across the plane tracing a delicate, lace-like orbital fractal. Despite being deterministic and almost trivially simple, the orbit never settles: it weaves an infinitely detailed filigree of interleaved curves that looks hand-stitched. It is a cousin of the Gingerbreadman and Pickover orbital maps.",
    "howItWorks": "Each step is an algebraic shear-and-fold: the new x subtracts sin of the old x from the old y, and the new y is the constant a minus the old x. The sin term injects a smooth periodic nonlinearity while the y' = a - x term recycles position into velocity, so the point keeps hopping without ever escaping to infinity or locking into a short cycle. Seeding 100k particles near the origin and iterating in lockstep paints the whole attractor at once; trails connect successive hops into the characteristic woven filaments.",
    "equations": [
      {
        "label": "x update",
        "latex": "x_{n+1} = y_n - \\sin(x_n)"
      },
      {
        "label": "y update",
        "latex": "y_{n+1} = a - x_n"
      }
    ],
    "params": [
      {
        "key": "a",
        "symbol": "a",
        "meaning": "Additive offset feeding old x back into the next y; sets the overall scale and lacing density of the orbital pattern (a=4 gives a rich ~10x10 filigree)."
      }
    ],
    "code": "let nx = y - Math.sin(x);\nlet ny = a - x;\nx = nx; y = ny;",
    "links": [
      {
        "label": "Hopalong attractor (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Barry_Martin_(computer_scientist)"
      },
      {
        "label": "Dewdney, 'Computer Recreations' (Sci. Am., Sep 1986)",
        "url": "https://www.scientificamerican.com/issue/sa/1986/09-01/"
      },
      {
        "label": "Pickover, Computers, Pattern, Chaos and Beauty",
        "url": "https://en.wikipedia.org/wiki/Clifford_A._Pickover"
      },
      {
        "label": "Sprott, Strange Attractors",
        "url": "http://sprott.physics.wisc.edu/sa.htm"
      }
    ]
  },
  billiard: {
    "title": "Dynamical Billiard",
    "about": "A billiard is the simplest chaos experiment: a point particle flies in a straight line inside a bounded table and bounces off the walls by the mirror law. Nothing is random — yet the SHAPE of the wall decides everything. In a circle the motion is integrable: every orbit hugs a fixed inner circle (a caustic) and traces a tidy rosette forever. Round the ends into a stadium and it turns provably chaotic — one orbit fills the whole table and two that start a hair apart diverge exponentially. Release tens of thousands of particles and the trails paint the line between order and chaos.",
    "howItWorks": "Each particle carries a position and velocity in the plane and drifts at constant speed. When a straight step would cross the wall, the exact crossing point is found (by bisection) and the velocity is reflected about the inward wall normal n via v ← v − 2(v·n)n — the specular mirror law, which conserves speed exactly, so the billiard is energy-preserving and never settles. The boundary is selectable: a circle (integrable — it also conserves angular momentum, pinning each orbit to a caustic of radius |r×v|/|v|), a Bunimovich stadium (two semicircular caps on a rectangle — provably ergodic and mixing), or a regular polygon (triangle/pentagon/hexagon). Particles are seeded uniformly inside with random launch directions at one fixed speed; colour is set by launch angle so families stay legible, and the long fading trails are the actual visualization — they fill a frozen annulus for the circle and the whole table for the chaotic shapes.",
    "equations": [
      {
        "label": "free flight (constant velocity between walls)",
        "latex": "\\mathbf{r}(t) = \\mathbf{r}_0 + \\mathbf{v}\\,t"
      },
      {
        "label": "specular reflection at the wall (inward normal n)",
        "latex": "\\mathbf{v}_{\\text{out}} = \\mathbf{v}_{\\text{in}} - 2(\\mathbf{v}_{\\text{in}}\\cdot\\mathbf{n})\\,\\mathbf{n}"
      },
      {
        "label": "speed is conserved (elastic, energy-preserving)",
        "latex": "\\lVert\\mathbf{v}_{\\text{out}}\\rVert = \\lVert\\mathbf{v}_{\\text{in}}\\rVert"
      },
      {
        "label": "circle: each orbit keeps a fixed caustic radius (integrable)",
        "latex": "r_{\\text{caustic}} = \\dfrac{\\lvert \\mathbf{r}\\times\\mathbf{v}\\rvert}{\\lVert\\mathbf{v}\\rVert}"
      }
    ],
    "params": [
      {
        "key": "shape",
        "symbol": "\\partial\\Omega",
        "meaning": "boundary table shape — circle is integrable (frozen rosettes); stadium and polygons are chaotic (orbits fill the table)"
      },
      {
        "key": "drag",
        "symbol": "\\gamma",
        "meaning": "optional per-step speed decay; 0 = the pure energy-conserving billiard (walls stay perfectly elastic)"
      },
      {
        "key": "pointSize",
        "symbol": "\\rho",
        "meaning": "on-screen size of the moving particle heads"
      }
    ],
    "code": "// free flight to the wall, then reflect about the inward normal n\n// (the exact crossing time is found by bisection so particles never leak)\nconst vdotn = vx*n.x + vy*n.y;\nvx -= 2*vdotn*n.x;   // v_out = v_in - 2 (v_in . n) n\nvy -= 2*vdotn*n.y;   // |v| unchanged - speed is conserved",
    "links": [
      {
        "label": "Dynamical billiards (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Dynamical_billiards"
      },
      {
        "label": "Bunimovich stadium (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Bunimovich_stadium"
      },
      {
        "label": "Specular reflection (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Specular_reflection"
      }
    ]
  },
  crystal: {
    "title": "Crystallization",
    "about": "A molecular-dynamics sandbox: point atoms attract and repel through the Lennard-Jones potential, the simplest model of a real substance. Cool it and the gas spontaneously orders into a close-packed hexagonal lattice — a crystal; heat it and the lattice melts back into a liquid then a gas. Unlike emergent particle toys, this minimises a genuine energy whose floor is the crystal.",
    "howItWorks": "Each atom carries a position and velocity. Every step the pairwise Lennard-Jones force — a steep short-range repulsion plus a gentler medium-range attraction — is summed over near neighbours (found in O(n) by a spatial-hash cell list, with a soft-core clamp so the r→0 singularity can't explode), and positions advance by symplectic velocity-Verlet. A Berendsen thermostat gently rescales the velocities toward the target temperature, so the temperature slider drives the phase: low = solid crystal, medium = liquid, high = gas. Atoms reflect off a box; colour runs cool (slow, crystalline) to warm (fast, molten).",
    "equations": [
      {
        "label": "Lennard-Jones pair potential",
        "latex": "U(r) = 4\\varepsilon\\left[\\left(\\tfrac{\\sigma}{r}\\right)^{12} - \\left(\\tfrac{\\sigma}{r}\\right)^{6}\\right]"
      },
      {
        "label": "pair force (−dU/dr, projected)",
        "latex": "F(r) = \\dfrac{24\\varepsilon}{r}\\left[2\\left(\\tfrac{\\sigma}{r}\\right)^{12} - \\left(\\tfrac{\\sigma}{r}\\right)^{6}\\right]"
      },
      {
        "label": "equilibrium spacing (lattice constant)",
        "latex": "r_{\\min} = 2^{1/6}\\,\\sigma"
      },
      {
        "label": "Berendsen thermostat rescale",
        "latex": "\\lambda = \\sqrt{1 + \\tfrac{\\Delta t}{\\tau}\\left(\\tfrac{T_0}{T} - 1\\right)}"
      }
    ],
    "params": [
      {
        "key": "temperature",
        "symbol": "T_0",
        "meaning": "thermostat target: 0 freezes to a crystal, high melts to a gas"
      },
      {
        "key": "epsilon",
        "symbol": "\\varepsilon",
        "meaning": "bond well depth — cohesion / stiffness of the crystal"
      },
      {
        "key": "spacing",
        "symbol": "\\sigma",
        "meaning": "atomic diameter — scales the lattice constant"
      },
      {
        "key": "gravity",
        "symbol": "g",
        "meaning": "optional downward pull (sedimentation / settling)"
      }
    ],
    "code": "// Lennard-Jones force over cell-list neighbours, soft-core clamped\nconst sr2 = sigma2 / max(r2, rmin2);      // (σ/r)², never below 0.85σ\nconst sr6 = sr2**3, sr12 = sr6*sr6;\nconst fOverR = 24*eps*(2*sr12 - sr6)/r2;  // >0 = repel at small r\nax += -fOverR*dx; ay += -fOverR*dy;\n// velocity-Verlet + Berendsen thermostat → anneal / melt",
    "links": [
      {
        "label": "Lennard-Jones potential (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Lennard-Jones_potential"
      },
      {
        "label": "Molecular dynamics (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Molecular_dynamics"
      },
      {
        "label": "Crystallization (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Crystallization"
      }
    ]
  },
  hmc: {
    "title": "Hamiltonian Monte Carlo",
    "about": "Hamiltonian Monte Carlo, the workhorse sampler behind modern Bayesian statistics, made visible. To draw samples from a probability distribution π(q), HMC treats −log π as a potential energy, gives each sample a random momentum, and lets it roll along the frictionless physics of a Hamiltonian — coasting across high-probability regions far more efficiently than a random walk. Thousands of independent samplers explore the same target at once, and their cloud converges to π itself.",
    "howItWorks": "Each particle is a phase-space point (position q, momentum p) with energy H = U(q) + ½|p|², where U = −log π. A symplectic LEAPFROG integrator advances it along a constant-energy contour for L steps; then the momentum is resampled from a Gaussian and a METROPOLIS test accepts or rejects the move (comparing H before and after, reverting q on reject) — which exactly corrects the integrator's small energy drift, guaranteeing the cloud's density equals π. A target selector swaps the potential between a Gaussian, a banana (Rosenbrock), a bimodal mixture, and a ring; the guide overlay traces π's contours.",
    "equations": [
      {
        "label": "augmented Hamiltonian (U = −log π)",
        "latex": "H(q,p) = U(q) + \\tfrac12\\,\\lVert p\\rVert^2"
      },
      {
        "label": "Hamilton's equations",
        "latex": "\\dot q = \\dfrac{\\partial H}{\\partial p} = p, \\qquad \\dot p = -\\dfrac{\\partial H}{\\partial q} = -\\nabla U(q)"
      },
      {
        "label": "leapfrog (symplectic) step",
        "latex": "p_{1/2} = p - \\tfrac{\\varepsilon}{2}\\nabla U(q),\\quad q' = q + \\varepsilon p_{1/2},\\quad p' = p_{1/2} - \\tfrac{\\varepsilon}{2}\\nabla U(q')"
      },
      {
        "label": "Metropolis acceptance after L steps",
        "latex": "a = \\min\\!\\big(1,; e^{\\,H_0 - H_1}\\big)"
      }
    ],
    "params": [
      {
        "key": "distribution",
        "symbol": "\\pi",
        "meaning": "target density to sample: Gaussian / banana / bimodal / donut"
      },
      {
        "key": "stepSize",
        "symbol": "\\varepsilon",
        "meaning": "leapfrog step length — too large lowers the acceptance rate"
      },
      {
        "key": "leapSteps",
        "symbol": "L",
        "meaning": "leapfrog steps per proposal before the Metropolis test + momentum refresh"
      }
    ],
    "code": "// one leapfrog step of H = U + ½|p|², U = −log π\np.x -= 0.5*eps*gradU(q).x;  p.y -= 0.5*eps*gradU(q).y;\nq.x += eps*p.x;             q.y += eps*p.y;\np.x -= 0.5*eps*gradU(q).x;  p.y -= 0.5*eps*gradU(q).y;\n// every L steps: resample p ~ N(0,1); accept w.p. min(1, exp(H0−H1)), else revert q",
    "links": [
      {
        "label": "Hamiltonian Monte Carlo (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Hamiltonian_Monte_Carlo"
      },
      {
        "label": "Metropolis–Hastings (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Metropolis%E2%80%93Hastings_algorithm"
      },
      {
        "label": "Rosenbrock function (Wikipedia)",
        "url": "https://en.wikipedia.org/wiki/Rosenbrock_function"
      }
    ]
  },
  chladniWave: {
    title: 'Faraday / Chladni Plate',
    about:
      'Sprinkle sand on a metal plate, draw a violin bow across its edge, and the grains skitter away from the parts that are vibrating and pile up along the still lines — leaving a stark, symmetric figure. These are Chladni patterns, the visible shape of a standing wave on a plate. Here the plate is a square membrane pinned at its rim; by default it rings in one clean eigenmode, showing a regular lattice of vibrating hills (antinodes) separated by motionless nodal lines. Turn up the Faraday drive and the plate is instead shaken from below — a parametric forcing that pumps energy into many modes at once and tips the surface into churning, ever-shifting cymatics.',
    howItWorks:
      'The height u of each grid cell obeys the damped wave equation, integrated in time by a leapfrog scheme that keeps a copy of the previous step so the second time-derivative is centred and energy-preserving. The spatial term is the discrete Laplacian (a 5-point stencil: the four neighbours minus four times the centre). A fixed (Dirichlet) rim, u = 0 on every edge, forces clean plate eigenmodes. The stiffness k is the Mathieu term: a constant baseline plus a sinusoidal Faraday drive ε·sin(ωt) — when ε = 0 the seeded eigenmode simply rings forever; when ε > 0 the periodic stiffness parametrically amplifies subharmonic modes (the Mathieu instability) and the pattern goes chaotic. A small cubic term βu³ saturates the growth so the driven amplitude stays bounded, and the dimensionless wave speed (a Courant number) is capped so the explicit scheme can never blow up. The surface is drawn as a displaced point grid — height y = u·relief — coloured by |u| so nodal lines (u ≈ 0) read dark and antinodes glow bright.',
    equations: [
      {
        label: 'driven plate wave equation',
        latex: '\\ddot{u} = c^{2}\\nabla^{2}u - k(t)\\,u - \\beta u^{3} - \\gamma\\dot{u}'
      },
      {
        label: 'Mathieu (Faraday) stiffness',
        latex: 'k(t) = k_0 + \\varepsilon\\,\\sin(\\omega t)'
      },
      {
        label: 'discrete Laplacian (5-point)',
        latex: '\\nabla^{2}u_{ij} \\approx u_{i\\pm1,j} + u_{i,j\\pm1} - 4u_{ij}'
      },
      {
        label: 'leapfrog time step',
        latex: 'u^{\\,n+1} = 2u^{\\,n} - u^{\\,n-1} + \\ddot{u}\\,\\Delta t^{2} - \\gamma\\,(u^{\\,n}-u^{\\,n-1})'
      },
      {
        label: 'fixed rim (Dirichlet)',
        latex: 'u = 0 \\quad\\text{on the boundary}'
      },
      {
        label: 'seeded eigenmode (mode m)',
        latex: 'u_0 \\propto \\sin\\!\\tfrac{(m{+}1)\\pi x}{W}\\,\\sin\\!\\tfrac{m\\pi y}{W}'
      }
    ],
    params: [
      {
        key: 'mode',
        symbol: 'm',
        meaning: 'which clean Chladni figure to ring — seeds the (m+1, m) plate eigenmode (rebuilds the field)'
      },
      {
        key: 'waveSpeed',
        symbol: 'c',
        meaning: 'dimensionless wave-Courant number c·Δt; sets the oscillation rate, capped so the explicit scheme stays stable'
      },
      {
        key: 'damping',
        symbol: '\\gamma',
        meaning: 'velocity damping — 0 lets the plate ring forever (a clean static figure); higher slowly bleeds energy away'
      },
      {
        key: 'driveFreq',
        symbol: '\\omega',
        meaning: 'frequency of the Faraday (Mathieu) forcing that shakes the plate'
      },
      {
        key: 'driveAmp',
        symbol: '\\varepsilon',
        meaning: 'Faraday drive depth — 0 = a single clean eigenmode; raising it parametrically pumps many modes into chaotic cymatics'
      },
      {
        key: 'relief',
        symbol: 'r',
        meaning: 'vertical exaggeration of the height map u·r — how tall the antinode hills stand'
      }
    ],
    code: "const C2 = waveSpeed*waveSpeed;                  // (c·dt)², dimensionless\nconst k = K0 + driveAmp*Math.sin(driveFreq*t);  // Mathieu parametric stiffness\nfor (each interior cell c) {\n  const lap = u[L]+u[R]+u[U]+u[D] - 4*u[c];     // 5-point Laplacian\n  const acc = C2*lap - k*u[c] - BETA*u[c]**3;   // wave + stiffness + cubic\n  let next = 2*u[c] - uPrev[c] + acc - gamma*(u[c]-uPrev[c]); // leapfrog\n  if (next > 4) next = 4; else if (next < -4) next = -4;      // self-healing clamp\n  uNext[c] = next;\n}\n// rim u=0 (Dirichlet); rotate the three buffers; y = u·relief, colour by |u|",
    links: [
      {
        label: 'Chladni figures (Wikipedia)',
        url: 'https://en.wikipedia.org/wiki/Ernst_Chladni#Chladni_figures'
      },
      {
        label: 'Faraday wave (Wikipedia)',
        url: 'https://en.wikipedia.org/wiki/Faraday_wave'
      },
      {
        label: 'Mathieu equation (Wikipedia)',
        url: 'https://en.wikipedia.org/wiki/Mathieu_function'
      }
    ]
  },
  vortexFunnel: {
    title: 'Vortex Funnel',
    about:
      'The shape water makes as it drains: a wide, gently rippled surface that dips inward and steepens into a slender throat — a whirlpool, or bathtub vortex. Points ride that free surface, the dense bright band at the lip glowing orange while the spiralling throat runs white down to its narrow waist. A slow differential swirl winds the arms (the centre turns faster than the rim, as real vortices do) and travelling ripples animate the surface.',
    howItWorks:
      'Each point is pinned to a fixed radius on a surface of revolution and only its angle and height evolve, so the figure stays crisp and its colour — keyed to radius — never smears. The height profile is a Lorentzian dimple z = −depth·c²/(r²+c²): near the centre it is parabolic (like the solid-body rotating core of a Rankine vortex), and far out it falls off like 1/r² (the irrotational free surface of an ideal drain). The swirl is differential, Ω(r) ∝ 1/r, so inner rings overtake outer ones and the seeded spiral arms wind up over time. A small radius-growing travelling wave rides on top for the look of moving water. Colour is assigned once by radius (white throat → saturated amber lip → dark-red rim); because every point keeps its radius, that radial gradient holds even as the funnel turns.',
    equations: [
      {
        label: 'free-surface funnel (Lorentzian dimple)',
        latex: 'z(r) = -\\,d\\,\\dfrac{c^{2}}{r^{2} + c^{2}}'
      },
      {
        label: 'ideal drain limits (core ↔ skirt)',
        latex: 'z \\approx -d\\Big(1 - \\tfrac{r^{2}}{c^{2}}\\Big)\\ (r\\!\\ll\\! c),\\qquad z \\approx -d\\,\\tfrac{c^{2}}{r^{2}}\\ (r\\!\\gg\\! c)'
      },
      {
        label: 'differential swirl',
        latex: '\\theta(r,t) = \\theta_0 + \\Omega(r)\\,t,\\qquad \\Omega(r) \\propto \\dfrac{1}{r}'
      },
      {
        label: 'travelling surface ripple',
        latex: '\\Delta z = a\\,\\dfrac{r}{R}\\,\\cos(k r - \\omega t)'
      },
      {
        label: 'position',
        latex: '(x,y,z) = \\big(r\\cos\\theta,\\ z(r) + \\Delta z,\\ r\\sin\\theta\\big)'
      }
    ],
    params: [
      {
        key: 'depth',
        symbol: 'd',
        meaning: 'how deep the funnel plunges — the height drop from rim to throat'
      },
      {
        key: 'throat',
        symbol: 'c',
        meaning: 'Lorentzian core radius — small = a tight, pinched throat; large = a broad shallow bowl'
      },
      {
        key: 'swirl',
        symbol: '\\Omega_0',
        meaning: 'differential rotation rate (0 = a still funnel you orbit); inner rings spin faster ∝ 1/r'
      },
      {
        key: 'ripple',
        symbol: 'a',
        meaning: 'amplitude of the travelling surface waves rippling outward across the rim'
      },
      {
        key: 'turns',
        symbol: 'N',
        meaning: 'how many times the seeded arms wind from throat to rim (spiral tightness)'
      }
    ],
    code: "const c2 = throat*throat;\nfor (each point at fixed radius r) {\n  const u = r / RMAX;\n  const om = swirl / (u + 0.18);            // differential: inner faster (Ω ∝ 1/r)\n  const th = theta0 + om * t;\n  const funnel = -depth * (c2 / (r*r + c2)); // Lorentzian dimple → narrow throat\n  const wave = ripple * u * Math.cos(6*r - 2.2*t); // travelling ripples\n  pos = [r*Math.cos(th), funnel + wave, r*Math.sin(th)];\n}\n// colour fixed by radius u: white throat → amber lip → dark rim (uploaded once)",
    links: [
      {
        label: 'Whirlpool / vortex (Wikipedia)',
        url: 'https://en.wikipedia.org/wiki/Whirlpool'
      },
      {
        label: 'Rankine vortex (Wikipedia)',
        url: 'https://en.wikipedia.org/wiki/Rankine_vortex'
      },
      {
        label: 'Free surface of a rotating fluid (Wikipedia)',
        url: 'https://en.wikipedia.org/wiki/Bucket_argument'
      }
    ]
  },
  drumhead: {
    title: 'Circular Chladni Plate',
    about:
      "A vibrating circular drumhead. Where a square plate gives the blocky Chladni grids, a clamped circular membrane rings in its own family of standing waves — the Bessel eigenmodes — whose still lines (where sand would gather) are m straight diameters crossed by n concentric circles. Pick the mode with the two sliders and the membrane settles into that pure tone, breathing up and down in place.",
    howItWorks:
      "The standing waves of a membrane fixed at its rim are uₘₙ(r,θ) = Jₘ(λₘₙ·r)·cos(mθ), where Jₘ is the order-m Bessel function and λₘₙ is its n-th positive zero — chosen precisely so the rim r=1 is a node (Jₘ(λₘₙ)=0). The angular factor cos(mθ) vanishes on m evenly-spaced diameters; the radial factor Jₘ(λₘₙ·r) vanishes on n interior circles (the earlier zeros of Jₘ), unevenly spaced and bunched toward the rim — the signature of a real drum, not the even rings of a naive sine. Points are laid on an area-uniform polar grid, displaced in height by u·cos(ωt) so the whole mode oscillates, and coloured once by |u| (gold antinode lobes, dark nodal lines). Bessel is evaluated only when you change the mode; each frame is a cheap cosine scale, so it can never blow up.",
    equations: [
      { label: 'circular membrane eigenmode', latex: 'u_{mn}(r,\\theta,t) = J_m(\\lambda_{mn}\\,r)\\,\\cos(m\\theta)\\,\\cos(\\omega t)' },
      { label: 'fixed rim (node) sets λ', latex: 'J_m(\\lambda_{mn}) = 0\\quad(\\lambda_{mn}=\\text{the }n\\text{-th zero of }J_m)' },
      { label: 'nodal set', latex: 'm\\text{ diameters } (\\cos m\\theta=0)\\ +\\ n\\text{ circles } (J_m(\\lambda_{mn}r)=0)' },
      { label: 'Bessel function', latex: 'J_m(x)=\\sum_{k=0}^{\\infty}\\frac{(-1)^k}{k!\\,(k+m)!}\\Big(\\frac{x}{2}\\Big)^{2k+m}' },
    ],
    params: [
      { key: 'circles', symbol: 'n', meaning: 'number of concentric nodal circles (radial nodes) — selects the n-th zero of Jₘ' },
      { key: 'diameters', symbol: 'm', meaning: 'number of nodal diameters (angular nodes) — the order of the Bessel function Jₘ' },
      { key: 'relief', symbol: 'r', meaning: 'vertical exaggeration of the mode shape u·relief' },
      { key: 'speed', symbol: '\\omega', meaning: 'how fast the mode oscillates up and down in time' },
    ],
    code: "// eigenmode (computed once per mode change; per frame is just a cos(ωt) scale)\nconst lambda = besselJzero(m, nCircles + 1); // (nCircles+1)-th zero of J_m ⇒ rim is a node\nfor (each point on an area-uniform polar disk at (r, θ)) {\n  const u = besselJn(m, lambda * r) * Math.cos(m * θ); // r ∈ [0,1]\n  // height y = u * cos(ω t) * relief ; colour once by |u| (gold lobes, dark nodes)\n}",
    links: [
      { label: 'Vibrations of a circular membrane (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Vibrations_of_a_circular_membrane' },
      { label: 'Chladni figures (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Ernst_Chladni#Chladni_figures' },
      { label: 'Bessel function (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Bessel_function' },
    ],
  },
  orbitWeave: {
    title: 'Orbit Weave',
    about:
      "Collective trajectories. A swarm of test particles, each on its own orbit in a single central well, traced with long luminous trails. Because every orbit is a closed ellipse threaded through the centre, the trails pile up into a glowing sphere with a radiant core and faint radial streaks — structure emerging from many simple paths at once.",
    howItWorks:
      "A particle in a central HARMONIC force F = −k·x (Hooke's law, pulling toward the origin) has an exact closed solution: an ellipse centred on the origin, x(t) = a·cos(ωt)·Û + b·sin(ωt)·V̂. Each particle is given a random orbit plane (Û,V̂ — orthonormal), a random reach a (biased toward an outer shell), a random phase, and a slightly different rate so the ensemble shimmers rather than freezes. The 'orbit width' slider sets the semi-minor axis b = ecc·a: near zero the ellipses collapse to near-radial slivers that plunge through the centre and shoot back out to radius a, so their trails read as radial streaks; toward one they fatten into circles. It's closed-form, so it is unconditionally bounded (|x| ≤ a) and never blows up; colour is fixed per particle.",
    equations: [
      { label: 'central harmonic force', latex: '\\ddot{\\mathbf{x}} = -\\omega^{2}\\,\\mathbf{x}' },
      { label: 'closed-form orbit (an ellipse)', latex: '\\mathbf{x}(t) = a\\cos(\\omega t)\\,\\hat{\\mathbf U} + b\\sin(\\omega t)\\,\\hat{\\mathbf V}' },
      { label: 'orbit width', latex: 'b = \\text{ecc}\\cdot a,\\qquad \\hat{\\mathbf U}\\perp\\hat{\\mathbf V},\\ |\\hat{\\mathbf U}|=|\\hat{\\mathbf V}|=1' },
    ],
    params: [
      { key: 'ecc', symbol: 'b/a', meaning: 'orbit width — near 0 = radial slivers (streaks through the centre), 1 = circular orbits' },
      { key: 'speed', symbol: '\\omega', meaning: 'how fast the particles glide along their orbits' },
      { key: 'shell', symbol: 'R', meaning: 'overall radius the orbits reach (rebuilds the ensemble)' },
    ],
    code: "// each particle: a fixed ellipse in a random plane (Û ⟂ V̂), traced with long trails\nconst ang = omega_i * t + phase_i;\nconst c = a_i * Math.cos(ang);\nconst s = a_i * ecc * Math.sin(ang); // ecc → 0 ⇒ near-radial sliver through the origin\npos = c*U + s*V; // closed ellipse, |pos| ≤ a_i (always bounded)",
    links: [
      { label: 'Harmonic oscillator (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Harmonic_oscillator' },
      { label: 'Central force (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Central_force' },
      { label: 'Orbit (dynamics) (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Orbit' },
    ],
  },
  fractalFlame: {
    title: 'Fractal Flame',
    about:
      "Fractal flames (Scott Draves, 1992) are the glowing, organic cousins of the Barnsley fern. Same idea — the 'chaos game' of an iterated function system — but each map adds a NONLINEAR twist (a 'variation' like swirl, sinusoidal, or horseshoe) after its affine step. Those twists bend the self-similar copies into flowing, feathered, flame-like structures. Scrub the seed to wander a whole family of them; set the symmetry for mandalas.",
    howItWorks:
      "A single point hops forever: each step it picks a weighted-random function and applies it, and its current location is plotted. Run hundreds of thousands of points at once and the additive density traces out the attractor (bright where the orbit lingers — the glow). Each function here is an affine contraction toward one vertex of a regular N-gon, followed by a nonlinear variation Vⱼ — keeping the maps contractive guarantees the figure stays bounded, while placing them around a ring keeps it spread and gives clean N-fold symmetry (every vertex carries a rotated copy of the same generator). Colour is fixed per point as a narrow hue band around a seed-chosen base (a wide band would additively wash to white), so dense cores read pale and sparse filaments keep the tint.",
    equations: [
      { label: 'chaos game (one step)', latex: '\\mathbf{x} \\leftarrow F_{i}(\\mathbf{x}),\\quad i\\sim\\text{weighted random}' },
      { label: 'flame function = affine + variation', latex: 'F_i(\\mathbf{x}) = V_{j}\\big(A_i\\,\\mathbf{x} + \\mathbf{t}_i\\big)' },
      { label: 'some variations Vⱼ', latex: 'V_{\\sin}=(\\sin x,\\ \\sin y),\\quad V_{\\text{swirl}}=(x\\sin r^2 - y\\cos r^2,\\ x\\cos r^2 + y\\sin r^2)' },
      { label: 'N-fold symmetry', latex: '\\mathbf{t}_i \\text{ at angle } \\tfrac{2\\pi k}{N},\\ A_i \\text{ rotated to match}' },
    ],
    params: [
      { key: 'flame', symbol: 's', meaning: 'seed — picks the affine maps + variations; scrub it to explore a whole family of flames' },
      { key: 'symmetry', symbol: 'N', meaning: 'rotational fold count — the flame is invariant under a 2π/N turn (mandala symmetry)' },
    ],
    code: "// chaos game with nonlinear variations (N-gon-vertex generators ⇒ bounded + N-fold symmetric)\nfor (each particle) {\n  const m = pickWeighted(funcs);            // a flame function\n  const px = m.a*x + m.b*y + m.e;           // affine\n  const py = m.c*x + m.d*y + m.f;\n  [x, y] = variation(m.v, px, py);          // nonlinear twist (swirl, sinusoidal, …)\n}\n// plot all particles with additive blending → density is the glow; colour fixed by index",
    links: [
      { label: 'Fractal flame (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Fractal_flame' },
      { label: 'The Fractal Flame Algorithm (Draves & Reckase, PDF)', url: 'https://flam3.com/flame_draves.pdf' },
      { label: 'Iterated function system (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Iterated_function_system' },
    ],
  },
  pseudospectrum: {
    title: 'Pseudospectrum',
    about:
      "The eigenvalues of a matrix tell you where it is exactly singular — but for a NON-NORMAL matrix they lie. Add a vanishingly small perturbation and the spectrum can lurch a long way; the matrix behaves as if it had eigenvalues nowhere near the real ones. The honest picture is the pseudospectrum: not isolated points but a whole landscape over the complex plane measuring how CLOSE zI−A comes to singular at every z. We render that landscape — sharp cones spike up at the true eigenvalues, and around a strongly non-normal matrix they swell into broad 'continents' of near-instability that the eigenvalues alone never reveal.",
    howItWorks:
      "Closeness-to-singular is measured by the smallest singular value σ_min(zI−A); its reciprocal 1/σ_min is the resolvent norm, which blows up exactly at the eigenvalues. The height field is that resolvent norm sampled across the plane (tanh-saturated so the cones stay finite, with rounded rather than clipped tips). For a 2×2 upper-triangular A = [[a, g],[0, d]] the singular values of M = zI−A have a closed form — σ_min² is the smaller root of λ² − tr(MᴴM)λ + |det M|² = 0 — so the whole grid is exact and cheap, no per-cell SVD. The eigenvalues sit at z = a and z = d (the two cones); the off-diagonal g is the non-normality — crank it and the cones merge into one wide plateau of pseudo-instability. With drift on, the eigenvalues wander along slow Lissajous orbits and the terrain breathes, grows, and splits. Colour is keyed to height: orange valleys and contour rings in the basin, teal up the cone bodies, white at the eigenvalue tips.",
    equations: [
      { label: 'resolvent norm = height', latex: 'h(z) = \\dfrac{1}{\\sigma_{\\min}(zI - A)}' },
      { label: 'ε-pseudospectrum (the level sets)', latex: '\\Lambda_\\varepsilon(A) = \\{\\, z \\in \\mathbb{C} : \\sigma_{\\min}(zI - A) \\le \\varepsilon \\,\\}' },
      { label: 'σ_min via MᴴM, M = zI − A', latex: '\\sigma_{\\min}^2 = \\tfrac12\\big(T - \\sqrt{T^2 - 4D}\\big),\\quad T = \\operatorname{tr}(M^{H}M),\\ D = |\\det M|^2' },
      { label: 'upper-triangular A (g = non-normality)', latex: 'A = \\begin{bmatrix} a & g \\\\ 0 & d \\end{bmatrix},\\quad \\det M = (z-a)(z-d)' },
    ],
    params: [
      { key: 'matrix', symbol: 'seed', meaning: 'picks where the two eigenvalues a, d sit — scrub it to wander different two-cone layouts' },
      { key: 'nonNormal', symbol: '|g|', meaning: 'the off-diagonal magnitude — how non-normal A is; raise it to swell and merge the pseudospectral continents' },
      { key: 'relief', symbol: 'h·', meaning: 'vertical exaggeration of the resolvent landscape' },
      { key: 'drift', symbol: 'ω', meaning: 'speed the eigenvalues wander along slow orbits, so the terrain morphs' },
    ],
    code: "// resolvent-norm height over the complex plane, exact for a 2x2 upper-triangular A=[[a,g],[0,d]]\nfor (each grid cell z = x + i*y) {\n  const m11 = |z - a|**2, m22 = |z - d|**2;   // M = zI - A\n  const T = m11 + m22 + g*g;                   // tr(M^H M)\n  const D = m11 * m22;                         // |det M|^2 = |(z-a)(z-d)|^2\n  const smin2 = 0.5 * (T - Math.sqrt(T*T - 4*D));\n  h = HMAX * Math.tanh(0.35 / (Math.sqrt(smin2) + 0.02));  // 1/sigma_min, saturated\n}\n// displace a point grid by h, colour by height (orange basin -> teal cones -> white tips)",
    links: [
      { label: 'Pseudospectrum (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Pseudospectrum' },
      { label: 'Trefethen & Embree — Spectra and Pseudospectra', url: 'https://press.princeton.edu/books/hardcover/9780691119465/spectra-and-pseudospectra' },
      { label: 'Non-normal matrix (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Normal_matrix' },
    ],
  },
  cosmicWeb: {
    title: 'Cosmic Web',
    about:
      "The matter of the universe isn't scattered evenly — gravity has spun it into a vast filigree of empty VOIDS, the SHEETS and FILAMENTS that drape between them, and the blazing NODES (galaxy clusters) where filaments cross. This is the cosmic web, the largest structure that exists. It grew from almost nothing: tiny density ripples in the early universe, amplified by gravity over billions of years. (The eerie resemblance to a slice of brain tissue is a real and much-noted coincidence.) Here it's grown from a single seed — scrub the growth dial and watch a near-uniform cosmos fold into the web before your eyes.",
    howItWorks:
      "Rather than an expensive N-body force solve, this uses the ZEL'DOVICH APPROXIMATION — the classic first-order theory of how structure forms. Start with particles on a regular grid q. Build one Gaussian random displacement field ψ(q) = −∇φ from a band-limited cosmological power spectrum (synthesized here as a sum of hundreds of Fourier modes, so it's exact and seedable with no FFT). Then every particle simply slides along a STRAIGHT, frozen trajectory x(q) = q + D·ψ(q), where the single scalar D is the linear growth factor — cosmic time. As D increases, matter streams down-gradient and piles up: first into sheets, then filaments, then dense knots, exactly where the field was already overdense. Each particle is tinted once by the overdensity it's destined for, δ(q) = −∇·ψ: underdense voids fall to near-black, the pile-ups glow orange along the filaments, and the densest crossings blaze yellow-white. Because that overdensity is a fixed property of q, the colour is baked at build and the web is unconditionally bounded and fully reproducible from the seed.",
    equations: [
      { label: 'Zel’dovich trajectory (q = grid, D = growth)', latex: '\\mathbf{x}(\\mathbf{q}, D) = \\mathbf{q} + D\\,\\boldsymbol{\\psi}(\\mathbf{q})' },
      { label: 'displacement = −gradient of the potential', latex: '\\boldsymbol{\\psi}(\\mathbf{q}) = -\\nabla\\varphi = \\textstyle\\sum_m A_m\\,\\hat{\\mathbf{k}}_m \\sin(\\mathbf{k}_m\\!\\cdot\\!\\mathbf{q} + \\phi_m)' },
      { label: 'overdensity (the colour key)', latex: '\\delta(\\mathbf{q}) = -\\nabla\\!\\cdot\\!\\boldsymbol{\\psi} = -\\textstyle\\sum_m A_m\\,|\\mathbf{k}_m|\\cos(\\mathbf{k}_m\\!\\cdot\\!\\mathbf{q} + \\phi_m)' },
      { label: 'mode power spectrum', latex: 'A_m \\propto \\sqrt{P(k)}\\,/\\,k,\\qquad P(k) = k\\,e^{-(k/k_{\\mathrm{cut}})^2}' },
    ],
    params: [
      { key: 'field', symbol: 'seed', meaning: 'which random universe — scrub it to grow a different web from a different initial field' },
      { key: 'growth', symbol: 'D', meaning: 'the growth factor (cosmic time): how far structure has collapsed. Low = smooth, high = sharp web' },
      { key: 'webScale', symbol: 'k', meaning: 'spatial frequency of the structure — small = a few fat filaments, large = a fine intricate web' },
      { key: 'contrast', symbol: '—', meaning: 'the void fraction: where the dark floor ends, i.e. how much of the volume reads as empty void' },
    ],
    code: "// Zel'dovich approximation: particles ride frozen trajectories x = q + D*psi(q)\n// psi = sum of Fourier modes of the Gaussian displacement field (built once, per seed)\nfor (each grid point q) {\n  let psi = [0,0,0], div = 0;\n  for (each mode m) {\n    const th = dot(k[m], q) + phase[m];\n    psi += u[m] * amp[m] * Math.sin(th);     // displacement -grad(phi)\n    div += amp[m] * kmag[m] * Math.cos(th);  // divergence of psi\n  }\n  delta = -div;                              // overdensity -> colour (void->filament->node)\n}\n// per frame: x = q + D*psi  (D ramps up = structure forming); colour fixed by delta",
    links: [
      { label: 'Observable universe / large-scale structure (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Observable_universe#Large-scale_structure' },
      { label: 'Zel’dovich approximation (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Zeldovich_pancake' },
      { label: 'The cosmic web (Bond, Kofman & Pogosyan 1996)', url: 'https://www.nature.com/articles/380603a0' },
    ],
  },
  reconnection: {
    title: 'Magnetic Reconnection',
    about:
      "In a plasma — the Sun's corona, Earth's magnetosphere, a fusion reactor — magnetic field lines pointing in opposite directions can collide, snap, and splice into new connections. That reconnection dumps the stored magnetic energy explosively, flinging out high-velocity plasma JETS (this is what drives solar flares and auroral substorms). Right at the heart of it sits a magnetic null shaped like an X: field rushes IN along one axis and is expelled OUT along the perpendicular axis. This is that X-point, live: blue field lines streaming in from the sides, gold jets blasting out top and bottom, and a blazing white null where they meet.",
    howItWorks:
      "Near the null the plasma flow is the simplest possible 2D saddle (hyperbolic stagnation point), the linearised core of reconnection. Take the streamfunction ψ = α·x·y; the divergence-free velocity is v = (∂ψ/∂y, −∂ψ/∂x) = (−α·x, +α·y) — slow inflow squeezing toward the null along x, accelerating outflow ejected along y. Making the outflow faster than the inflow (β = α·jetBoost on the y-component) gives the reconnection asymmetry that reads as 'releasing jets'. Every particle is a massless tracer of this closed-form field (O(n), no pairwise solve) and rides a fixed streamline forever. Three baked populations paint the neon X: BLUE tracers fill the horizontal inflow wedges (|x|>|y|) and respawn when they cross the diagonal separatrix; GOLD tracers form the vertical jet beams, seeded log-uniformly along the beam so the exponential outflow reads as a smooth steady jet; a WHITE knot marks the null, kept bright by the pile-up where the flow stalls (v→0). Respawn is deterministic (no RNG in the step) so the flow streams perpetually and can never blow up.",
    equations: [
      { label: 'X-point streamfunction', latex: '\\psi(x,y) = \\alpha\\,x\\,y' },
      { label: 'plasma velocity (inflow x, jets y)', latex: '\\mathbf{v} = \\nabla\\times\\psi\\hat{z} = (-\\alpha x,\\ +\\beta y)' },
      { label: 'streamlines (hyperbolae)', latex: '|x|^{\\beta}\\,|y|^{\\alpha} = \\text{const}' },
      { label: 'reconnection asymmetry', latex: '\\beta = \\alpha\\cdot\\text{jetBoost}\\quad(\\text{outflow} > \\text{inflow})' },
    ],
    params: [
      { key: 'rate', symbol: '\\alpha', meaning: 'reconnection rate — strength of the inflow/outflow (how fast field rushes in and jets blast out)' },
      { key: 'jetBoost', symbol: '\\beta/\\alpha', meaning: 'outflow-to-inflow asymmetry — how much faster the jets are ejected than the field flows in' },
      { key: 'inflowSpan', symbol: 'h', meaning: 'thickness of the blue inflow band around the x-axis' },
    ],
    code: "// X-point saddle flow: every particle is a tracer of v = (-alpha*x, +beta*y)\nconst beta = alpha * jetBoost;          // outflow faster than inflow\nfor (each particle) {\n  x += -alpha * x * dt;                  // inflow squeezes toward the null along x\n  y +=  beta  * y * dt;                  // jets accelerate outward along y\n  // deterministic respawn keeps each tracer in its wedge -> crisp X, bounded, perpetual\n  if (leftItsZone(x, y, role)) { x = home.x; y = home.y; }\n}\n// colour ONCE by role: blue inflow wedges, gold jet beams, white null core",
    links: [
      { label: 'Magnetic reconnection (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Magnetic_reconnection' },
      { label: 'Sweet–Parker & Petschek models', url: 'https://en.wikipedia.org/wiki/Magnetic_reconnection#Sweet%E2%80%93Parker_model' },
      { label: 'Saddle / hyperbolic stagnation point', url: 'https://en.wikipedia.org/wiki/Saddle_point' },
    ],
  },
};

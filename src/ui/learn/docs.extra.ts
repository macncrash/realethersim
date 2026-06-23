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
};

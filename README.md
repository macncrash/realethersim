<p align="center">
  <img src="docs/hero.svg" alt="ETHERSIM — a Lorenz attractor" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-3aa0ff.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/WebGPU-Three.js%20r184-4ad6c8" alt="WebGPU / Three.js">
  <img src="https://img.shields.io/badge/TypeScript-strict-7aa8ff" alt="TypeScript strict">
  <img src="https://img.shields.io/badge/tests-56%20passing-4ad6c8" alt="56 tests passing">
</p>

# ETHERSIM

Interactive, high-performance visualizer for complex dynamical systems — strange attractors,
hierarchical hyper-oscillators, scale-invariant N-body, and cellular-automata "quantum foam" —
all running locally at 100k-particle scale in the browser via WebGPU. One plugin engine, four
mathematical archetypes, live-switchable, with fading trails, a structural hierarchy navigator,
camera focus-tracking, JSON snapshots, and an optional fully GPU-resident compute path.

## Highlights
- **A growing catalog behind one seam** — 14 strange attractors, 10 iterated maps, an emergent
  **Life** family (Particle Life, Boids, slime mold), **Fluid** (point vortices) and **Field**
  systems (Gray-Scott foam, excitable-medium waves), plus the hyper-oscillator and N-body —
  **32 systems across 7 categories**, switchable live, no reload. Adding one is a single file +
  one `register()` call.
- **Decoupled simulation** — the integrator runs in a Web Worker over a SharedArrayBuffer
  double-buffer (with a main-thread fallback), independent of the render frame rate.
- **Optional GPU compute** — all 14 attractors and 10 iterated maps, plus the hyper-oscillator,
  N-body, and quantum-foam, run entirely on the GPU via Three.js **TSL** compute kernels
  (per-particle RK4, map iteration, all-pairs N-body `Loop`, Gray-Scott grid). The toggle greys
  out (n/a) for the remaining CPU-only systems (Life, Fluid, excitable medium) — GPU kernels for
  those are on the roadmap.
- **Fading world-space trails**, a **hierarchy tree** with particle highlighting and
  **macro→micro camera focus-tracking**, **logarithmic depth/zoom**, and **versioned JSON
  snapshots**.
- **Correctness gate, not vibes** — a test asserts the Benettin method reproduces the Lorenz
  largest Lyapunov exponent ≈ 0.9056; the app also computes it live.

## Archetypes
The images below are rendered **from this project's own integrators** — real trajectories and
fields, not stock art. Every system runs on the CPU worker path; the attractors, iterated maps,
hyper-oscillator, N-body, and foam also have an optional fully GPU-resident path via TSL.

### Strange attractors
<p align="center"><img src="docs/gallery.svg" alt="Lorenz, Rössler, Aizawa, Thomas" width="100%"></p>

Fourteen chaotic flows — Lorenz, Rössler, Aizawa, Thomas, Halvorsen, Chen, Dadras, Lorenz-84,
Rabinovich–Fabrikant, Sprott-Linz F, Wang four-wing, Bouali, Nosé–Hoover, Chua — each a
100k-particle RK4 ensemble with its own stable timestep. Correctness is gated on the Benettin
Lyapunov exponent, computed live (e.g. Lorenz ≈ 0.906, Chen ≈ 2.0), not visual plausibility.
**Next:** live Lyapunov-spectrum + Kaplan–Yorke dimension.

### Iterated maps
Ten classic discrete maps — Clifford, de Jong, Svensson, Hopalong, Gumowski–Mira, Tinkerbell,
Ikeda, Hénon, Bedhead, and the 3D Pickover — each a 100k-point cloud that settles onto the
attractor, with fading trails tracing the filaments.
**Next:** more families (Lozi, standard/Chirikov) and escape-time fractal coloring.

### Particle Life
K species in a toroidal cube governed by a random **asymmetric interaction matrix** — universal
short-range repulsion plus per-pair attraction/repulsion yields emergent cells, membranes, and
chasers (life from a matrix). Neighbour queries use a shared spatial-hash grid, so it scales to
16k+. Species are contiguous blocks, so the hierarchy tree spotlights each one; the "ecosystem"
slider reseeds the matrix for a new world.
**Next:** a GPU compute version; save/share for favourite ecosystems.

### Boids (flocking)
Reynolds flocking — separation, alignment, cohesion within a perception radius — in a toroidal
cube, with neighbour queries through the same spatial-hash grid (so flocks scale to tens of
thousands). Emergent streams, swirls, and murmurations.
**Next:** predators / obstacles, per-flock species, a GPU compute version.

### Slime mold (Physarum)
Agents wander a toroidal trail field, depositing a chemical and steering toward whichever of three
forward sensors smells strongest; the field diffuses and decays. They reinforce the paths they
travel, so emergent **transport networks** — veins, cells, voids — appear in the agent density.
This is the archetype that exercises the agent↔field feedback (`readField()`).
**Next:** food sources / obstacles, multi-species networks, a GPU compute version.

### Point Vortices
A handful of ± vortices induce a 2D velocity field (softened Biot–Savart, toroidal); thousands of
massless tracers are advected by it, so the streamlines reveal the flow — eddies pair, orbit, and
shed. Bounded by softening + wrap (can't blow up).
**Next:** vortex sheets, leapfrogging rings, 3D vortex filaments.

### Hierarchical hyper-oscillator
<p align="center"><img src="docs/arch-hyper.svg" alt="Nested epicycle swarm" width="62%"></p>

Nested phase oscillators driven by irrational constants (φ, π, e, Feigenbaum δ), parent-coupled
across levels — quasi-periodic, non-repeating orbital swarms.
**Next:** user-assignable drivers per level in the hierarchy tree, deeper nesting, a GPU path
beyond four levels, and a multi-scale "cosmos" variant that exercises true f64 floating-origin.

### Scale-invariant N-body
<p align="center"><img src="docs/arch-nbody.svg" alt="Softened-gravity cluster with orbital trails" width="62%"></p>

Plummer-softened all-pairs gravity (velocity-Verlet — symplectic, energy-conservation tested),
seeded as hierarchical clusters with a cross-scale binding term.
**Next:** GPU tiled all-pairs / Barnes–Hut for far higher body counts, relativistic & cross-scale
coupling variants, collisions/mergers, and GPU-side clusters.

### Quantum foam
<p align="center"><img src="docs/arch-foam.svg" alt="Gray-Scott reaction-diffusion field" width="62%"></p>

A Gray-Scott reaction-diffusion field on a toroidal grid driving a displaced point lattice
(exposed via `readField()`) — mitosis / coral / maze patterns and emergent foam.
**Next:** more presets + Lenia continuous CA, feeding `readField()` into the other archetypes
(gradient advection), and 3D reaction-diffusion.

### Excitable medium (spiral waves)
A Greenberg–Hastings cyclic cellular automaton (rest → excited → refractory → rest) on a toroidal
grid — self-organising travelling and spiral waves, a Belousov–Zhabotinsky look. Bounded by
construction (integer states), so it never blows up.
**Next:** FitzHugh–Nagumo / Gierer–Meinhardt siblings, phase colouring.

## Stack
TypeScript (strict) · Vite · **Three.js r184** (`WebGPURenderer`, WebGPU-first) · **Lit** web
components · nanostores · Tweakpane · zod · vitest. Authoritative state is CPU **f64**; the GPU
renders **f32** (WGSL has no f64) — the split that satisfies "double-precision sim with
single-precision fallback".

## Run
```bash
bun install
bun run dev        # http://localhost:5173 — open in a WebGPU browser (Chrome / Edge / Safari 26+)
bun run test       # vitest: solvers, Lyapunov gate, schema round-trip, N-body energy, trails, …
bun run typecheck  # tsc --noEmit
bun run build      # tsc + vite production build
```
The dev/preview servers send `Cross-Origin-Opener-Policy` + `Cross-Origin-Embedder-Policy`
headers (required for the `SharedArrayBuffer` worker path). Toggle **GPU compute** in the panel's
Global folder to run the active archetype fully on the GPU.

## Architecture
The `Archetype` plugin seam (`src/core/archetype.ts`) is the spine: every system implements one
contract (`step` / `readPositions` / `readState` / `getHierarchy`) and declares its tunable
`ParamSpec` controls. The Simulation Manager never inspects physics, so adding an archetype is
one file + one `register()` call and the UI builds its sliders automatically.

```
src/core/        archetype seam, registry, simulation manager, params, color
src/physics/     constants, integrators (rk4), lyapunov, spatial grid (cell list)
src/archetypes/  attractors, maps, particle life, boids, hyper-osc, n-body, foam + registry
src/sim/         fixed-timestep accumulator, worker + SAB double-buffer driver, trail ring
src/render/      WebGPU renderer, points, trails, camera, floating-origin hook, theme
src/gpu/         TSL compute kernels per archetype (opt-in GPU-resident path)
src/state/       zod snapshot schema, migrations, seeded rng
src/ui/          nanostores store + Lit components
test/            vitest suites
docs/            generated hero / gallery art
```

Deeper design notes, the verified feasibility constraints, and the phased plan live in
[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Roadmap
Most of the PRD is implemented; per-archetype plans are listed under each archetype above. The
cross-cutting engine work that remains:

- **f64 floating-origin precision** — the camera rebase hook is in place as a no-op; wiring the
  real f64 anchor only matters (and is only testable) once content spans many decades of scale
  (see the hyper-oscillator "cosmos" plan).
- **GPU-mode parity** — trails / highlight / focus are CPU-position features, so they're inactive
  in GPU-compute mode; bring them to the GPU (history ring in a storage buffer, GPU picking).
- **Real-hardware performance pass** — confirm and tune toward 100k @ 60fps; FPS-adaptive
  particle/trail budgets.
- **Shareable state** — snapshot deep-links / preset library; touch + mobile controls.

## License
[MIT](LICENSE).

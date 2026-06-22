<p align="center">
  <img src="docs/hero.svg" alt="ETHERSIM — a Lorenz attractor" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-3aa0ff.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/WebGPU-Three.js%20r184-4ad6c8" alt="WebGPU / Three.js">
  <img src="https://img.shields.io/badge/TypeScript-strict-7aa8ff" alt="TypeScript strict">
  <img src="https://img.shields.io/badge/tests-21%20passing-4ad6c8" alt="21 tests passing">
</p>

# ETHERSIM

Interactive, high-performance visualizer for complex dynamical systems — strange attractors,
hierarchical hyper-oscillators, scale-invariant N-body, and cellular-automata "quantum foam" —
all running locally at 100k-particle scale in the browser via WebGPU. One plugin engine, four
mathematical archetypes, live-switchable, with fading trails, a structural hierarchy navigator,
camera focus-tracking, JSON snapshots, and an optional fully GPU-resident compute path.

## Highlights
- **Four archetypes behind one seam** — strange attractors (Lorenz / Rössler / Aizawa / Thomas),
  the hierarchical hyper-oscillator, N-body, and quantum-foam — switchable live, no reload.
- **Decoupled simulation** — the integrator runs in a Web Worker over a SharedArrayBuffer
  double-buffer (with a main-thread fallback), independent of the render frame rate.
- **Optional GPU compute** — every archetype can run entirely on the GPU via Three.js **TSL**
  compute kernels (per-particle RK4, all-pairs N-body `Loop`, Gray-Scott grid).
- **Fading world-space trails**, a **hierarchy tree** with particle highlighting and
  **macro→micro camera focus-tracking**, **logarithmic depth/zoom**, and **versioned JSON
  snapshots**.
- **Correctness gate, not vibes** — a test asserts the Benettin method reproduces the Lorenz
  largest Lyapunov exponent ≈ 0.9056; the app also computes it live.

## Archetypes
All four are rendered below **from this project's own integrators** — real trajectories and fields,
not stock art. Each runs on the CPU worker path and, optionally, fully on the GPU via TSL compute.

### Strange attractors
<p align="center"><img src="docs/gallery.svg" alt="Lorenz, Rössler, Aizawa, Thomas" width="100%"></p>

Classic chaotic flows — Lorenz, Rössler, Aizawa, Thomas — integrated as a 100k-particle RK4
ensemble. Correctness is gated on the Benettin Lyapunov exponent, not visual plausibility.
**Next:** more systems (Clifford / de Jong maps, Halvorsen, Dadras, Chen) and live
Lyapunov-spectrum + Kaplan–Yorke dimension telemetry.

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
src/physics/     constants, integrators (rk4), lyapunov
src/archetypes/  strangeAttractor, hyperOscillator, nbody, quantumFoam + registry wiring
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

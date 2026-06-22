# AETHER-SIM — Implementation Plan

**Source:** PRD v1.0.0 (Dynamical Systems Visualizer), 2026-06-21
**Status:** Approved for build · greenfield (empty repo)
**Spine:** Extensibility-First Plugin Engine, with a Lorenz-first vertical slice as the schedule backbone.

---

## 0. Context — why we're building this

AETHER-SIM is an interactive, high-performance sandbox for simulating and exploring complex dynamical systems — strange attractors, hierarchical hyper-oscillators, scale-invariant N-body, and cellular-automata "quantum foam" — under one architecture, rendered locally at 100k-particle scale with fading trails and seamless macro→micro zoom. The repo is empty; this plan is the first artifact and defines the architecture, the build order, and the verification gates for the PRD's 3-phase roadmap.

### Locked decisions (this session)
| Decision | Choice |
|---|---|
| **Scope** | **Full 3-phase roadmap — all four archetypes.** Lorenz vertical slice is built first as a de-risking thread, *not* a scope cut. |
| **UI stack** | **Lit / Web Components.** Canvas + render loop stay imperative and outside Lit's reactive tree; panels are custom elements. |
| **Render API** | **WebGPU-first** (`WebGPURenderer` + TSL compute as the primary, perf-target path). A degraded WebGL2 fallback is a stretch goal, **not** a parity requirement. |

### Two load-bearing technical facts (verified, 2026)
1. **Three.js r184** (March 2026) ships first-class **TSL compute**, eliminated per-frame allocations, and 1M+ unit particle systems on WebGPU. → pin `three@r184`.
2. **WGSL has no f64** ([gpuweb #2805](https://github.com/gpuweb/gpuweb/issues/2805) open). → the **CPU-f64-authoritative / GPU-f32-render** split is the only honest way to satisfy "double-precision sim with single-precision fallback" (FR-1.1). This split is non-negotiable and shapes the whole architecture.

---

## 1. Stack

| Concern | Choice | Why |
|---|---|---|
| **Language / build** | TypeScript 5 (strict) + **Vite 6**, `bun` install/test driver, Node 24 | Vite handles module-worker URL imports and emits the COOP/COEP headers `SharedArrayBuffer` needs; bun/Node already in the target env. |
| **3D framework** | **Three.js r184** via `WebGPURenderer`; all shaders/compute in **TSL** | One TSL node graph lowers to WGSL (and GLSL if a WebGL2 fallback is added). WebGPU compute is the path to 100k+ @ 60fps. |
| **Render API** | **WebGPU primary**; WebGL2 = optional degraded fallback (fewer particles / shorter trails), probed once at boot via `navigator.gpu?.requestAdapter()` | Honors "WebGPU-first." Do not promise WebGL2 feature parity. |
| **Sim/render decoupling** | **Fixed-timestep accumulator** in a **Web Worker**; authoritative **f64** state → **SharedArrayBuffer** double-buffer published via `Atomics`; renderer reads latest slab on `setAnimationLoop` (zero copy). Main-thread accumulator fallback when not cross-origin-isolated. | Deterministic sim regardless of frame rate (FR-1.3) + bit-reproducible snapshots; stiff systems' substeps never stutter frame pacing. |
| **UI** | **Lit 3** web components for the app shell + structural panels; **`@nanostores/lit`** (`StoreController`) for shared reactive state; **Tweakpane v4 embedded inside a Lit host** for dense parameter sliders | Lit gives clean component encapsulation for the dashboard/hierarchy/telemetry without driving the Three scene from a vDOM (which would fight NFR-1.2). Tweakpane is framework-agnostic and saves reinventing folders/monitors/graphs — mounted in a Lit element's DOM. (Alternative: all-native Lit range controls — heavier to build, drop Tweakpane.) |
| **Schema validation** | **zod** — one versioned `Snapshot` document = runtime validation + inferred TS types + migration chain | Single source of truth for FR-3.3; validates on export (catch corruption) and import (reject/upgrade). |
| **Tests** | **vitest** — solvers, Lyapunov benchmark, schema round-trip, zero-alloc heap-delta, perf harness | Native Vite/TS integration; the Lyapunov suite is the objective correctness gate. |

---

## 2. Layered architecture

Strict one-directional dependency: **Application** wires everything → **Simulation Manager** holds the active `Archetype` and only calls the contract → **Physics Core** and **Graphics Core** never reference each other → **UI (Lit)** talks only to the store + Manager facade.

- **Application / bootstrap** — `src/main.ts`, `app/bootstrap.ts`, `app/capabilities.ts` (probe `crossOriginIsolated` + GPU adapter), `app/loop.ts` (single stable `setAnimationLoop` fn + fixed-dt accumulator gate). Chooses Worker+SAB vs main-thread, WebGPU vs WebGL2.
- **Simulation Manager** — `core/manager.ts` (owns active archetype, resolved params, hierarchy, buffers; `setArchetype()` swaps plugins with no reload — FR-3.1; exposes `snapshot()/loadSnapshot()`), `core/registry.ts` (`Map<id, factory>`, archetypes self-register via side-effect import → code-splittable), `core/archetype.ts` (**the seam**, below), `core/params.ts` (merge per-layer overrides over globals), `core/hierarchy.ts` (`parentId` node list; each node carries `stateOffset/stateLength`), `sim/accumulator.ts` (fixed `DT`, max-substep clamp), `sim/sim.worker.ts` (owns f64 state, runs step loop, writes f32 to SAB, posts throttled telemetry/Lyapunov), `sim/doublebuffer.ts` (two slabs + `Int32` control via `Atomics`).
- **Physics Engine Core** — `archetypes/{strangeAttractor,hyperOscillator,nbody,quantumFoam}.ts` + `archetypes/index.ts`; `physics/integrators/{rk4,velocityVerlet,semiImplicitEuler,mapIterate}.ts` (injected strategies); `physics/{constants,scratch,octree,lyapunov}.ts`.
- **Graphics Engine Core** — `render/{renderer,points,trails,camera,floatingOrigin,upload,theme}.ts` + `render/kernels/*.tsl.ts` (TSL compute twins, P2).
- **UI (Lit)** — `ui/store.ts` (nanostores atoms/maps), `ui/store-controller.ts` (`@nanostores/lit` bridge), and custom elements `ui/components/{app-shell,params-panel,hierarchy-tree,archetype-tabs,telemetry-panel,snapshot-controls}.ts`. `params-panel` hosts Tweakpane; the others are native Lit.

### The `Archetype` contract — `core/archetype.ts`

```ts
export type ArchetypeKind = 'flow' | 'map';        // flows need dt; maps do not.

export interface NodeSpec {
  id: string; parentId: string | null; label: string;
  stateOffset: number;   // start index into the flat SoA state
  stateLength: number;   // scalars this node owns
  params?: Record<string, number>;
}

export interface GlobalParams {
  eps: number; gamma: number; freqScale: number; ampScale: number; dt: number;
  [k: string]: number;
}
export type ResolvedParams = GlobalParams & Record<string, number>;

// Mutates pre-allocated scratch. ZERO allocation.
export type Derivative = (out: Float64Array, state: Float64Array, p: ResolvedParams) => void;

export interface Integrator {
  readonly kind: ArchetypeKind;
  step(out: Float64Array, state: Float64Array, deriv: Derivative, p: ResolvedParams, dt: number): void;
}

export interface RenderHint {
  geometry: 'points' | 'instancedSegments';
  exposesField?: boolean;
  materialFactory: () => unknown;  // TSL node material; `unknown` keeps Graphics decoupled
}

export interface Archetype {
  readonly id: string;
  readonly kind: ArchetypeKind;
  stateDim(nodeCount: number): number;
  init(nodes: NodeSpec[], p: ResolvedParams, rng: () => number): void;  // allocates ALL buffers ONCE
  seed(nodes: NodeSpec[], out: Float64Array): void;
  step(dt: number, p: ResolvedParams): void;          // mutates internal SoA, ZERO alloc
  readPositions(): Float32Array;                       // stable view, never a new array
  readState(): Float64Array;                           // authoritative f64 (snapshot / Lyapunov)
  loadState(s: Float64Array): void;
  getHierarchy(): NodeSpec[];                          // FR-3.2
  renderHint(): RenderHint;
  dispose(): void;
  readField?(): { texture: unknown; width: number; height: number };  // foam: field-native
}
```

The Manager never inspects physics — it calls `step()`, uploads `readPositions()`, reads `readState()` for snapshots/validation. New archetypes are pure fan-out: one file + one registry import.

---

## 3. Unified data flow + zero-allocation strategy

**Flow:** Tweakpane/Lit edit → `ui/store.ts` (validated) → Manager merges per-layer overrides into `ResolvedParams` → posted to the Worker as a small struct (**not** per-particle, **not** in the hot loop). Worker tick (fixed `DT`):

```
acc += realElapsed;
while (acc >= DT && substeps < MAX) {           // MAX≈8, anti spiral-of-death
  activeArchetype.step(DT, resolvedParams);     // rk4 / velocityVerlet / semiImplicitEuler / mapIterate
  acc -= DT;
}
```

Worker downcasts authoritative f64 → the *inactive* f32 SAB slab → `Atomics.store(control, 0, slabIndex)`. Render tick (main thread, `setAnimationLoop`, decoupled): `Atomics.load` slab (zero copy) → `floatingOrigin` subtracts the f64 camera anchor → upload small f32 offsets (WebGPU vertex stage samples the storage buffer directly). Trails write head into ring slot `head % K` every Nth step. Telemetry/Benettin-LLE posted on a throttled cadence; Lit renders to DOM at ~10 Hz, never blocking the frame.

**Zero-allocation (NFR-1.2) — structural, not a cleanup pass:**
- Pre-allocate **all** SoA `Float64Array`/`Float32Array` + ping-pong buffers + flat octree node pool (never `{}` per node) in `init()`.
- Derivatives are `f(out, state, params)` mutating passed-in scratch. **No** object literals, `new Vector3`, spread, destructuring-defaults, or `.map/.filter/.forEach` inside `step()`/render loop — indexed `for` only.
- Render loop: module-scope `Vector3/Matrix4/Color` scratch reused via `.set()/.copy()`; one stable loop fn; submit `computeAsync` **without awaiting** (awaiting allocates a promise per frame).
- Full Lyapunov-spectrum QR (allocates) lives on a throttled diagnostic path, never the 100k hot loop. `zeroAlloc.test.ts` asserts ~zero heap delta across N steps.

---

## 4. Trail rendering + extreme-zoom precision

### Trails — bounded subsampled GPU ring buffer
Naive `100k × 1000 × vec3 f32 = 1.2 GB` is rejected (infeasible + sub-pixel). **Subsample to K fixed ring slots:**

| Layout | Memory |
|---|---|
| `100k × 64 × vec4 f32` (K=64, default) | **~98 MB** |
| `100k × 128 × vec4 f32` (K=128, max) | ~196 MB |

`vec4` packs `xyz + age/alpha` (16-byte WGSL alignment). A monotonic `head` writes into `head % K` every **N** sim steps, `N = ceil(targetSteps / K)`. The UI exposes trail length 0–1000 ("effective steps") mapped onto fixed K via stride N — **memory is constant regardless of the slider**. Render as one unit-segment geometry instanced `count × (K−1)` times; `alpha = fade(slot age)` gives the 0→1 fade (FR-2.1/2.2). Zero per-frame geometry reallocation.

### Extreme zoom (NFR-2.2) — floating-origin treated as architecture, not polish
The adversarial verdict (high confidence) sharpened the requirement: what's *required* is **camera-relative rebasing backed by a precision source richer than absolute f32**, **paired with depth-buffer precision** (the naive framing omits depth). f32 ≈ 7.2 digits; ULP at magnitude 1.6e7 is already ~1.0 → absolute f32 goes "steppy."
1. **Authoritative state in CPU f64**, reused as the camera anchor's precision source. Keep the two f64 needs conceptually separate (integration accuracy vs camera anchor) — an f32 sim would still need the f64 anchor.
2. **Per-frame RTE rebase:** origin near focus (orbit target / focused node); `offset_i = pos_i − origin` in f64 on CPU, downcast to f32, upload. WGSL has no f64 → no GPU double math.
3. **Rebase with hysteresis** (when `|camera − origin|` exceeds a fraction of view extent), not every frame.
4. **Log-space camera:** `distance = exp(lerp(log d0, log d1, t))` for perceptually-uniform macro→micro focus.
5. **Depth precision (the omitted axis):** `logarithmicDepthBuffer:true` (or reversed-Z / scale cascades), else z-fighting persists even with perfect XY. **Validate fill-rate at 100k point-sprites** (log depth can disable early-Z; differs across WebGPU/WebGL2).
6. **Hierarchy nested frames:** store each child relative to its parent so deep nesting never accumulates one giant absolute coordinate.
7. **Build the rebase hook day one** as a no-op `anchor=0` in P1 — retrofitting floating-origin late is invasive. Double-single (two-f32) emulation reserved only for a future fully-GPU-resident archetype.

---

## 5. JSON state schema (FR-3.3)

Extends the PRD schema (matrices, init vectors, camera), **versioned** with a migration chain. Trails excluded (regenerate). `rngSeed + fixed dt = bit-reproducible replay` on the CPU-f64 path (GPU f32 differs across vendors).

```ts
// state/schema.ts (zod). type Snapshot = z.infer<typeof Snapshot>
const Vec3   = z.tuple([z.number(), z.number(), z.number()]);
const Matrix = z.object({ rows: z.number().int(), cols: z.number().int(), data: z.array(z.number()) });
const Node   = z.object({ id: z.string(), parentId: z.string().nullable(), label: z.string(),
                          stateOffset: z.number().int(), stateLength: z.number().int(),
                          params: z.record(z.number()).optional() });
const Camera = z.object({ position: Vec3, target: Vec3, zoomDecade: z.number(),
                          fov: z.number(), logarithmicDepth: z.boolean() });
const Snapshot = z.object({
  schemaVersion: z.literal(2),
  archetypeId:   z.string(),
  global:        z.object({ eps: z.number(), gamma: z.number(), freqScale: z.number(),
                            ampScale: z.number(), dt: z.number() }),
  hierarchy:     z.array(Node),
  matrices:      z.record(Matrix),
  initVectors:   z.record(z.array(z.number())),
  camera:        Camera,
  rng:           z.object({ seed: z.number(), stream: z.number().optional() }),
  frameIndex:    z.number().int(),
});
```

Migration: `while (doc.schemaVersion < CURRENT) doc = migrations[doc.schemaVersion](doc)`, then `Snapshot.parse(doc)`.

---

## 6. Directory structure

```
aether-sim/
  index.html
  vite.config.ts            # COOP same-origin / COEP require-corp headers; worker imports
  package.json              # bun; deps: three@r184, lit, @nanostores/lit, nanostores, tweakpane@4, zod
  tsconfig.json             # strict
  public/
    _headers                # COOP/COEP for static host
    coi-serviceworker.js    # SAB shim for header-incapable hosts
  src/
    main.ts
    app/        bootstrap.ts  capabilities.ts  loop.ts
    core/       archetype.ts  registry.ts  manager.ts  params.ts  hierarchy.ts
    sim/        accumulator.ts  sim.worker.ts  doublebuffer.ts
    physics/    constants.ts  scratch.ts  octree.ts  lyapunov.ts
      integrators/  rk4.ts  velocityVerlet.ts  semiImplicitEuler.ts  mapIterate.ts
    archetypes/ strangeAttractor.ts  hyperOscillator.ts  nbody.ts  quantumFoam.ts  index.ts
    render/     renderer.ts  points.ts  trails.ts  camera.ts  floatingOrigin.ts  upload.ts  theme.ts
      kernels/  lorenz.tsl.ts  ...  nbody.tsl.ts  grayScott.tsl.ts
    state/      schema.ts  migrations.ts  snapshot.ts  rng.ts
    ui/         store.ts  store-controller.ts
      components/  app-shell.ts  params-panel.ts  hierarchy-tree.ts
                   archetype-tabs.ts  telemetry-panel.ts  snapshot-controls.ts
  test/
    solvers.test.ts          # RK4/Verlet vs analytic / energy conservation
    lyapunov.bench.test.ts   # Lorenz 0.9056, Rössler 0.0714, Thomas ~0.04 within ~5%
    schema.test.ts           # round-trip export/import + migration
    zeroAlloc.test.ts        # heap-delta across N steps
    perf.bench.test.ts       # fps @ particle count harness
```

---

## 7. Phased build plan (full roadmap, all 4 archetypes)

### MVP / vertical slice — build FIRST (spans late P1 → early P2)
The single thread that proves the value loop before fan-out:
- [ ] `core/archetype.ts` + `core/registry.ts` — the seam, before anything else.
- [ ] **Lorenz only** (`σ=10, ρ=28, β=8/3`, init `(0,1,1.05)`), RK4 into pre-allocated f64 SoA, seeded from fixed `rngSeed`, zero alloc.
- [ ] Fixed-dt accumulator on the **main thread first** (skip Worker/SAB) — satisfies FR-1.3 logically, de-risks the Worker.
- [ ] Render 100k Lorenz particles as one `THREE.Points` from the f32 slab via `WebGPURenderer`, dark theme, `OrbitControls` (NFR-2.1). Rebase hook present as no-op `anchor=0`.
- [ ] Snapshot round-trip (FR-3.3 core): export/import `{archetypeId, global, camera, rngSeed, frameIndex}`; reload continues identically.
- [ ] Minimal Lit `params-panel` (Tweakpane): `σ/ρ/β/dt` + particle count, bound through the store.
- [ ] **`lyapunov.bench.test.ts` asserts Lorenz ≈ 0.9056 within 5%** — objective proof the solver is correct, not "looks chaotic."

### Phase 1 — core math/solvers + JSON serialization
- [ ] Integrators as injected strategies: `rk4` (dissipative flows + hyper-oscillators), `velocityVerlet` (N-body, KDK leapfrog), `semiImplicitEuler` (cheap fallback), `mapIterate` (Clifford, no dt). **Flow-vs-map explicit in the type.**
- [ ] `strangeAttractor`: Lorenz, Rössler (`a=b=0.2, c=5.7`, dt 0.01–0.02), Aizawa (6-param, dt 0.005–0.01), Thomas (`b=0.19`, dt 0.02–0.05), Halvorsen (`a=1.89`), Dadras, Clifford map (`a=−1.4, b=1.6, c=1, d=0.7`).
- [ ] `hyperOscillator`: Duffing/vdP `dv/dt = −ω²x − βx³ + μ(1−x²)v − γv + F_parent + F_couple`; `ω_k=ω₀·S_f^k`, `A_k=A₀·S_a^k` (`S_a≈1/φ`); irrational drivers `[φ,π,e,δ]`; **bound `dt ≤ 0.05/max(ω_i)`** or scale dt per level.
- [ ] `nbody`: Plummer-softened `a_i = G·Σ m_j (r_j−r_i)/(|r_j−r_i|²+ε²)^{3/2}` (ε>0 always), velocity-Verlet; cross-scale coupling = additive COM term, not a hacked gravity exponent.
- [ ] zod `Snapshot` v2 + migrations + round-trip; seeded PRNG (mulberry32/PCG).
- [ ] Worker + SAB double-buffer (once a COOP/COEP host is confirmed); main-thread fallback path.
- [ ] Tests: `solvers`, `schema`, `zeroAlloc`. Gate solver correctness on Benettin — **ban explicit Euler for attractors** (it spuriously spirals Lorenz wings outward).

### Phase 2 — GPU shader trails + log-zoom camera precision
- [ ] Port integrators to **TSL compute kernels** over `instancedArray` storage buffers; dispatch `renderer.computeAsync` **submitted, not awaited**.
- [ ] Subsampled GPU **ring-buffer trails** (K=64 default / 128 max, stride N, age-alpha fade) — ~98 MB not 1.2 GB.
- [ ] Floating-origin/RTE rebase made real (f64 anchor, f32 offsets, hysteresis) + `logarithmicDepthBuffer` + log-space distance interpolation (NFR-2.2). **Validate log-depth fill-rate at 100k sprites.**
- [ ] `quantumFoam`: Gray-Scott `∂U/∂t = Du∇²U − UV² + f(1−U)`, `∂V/∂t = Dv∇²V + UV² − (f+k)V` (9-pt Laplacian, ping-pong; mitosis `f=0.0367,k=0.0649`; coral `f=0.0545,k=0.062`; `Du≈2·Dv`); `readField()` + drives the shared particle pipeline (gradient advection / threshold emission). Optional Lenia for smooth CA jitter.
- [ ] N-body GPU tiled all-pairs (Nyland-Harris) to ~30–100k; flat-pool Barnes-Hut (`θ≈0.5–1.0`) only if counts force it; else run N-body at 20–30 Hz with render interpolation.

### Phase 3 — UI (sliders/tabs/telemetry) + Lyapunov validation
- [ ] Full Lit UI: `params-panel` (global + per-layer eps/gamma/freq-amp-scale/dt), `archetype-tabs` (FR-3.1 live switch, no reload).
- [ ] **`hierarchy-tree`** (FR-3.2): nested parent-child from `parentId`; node selection highlights its SAB state slice; edits write `node.params`.
- [ ] `telemetry-panel` at ~10 Hz: fps, particle count, substep ms, live LLE.
- [ ] Lyapunov validation harness within ~5% after transient discard: Lorenz 0.9056, **Rössler 0.0714 (needs ≥10⁵ τ-intervals)**, Thomas ~0.04. Optional full-spectrum QR (hand-coded Jacobians, e.g. Lorenz `J=[[−σ,σ,0],[ρ−z,−1,−x],[y,x,−β]]`) for Kaplan-Yorke dimension telemetry.
- [ ] `perf.bench.test.ts` FPS/particle-count harness against NFR-1.1.

---

## 8. Top risks + mitigations

| Risk | Mitigation |
|---|---|
| **"Double-precision sim" vs "100k @ 60fps"** — WGSL has no f64; CPU-f64 N-body can't hit 100k. | Scope-split by purpose: **f64 CPU = correctness/repro/Lyapunov/energy/camera anchor; f32 GPU = the 100k spectacle.** |
| **N-body at true 100k** — O(n²) ≈ 10¹⁰ interactions/frame. | GPU tiled all-pairs to ~50–100k; or decouple N-body tick to 20–30 Hz with render interpolation. Let CA/attractors carry the full-100k spectacle; defer GPU Barnes-Hut past P2. |
| **Extreme log-zoom precision** (verified, high conf) — absolute f32 quantizes; floating-origin alone doesn't fix depth. | Camera-relative rebase + f64 anchor **+ logarithmicDepthBuffer/reversed-Z**; build the rebase hook day one as no-op; validate log-depth fill-rate at 100k sprites. |
| **Trail buffer OOM** — naive 100k×1000 = 1.2 GB. | Subsampling is **mandatory**: K=64 → ~98 MB; UI 0–1000 maps onto fixed K via stride N. |
| **SAB needs COOP/COEP** — header-incapable hosts silently degrade. | Detect `crossOriginIsolated` at boot; Worker+SAB when isolated, main-thread accumulator otherwise; ship `coi-serviceworker.js` shim or use a header-capable host. |
| **WebGL2 has no compute** — parity doubles sim effort. | **WebGPU is the supported path; WebGL2 = explicitly degraded fallback** (or dropped). |
| **Forward Euler silently wrong** on attractors. | Ban explicit Euler for attractors; gate correctness on the **Benettin LLE test**, not visual plausibility. |
| **RK4 violates energy on N-body** over 10⁵+ steps. | Velocity-Verlet (symplectic); for relativistic/cross-scale variants monitor a conserved-quantity proxy. |
| **GC pauses from hidden allocations** (closures, `.map`, octree `{}`, awaiting `computeAsync`). | Structural zero-alloc: SoA + flat pools + module-scope scratch + indexed loops + submit-don't-await; enforced by `zeroAlloc.test.ts`. |
| **TSL/WebGPU APIs fast-moving.** | Pin **three@r184**; budget for migration-guide churn on minor bumps. |
| **Foam is field-native, not particles.** | Interface allows `readField()` in addition to positions; foam drives the shared pipeline via gradient advection / threshold emission. |

---

## 9. Verification strategy

| Phase | Proof |
|---|---|
| **Solvers (P1)** | `solvers.test.ts`: RK4 vs analytic where available; N-body Verlet **energy-conservation** (bounded drift over 10⁵ steps); map-iterate ignores dt. |
| **Math gate (P1/P3)** | `lyapunov.bench.test.ts`: Benettin two-trajectory (`d0=1e-8` in **f64** — f32 epsilon ~1.2e-7 would swamp it), renormalize each τ, `LLE = Σln(d1/d0)/elapsed` after ~10³-step transient discard. Assert **Lorenz ≈ 0.9056**, **Rössler ≈ 0.0714** (≥10⁵ τ), **Thomas ≈ 0.04** within ~5%. |
| **Reproducibility (FR-3.3)** | `schema.test.ts`: export→import→continue is bit-identical on the CPU-f64 path; migration upgrades a v1 fixture to v2. |
| **Zero-alloc (NFR-1.2)** | `zeroAlloc.test.ts`: heap-delta across N `step()` ≈ 0; Chrome allocation-profiler spot-check on the render loop. |
| **Perf (NFR-1.1)** | `perf.bench.test.ts` + in-app telemetry: ≥60 fps at 100k points with K=64 trails on the mid-range target; record fps-vs-count curve; validate `logarithmicDepthBuffer` doesn't tank fill-rate. |
| **Visual (manual)** | Crisp Lorenz/Aizawa wings with fading trails in dark mode; deep log-zoom stays smooth (no stepping/z-fighting); live archetype switch has no reload/flash; tree node selection highlights the right particles. |

---

## 10. Remaining open decisions (do not block scaffolding)

These were locked or recommended; flagged here so they're explicit before the relevant phase:
1. **Deployment host** — must it allow COOP/COEP (→ SharedArrayBuffer)? Drives Worker+SAB vs main-thread; GitHub Pages needs the `coi-serviceworker` shim, Netlify/Vercel/Cloudflare/own server are fine. *(Needed before P1 Worker task.)*
2. **N-body 100k hardness** — is 100k hard *for N-body specifically*, or can N-body run at ~4–50k while CA/attractors carry the 100k spectacle? Decides whether GPU Barnes-Hut is in scope. *(Needed before P2 N-body task.)*
3. **"Mid-range hardware"** target for NFR-1.1 — confirm desktop/laptop (mobile WebGPU is fragmented mid-2026).
4. **Hyper-oscillator defaults** — nested levels / children per node (drives per-particle budget vs 100k); and whether irrational drivers φ/π/e/δ are hard-wired per level or user-assignable in the tree (affects schema). *(Needed before P1 hyperOscillator task.)*
5. **Trail ceiling** — is 1000 a hard visual requirement or a ceiling? Confirms K=64 vs 128 and the trail memory budget.

---

**Sources:** [Three.js r184](https://github.com/mrdoob/three.js/releases/tag/r184) · [WGSL f64 — gpuweb #2805](https://github.com/gpuweb/gpuweb/issues/2805) · [Migrate Three.js to WebGPU (2026)](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)

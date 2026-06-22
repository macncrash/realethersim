// The one contract every simulation archetype plugs into.
// The Simulation Manager only ever calls this interface — it never inspects physics,
// which is what makes adding an archetype pure fan-out (one file + one registry import).

export type ArchetypeKind = 'flow' | 'map';

export interface NodeSpec {
  id: string;
  parentId: string | null;
  label: string;
  stateOffset: number; // start index into the flat SoA state buffer
  stateLength: number; // number of scalars this node owns
  params?: Record<string, number>; // local overrides merged over globals
  // For nodes that map to a contiguous group of particles (e.g. N-body clusters), the render
  // range used by the hierarchy tree to highlight the selection. Omitted when a node isn't a
  // particle group (e.g. a hyper-oscillator level).
  particleStart?: number;
  particleCount?: number;
}

// Flat resolved parameters the physics reads. `dt` is always present; everything else is
// archetype-specific (σ/ρ/β for Lorenz, omega0/eps/levels for the hyper-oscillator, …).
export type ResolvedParams = { dt: number } & Record<string, number>;

// Derivative writes dim values into `out`, reading the local dim-length state `x`.
// Mutates pre-allocated scratch — ZERO allocation in the hot loop.
export type Derivative = (out: Float64Array, x: Float64Array, p: ResolvedParams) => void;

// Declarative tunable parameter — the UI builds sliders from these, so archetypes own their
// own controls. `rebuild: true` means a change reallocates state (handled by tearing down the
// archetype), e.g. discrete structural params like `levels`.
export interface ParamSpec {
  key: string;
  label?: string;
  min: number;
  max: number;
  step?: number;
  default: number;
  options?: Record<string, number>; // discrete select instead of a slider
  rebuild?: boolean;
}

export interface RenderHint {
  geometry: 'points' | 'instancedSegments';
  exposesField?: boolean;
  pointSize?: number;
  // Graphics owns material creation from these hints, so Physics never imports three.
}

export interface ArchetypeConfig {
  particleCount: number;
  seed: number;
  params: ResolvedParams;
}

export interface Archetype {
  readonly id: string;
  readonly kind: ArchetypeKind;
  readonly particleCount: number;

  step(dt: number, p: ResolvedParams): void; // mutates internal SoA, ZERO allocation

  readPositions(): Float32Array; // length particleCount*3, stable view (never a new array)
  readColors(): Float32Array | null; // per-particle rgb, computed once
  readState(): Float64Array; // authoritative f64 (snapshot / Lyapunov)
  loadState(s: Float64Array): void;

  getHierarchy(): NodeSpec[];
  renderHint(): RenderHint;
  dispose(): void;

  // optional: field-native archetypes (foam) expose a field in addition to positions
  readField?(): { texture: unknown; width: number; height: number };
}

export interface ArchetypeFactory {
  readonly id: string;
  readonly label: string;
  readonly category: string; // UI grouping bucket (e.g. 'Attractor', 'Map', 'N-Body')
  readonly kind: ArchetypeKind;
  readonly params: ParamSpec[];
  readonly defaultParticleCount: number;
  readonly defaultDt: number; // global dt applied when this system is selected (its stable step)
  readonly particleCountOptions?: number[]; // overrides the UI's default count choices (e.g. N-body caps lower)
  create(config: ArchetypeConfig): Archetype;
}

// Default parameter values derived from a factory's spec.
export function defaultParams(specs: ParamSpec[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of specs) out[s.key] = s.default;
  return out;
}

import { atom, map } from 'nanostores';
import type { Engine } from '../app/engine';
import { defaultParams, type NodeSpec } from '../core/archetype';
import { DEFAULT_GLOBAL, type GlobalParams } from '../core/params';
import { getFactory, listFactories } from '../core/registry';
import { registerArchetypes } from '../archetypes';

// Ensure the registry is populated before deriving initial params from it.
registerArchetypes();

const INITIAL_ARCHETYPE = 'lorenz';

// Shared reactive state. The engine subscribes to these (sim side) and writes $telemetry;
// Lit components bind via @nanostores/lit StoreController.
export const $archetypeId = atom<string>(INITIAL_ARCHETYPE);
export const $global = map<GlobalParams>({ ...DEFAULT_GLOBAL });
export const $params = map<Record<string, number>>({ ...defaultParams(getFactory(INITIAL_ARCHETYPE).params) });

export function setParam(key: string, value: number): void {
  $params.setKey(key, value);
}

export function setGlobal<K extends keyof GlobalParams>(key: K, value: GlobalParams[K]): void {
  $global.setKey(key, value);
}

// Switch archetype (FR-3.1): adopt the new factory's default params, particle count, and dt
// (each system has its own stable integration step).
export function selectArchetype(id: string): void {
  if (id === $archetypeId.get()) return;
  const factory = getFactory(id);
  $params.set({ ...defaultParams(factory.params) });
  $global.setKey('particleCount', factory.defaultParticleCount);
  $global.setKey('dt', factory.defaultDt);
  $global.setKey('trailLength', factory.defaultTrail ?? DEFAULT_GLOBAL.trailLength);
  $archetypeId.set(id);
}

// Re-apply the current factory's factory defaults (params + particle count + dt + trail) without
// switching systems — the "reset to defaults" action.
export function resetCurrent(): void {
  const factory = getFactory($archetypeId.get());
  $params.set({ ...defaultParams(factory.params) });
  $global.setKey('particleCount', factory.defaultParticleCount);
  $global.setKey('dt', factory.defaultDt);
  $global.setKey('trailLength', factory.defaultTrail ?? DEFAULT_GLOBAL.trailLength);
}

// Jump to a uniformly-random different system.
export function selectRandom(): void {
  const ids = listFactories().map((f) => f.id);
  const cur = $archetypeId.get();
  const others = ids.filter((id) => id !== cur);
  if (others.length === 0) return;
  selectArchetype(others[Math.floor(Math.random() * others.length)]);
}

// Demo mode: auto-cycle to a random system on a timer (a hands-off "screensaver"). The interval
// lives at module scope so it survives component re-renders.
// - $demoPaused: spacebar holds on the current system (timer stopped; the sim keeps animating).
// - $demoDetails: show the current system's about + formulae as a bottom overlay (still in demo).
export const $demoMode = atom<boolean>(false);
export const $demoPaused = atom<boolean>(false);
export const $demoDetails = atom<boolean>(false);
let demoTimer: ReturnType<typeof setInterval> | null = null;
const DEMO_INTERVAL_MS = 11_000;

function startDemoTimer(): void {
  if (!demoTimer) demoTimer = setInterval(selectRandom, DEMO_INTERVAL_MS);
}
function stopDemoTimer(): void {
  if (demoTimer) {
    clearInterval(demoTimer);
    demoTimer = null;
  }
}

export function setDemoMode(on: boolean): void {
  if (on === $demoMode.get()) return;
  $demoMode.set(on);
  if (on) {
    $demoPaused.set(false);
    selectRandom();
    startDemoTimer();
  } else {
    stopDemoTimer();
    $demoPaused.set(false);
    $demoDetails.set(false);
  }
}

// Spacebar: pause/resume the auto-advance (stay on the current system; the sim keeps running).
export function toggleDemoPause(): void {
  if (!$demoMode.get()) return;
  const paused = !$demoPaused.get();
  $demoPaused.set(paused);
  if (paused) stopDemoTimer();
  else startDemoTimer();
}

// Toggle the bottom about/formula overlay without leaving demo mode.
export function toggleDemoDetails(): void {
  if (!$demoMode.get()) return;
  $demoDetails.set(!$demoDetails.get());
}

export interface Telemetry {
  fps: number;
  particles: number;
  substeps: number;
  backend: string;
  lle: number;
  camPos: [number, number, number]; // camera world position (so a view is reproducible)
  camTarget: [number, number, number]; // orbit target
}

export const $telemetry = map<Telemetry>({
  fps: 0,
  particles: 0,
  substeps: 0,
  backend: '…',
  lle: NaN,
  camPos: [0, 0, 0],
  camTarget: [0, 0, 0],
});

export const $engine = atom<Engine | null>(null);

// Active archetype's hierarchy (FR-3.2) + the currently selected node id.
export const $hierarchy = atom<NodeSpec[]>([]);
export const $selectedNode = atom<string | null>(null);

export { listFactories };

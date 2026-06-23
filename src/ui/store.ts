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
  $archetypeId.set(id);
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

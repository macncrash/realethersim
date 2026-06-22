import type { ArchetypeFactory } from './archetype';

// Archetype registry. Factories self-register via side-effect import (see archetypes/index.ts),
// which keeps the Manager decoupled and makes archetypes code-splittable.
const registry = new Map<string, ArchetypeFactory>();

export function register(factory: ArchetypeFactory): void {
  registry.set(factory.id, factory);
}

export function getFactory(id: string): ArchetypeFactory {
  const f = registry.get(id);
  if (!f) throw new Error(`Unknown archetype "${id}". Registered: ${[...registry.keys()].join(', ') || '(none)'}`);
  return f;
}

export function listFactories(): ArchetypeFactory[] {
  return [...registry.values()];
}

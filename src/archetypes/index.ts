import { register } from '../core/registry';
import { makeAttractorFactory, SYSTEMS } from './strangeAttractor';
import { hyperOscillatorFactory } from './hyperOscillator';
import { nbodyFactory } from './nbody';
import { quantumFoamFactory } from './quantumFoam';

// Side-effect registration. Importing this module wires every archetype into the registry.
// Adding a new archetype = add a file + one register() call here.
let registered = false;

export function registerArchetypes(): void {
  if (registered) return;
  registered = true;
  for (const system of Object.values(SYSTEMS)) {
    register(makeAttractorFactory(system));
  }
  register(hyperOscillatorFactory);
  register(nbodyFactory);
  register(quantumFoamFactory);
}

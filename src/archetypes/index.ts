import { register } from '../core/registry';
import { makeAttractorFactory, SYSTEMS } from './strangeAttractor';
import { makeMapFactory, MAP_SYSTEMS } from './iteratedMap';
import { makeIfsFactory, IFS_SYSTEMS } from './fractalIFS';
import { makeEscapeFactory, ESCAPE_SYSTEMS } from './escapeFractal';
import { hyperOscillatorFactory } from './hyperOscillator';
import { nbodyFactory } from './nbody';
import { quantumFoamFactory } from './quantumFoam';
import { particleLifeFactory } from './particleLife';
import { boidsFactory } from './boids';
import { slimeMoldFactory } from './slimeMold';
import { excitableMediumFactory } from './excitableMedium';
import { grayScottFieldFactory } from './grayScottField';
import { pointVorticesFactory } from './pointVortices';
import { leniaFactory } from './lenia';
import { dlaFactory } from './dla';
import { kuramotoFactory } from './kuramoto';
import { chimeraFactory } from './chimera';
import { karmanFactory } from './karman';
import { makeParametricFactory, PARAMETRIC_SYSTEMS } from './parametric';
import { makeRaymarchFactory, RAYMARCH_SYSTEMS } from './raymarchFractal';

// Side-effect registration. Importing this module wires every archetype into the registry.
// Adding a new archetype = add a file + one register() call here.
let registered = false;

export function registerArchetypes(): void {
  if (registered) return;
  registered = true;
  for (const system of Object.values(SYSTEMS)) {
    register(makeAttractorFactory(system));
  }
  for (const system of Object.values(MAP_SYSTEMS)) {
    register(makeMapFactory(system));
  }
  for (const system of Object.values(IFS_SYSTEMS)) {
    register(makeIfsFactory(system));
  }
  for (const system of Object.values(ESCAPE_SYSTEMS)) {
    register(makeEscapeFactory(system));
  }
  register(hyperOscillatorFactory);
  register(nbodyFactory);
  register(quantumFoamFactory);
  register(particleLifeFactory);
  register(boidsFactory);
  register(slimeMoldFactory);
  register(excitableMediumFactory);
  register(grayScottFieldFactory);
  register(pointVorticesFactory);
  register(leniaFactory);
  register(dlaFactory);
  register(kuramotoFactory);
  register(chimeraFactory);
  register(karmanFactory);
  for (const system of Object.values(PARAMETRIC_SYSTEMS)) {
    register(makeParametricFactory(system));
  }
  for (const system of Object.values(RAYMARCH_SYSTEMS)) {
    register(makeRaymarchFactory(system));
  }
}

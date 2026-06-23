import type { ArchetypeFactory, ParamSpec } from '../core/archetype';

// 3D sphere-traced fractals. Unlike every other archetype these don't produce a point cloud —
// they're rendered by a full-screen distance-estimator shader (see src/render/raymarch.ts). They
// register as factories ONLY so the switcher / params panel / learn panel pick them up; bootstrap
// intercepts their id before any point sim is built, so create() must never be called.
export type RaymarchKind = 'mandelbulb' | 'qjulia' | 'mandelbox' | 'menger';

export interface RaymarchSystem {
  id: string;
  label: string;
  sdf: RaymarchKind;
  params: ParamSpec[];
  // Internal render tuning (consumed by raymarch.ts, not the UI):
  iters: number; // fractal iterations baked into the shader loop
  bound: number; // bounding-sphere radius the march is clipped to
  camDist: number; // initial camera distance when the system is selected
  maxSteps: number; // sphere-trace step cap
}

const COL: ParamSpec = { key: 'colShift', label: 'colour', min: 0, max: 1, step: 0.01, default: 0.5 };
const ANIM: ParamSpec = { key: 'animate', label: 'morph', min: 0, max: 1, step: 0.01, default: 0.35 };

export const RAYMARCH_SYSTEMS: Record<string, RaymarchSystem> = {
  mandelbulb: {
    id: 'mandelbulb',
    label: 'Mandelbulb',
    sdf: 'mandelbulb',
    iters: 8,
    bound: 1.25,
    camDist: 2.7,
    maxSteps: 128,
    params: [
      { key: 'power', label: 'power', min: 2, max: 12, step: 0.1, default: 8 },
      COL,
      ANIM,
    ],
  },
  qjulia: {
    id: 'qjulia',
    label: 'Quaternion Julia',
    sdf: 'qjulia',
    iters: 10,
    bound: 1.6,
    camDist: 3.4,
    maxSteps: 128,
    params: [
      { key: 'cx', label: 'cₓ', min: -1, max: 1, step: 0.005, default: -0.2 },
      { key: 'cy', label: 'c_y', min: -1, max: 1, step: 0.005, default: 0.6 },
      { key: 'cz', label: 'c_z', min: -1, max: 1, step: 0.005, default: 0.2 },
      { key: 'cw', label: 'c_w', min: -1, max: 1, step: 0.005, default: 0.2 },
      COL,
      ANIM,
    ],
  },
  mandelbox: {
    id: 'mandelbox',
    label: 'Mandelbox',
    sdf: 'mandelbox',
    iters: 14,
    bound: 6.0,
    camDist: 9.5,
    maxSteps: 128,
    params: [
      { key: 'scale', label: 'scale', min: -3, max: 3, step: 0.01, default: -1.6 },
      { key: 'minRadius', label: 'min r', min: 0.1, max: 1, step: 0.01, default: 0.5 },
      COL,
      ANIM,
    ],
  },
  menger: {
    id: 'menger',
    label: 'Menger Sponge',
    sdf: 'menger',
    iters: 5,
    bound: 1.8,
    camDist: 3.6,
    maxSteps: 150,
    params: [
      { key: 'spin', label: 'tilt', min: 0, max: 1, step: 0.01, default: 0.2 },
      COL,
      ANIM,
    ],
  },
};

export function makeRaymarchFactory(s: RaymarchSystem): ArchetypeFactory {
  return {
    id: s.id,
    label: s.label,
    category: 'Fractal',
    kind: 'raymarch',
    params: s.params,
    defaultParticleCount: 1, // inert; the NullDriver ignores it
    defaultDt: 0.016,
    // Never called — bootstrap.makeDriver() routes raymarch ids to the raymarch renderer first.
    // Throwing documents the contract and guards against an accidental point-sim instantiation.
    create() {
      throw new Error(`raymarch archetype "${s.id}" is not a point simulation`);
    },
  };
}

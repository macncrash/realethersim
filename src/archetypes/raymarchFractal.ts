import type { ArchetypeFactory, ParamSpec } from '../core/archetype';

// 3D sphere-traced fractals. Unlike every other archetype these don't produce a point cloud —
// they're rendered by a full-screen distance-estimator shader (see src/render/raymarch.ts). They
// register as factories ONLY so the switcher / params panel / learn panel pick them up; bootstrap
// intercepts their id before any point sim is built, so create() must never be called.
// Fractal distance estimators + implicit isosurfaces (F(x,y,z)=isovalue → DE |F−iso|/|∇F|).
export type RaymarchKind =
  | 'mandelbulb'
  | 'qjulia'
  | 'mandelbox'
  | 'menger'
  | 'gyroid'
  | 'schwarzP'
  | 'schwarzD'
  | 'schoenIWP'
  | 'neovius'
  | 'chmutov'
  | 'heart'
  | 'tanglecube'
  | 'goursat'
  | 'barth';

export interface RaymarchSystem {
  id: string;
  label: string;
  sdf: RaymarchKind;
  params: ParamSpec[];
  category?: string; // UI bucket — 'Fractal' (default) or 'Surface'
  // Internal render tuning (consumed by raymarch.ts, not the UI):
  iters: number; // fractal iterations baked into the shader loop (0 for surfaces)
  bound: number; // bounding-sphere radius the march is clipped to
  camDist: number; // initial camera distance when the system is selected
  maxSteps: number; // sphere-trace step cap
  freq?: number; // spatial frequency for periodic implicit surfaces (world → lattice scale)
  stepScale?: number; // DE under-relaxation (default 0.7); lower for surfaces whose ∇F vanishes near F=0
  maxStep?: number; // hard cap on the march step (world units) — stops steep-gradient surfaces overshooting
}

const COL: ParamSpec = { key: 'colShift', label: 'colour', min: 0, max: 1, step: 0.01, default: 0.5 };
const ANIM: ParamSpec = { key: 'animate', label: 'morph', min: 0, max: 1, step: 0.01, default: 0.35 };
const ISO: ParamSpec = { key: 'iso', label: 'isovalue', min: -2, max: 2, step: 0.01, default: 0 };

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

  // ── implicit isosurfaces (category: Surface) — triply-periodic minimal surfaces + algebraic ──
  gyroid: {
    id: 'gyroid', label: 'Gyroid', sdf: 'gyroid', category: 'Surface',
    iters: 0, freq: 1.3, bound: 4.4, camDist: 10.5, maxSteps: 170, params: [ISO, COL, ANIM],
  },
  schwarzP: {
    id: 'schwarzP', label: 'Schwarz P', sdf: 'schwarzP', category: 'Surface',
    iters: 0, freq: 1.3, bound: 4.4, camDist: 10.5, maxSteps: 170, params: [ISO, COL, ANIM],
  },
  schwarzD: {
    id: 'schwarzD', label: 'Schwarz D (Diamond)', sdf: 'schwarzD', category: 'Surface',
    iters: 0, freq: 1.3, bound: 4.4, camDist: 10.5, maxSteps: 170, params: [ISO, COL, ANIM],
  },
  schoenIWP: {
    id: 'schoenIWP', label: 'Schoen I-WP', sdf: 'schoenIWP', category: 'Surface',
    iters: 0, freq: 1.3, bound: 4.4, camDist: 10.5, maxSteps: 170, params: [ISO, COL, ANIM],
  },
  neovius: {
    id: 'neovius', label: 'Neovius', sdf: 'neovius', category: 'Surface',
    iters: 0, freq: 1.3, bound: 4.4, camDist: 10.5, maxSteps: 170, params: [ISO, COL, ANIM],
  },
  chmutov: {
    id: 'chmutov', label: 'Chmutov Octic', sdf: 'chmutov', category: 'Surface',
    iters: 0, freq: 0.85, bound: 1.75, camDist: 4.7, maxSteps: 210, params: [ISO, COL, ANIM],
  },
  heart: {
    id: 'heart', label: 'Heart', sdf: 'heart', category: 'Surface',
    iters: 0, freq: 0.7, bound: 2.0, camDist: 4.6, maxSteps: 360, stepScale: 0.4, maxStep: 0.035, params: [ISO, COL, ANIM],
  },
  tanglecube: {
    id: 'tanglecube', label: 'Tanglecube', sdf: 'tanglecube', category: 'Surface',
    iters: 0, freq: 1.0, bound: 3.0, camDist: 7.5, maxSteps: 220, stepScale: 0.45, params: [ISO, COL, ANIM],
  },
  goursat: {
    id: 'goursat', label: 'Goursat', sdf: 'goursat', category: 'Surface',
    iters: 0, freq: 0.62, bound: 2.4, camDist: 5.6, maxSteps: 190, params: [ISO, COL, ANIM],
  },
  barth: {
    id: 'barth', label: 'Barth Sextic', sdf: 'barth', category: 'Surface',
    iters: 0, freq: 0.92, bound: 1.55, camDist: 3.7, maxSteps: 240, params: [ISO, COL, ANIM],
  },
};

export function makeRaymarchFactory(s: RaymarchSystem): ArchetypeFactory {
  return {
    id: s.id,
    label: s.label,
    category: s.category ?? 'Fractal',
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

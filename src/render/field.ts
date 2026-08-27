import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import * as tsl from 'three/tsl';

// Field render pass: draws a system's continuous 2-D scalar field (readField()) as a smooth colour
// map on a flat panel, instead of a cloud of 1-px points. A grid of points can only light its bright
// cells, so a continuous field (a wave, a temperature map) reads as sparse speckle; a texture samples
// BETWEEN cells (linear filter) and every cell contributes, so the field is smooth and gap-free — the
// right tool for the whole 2-D-field family (waves, reaction–diffusion, Ising, …). We upload the field
// as an R-float DataTexture each frame and colour it with a diverging map (blue troughs, dark zero,
// orange crests), auto-scaled by the field's mean amplitude so it reads bright at any absolute level.

// TSL nodes are dynamically typed (see gpu/types.ts); pull them in untyped like raymarch.ts.
const { Fn, uniform, vec3, uv, clamp, pow, texture } = tsl as any;

export interface FieldPass {
  mesh: THREE.Mesh;
  update(field: { texture: unknown; width: number; height: number }): void;
  dispose(): void;
}

export interface FieldOptions {
  size?: number; // world size of the panel (square), default 3.4
  cold?: [number, number, number]; // trough colour (negative)
  warm?: [number, number, number]; // crest colour (positive)
}

export function createFieldPass(opts: FieldOptions = {}): FieldPass {
  const size = opts.size ?? 3.4;
  const cold = opts.cold ?? [0.16, 0.55, 1.15];
  const warm = opts.warm ?? [1.0, 0.5, 0.12];

  let tex: THREE.DataTexture | null = null;
  let buf: Float32Array | null = null;
  const uScale = uniform(1); // normalisation (≈ mean amplitude) so the map reads bright at any level

  const mat = new MeshBasicNodeMaterial();
  mat.toneMapped = false;
  mat.transparent = false;
  // colour node built once; it samples whatever DataTexture we later assign to `mat.map`-style uniform.
  // We hold the texture in a TSL `texture()` node created lazily on the first update (needs the object).
  let colorBuilt = false;
  const buildColor = (t: THREE.DataTexture): void => {
    const uvN = uv();
    const v = texture(t, uvN).r.div(uScale).toVar(); // field value, mean-normalised
    const posv = clamp(v, 0, 1);
    const negv = clamp(v.mul(-1), 0, 1);
    const c = vec3(...warm).mul(pow(posv, 0.8)).add(vec3(...cold).mul(pow(negv, 0.8)));
    mat.colorNode = Fn(() => c)();
    mat.needsUpdate = true;
    colorBuilt = true;
  };

  // a unit plane laid flat in the XZ ground plane (camera orbits it); scaled to `size`
  const geo = new THREE.PlaneGeometry(size, size, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);

  function update(field: { texture: unknown; width: number; height: number }): void {
    const src = field.texture as ArrayLike<number>;
    const w = field.width, h = field.height, n = w * h;
    if (!tex || !buf || buf.length !== n) {
      buf = new Float32Array(n);
      tex = new THREE.DataTexture(buf, w, h, THREE.RedFormat, THREE.FloatType);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
      colorBuilt = false;
    }
    // copy the field (Float64 grid) into the R-float texture buffer + track mean amplitude
    let sum = 0;
    for (let i = 0; i < n; i++) { const val = src[i]; buf[i] = val; sum += val < 0 ? -val : val; }
    uScale.value = 3 * (sum / n) + 1e-6;
    tex.needsUpdate = true;
    if (!colorBuilt) buildColor(tex);
  }

  function dispose(): void {
    geo.dispose();
    mat.dispose();
    tex?.dispose();
  }

  return { mesh, update, dispose };
}

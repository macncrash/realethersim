import * as THREE from 'three';
import { registerArchetypes } from '../archetypes';
import { SYSTEMS } from '../archetypes/strangeAttractor';
import { resolveParams } from '../core/params';
import { largestLyapunov } from '../physics/lyapunov';
import { createCamera } from '../render/camera';
import { FloatingOrigin } from '../render/floatingOrigin';
import { createPointCloud, type PointCloud } from '../render/points';
import { createTrailCloud, type TrailCloud } from '../render/trails';
import { createRenderer } from '../render/renderer';
import { theme } from '../render/theme';
import { buildSnapshot } from '../state/snapshot';
import type { Snapshot, SnapshotCamera } from '../state/schema';
import { MainThreadDriver, type SimDriver } from '../sim/driver';
import { WorkerDriver } from '../sim/workerDriver';
import { NullDriver } from '../sim/nullDriver';
import { createGpu, hasGpu, type GpuSim } from '../gpu';
import { isRaymarch, getFactory } from '../core/registry';
import { createRaymarch, type RaymarchPass } from '../render/raymarch';
import { RAYMARCH_SYSTEMS } from '../archetypes/raymarchFractal';
import { APP_VERSION } from '../version';
import { embedText } from '../state/pngMeta';
import { detectCapabilities } from './capabilities';
import type { Engine } from './engine';
import { $archetypeId, $engine, $global, $hierarchy, $params, $paused, $selectedNode, $telemetry } from '../ui/store';

const SEED = 1;

// Composition root: wires capabilities → renderer → sim driver → render loop → UI store.
export async function bootstrap(canvas: HTMLCanvasElement): Promise<Engine> {
  registerArchetypes();

  const caps = await detectCapabilities();
  const { renderer, backend } = await createRenderer(canvas);
  const useWorker = caps.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined';
  $telemetry.setKey('backend', `${backend} · ${useWorker ? 'worker+SAB' : 'main-thread'}`);

  // GPU compute is the capable default on the WebGPU backend (far more particles, smoother). The
  // WebGL2 fallback can't run TSL compute passes, so it stays on the CPU path there. Listeners
  // aren't attached yet, so this just seeds the initial state; users can still toggle it off.
  if (backend === 'webgpu') $global.setKey('gpuCompute', true);

  const scene = new THREE.Scene();
  scene.background = theme.background;
  const { camera, controls } = createCamera(canvas);
  const floatingOrigin = new FloatingOrigin();

  // --- smooth macro→micro focus tracking (NFR-2.2) ---
  // Log-space distance interpolation preserves the view direction while flying to frame a group.
  const focus = {
    active: false,
    t: 0,
    dur: 0.7,
    fromT: new THREE.Vector3(),
    toT: new THREE.Vector3(),
    fromD: 1,
    toD: 1,
    dir: new THREE.Vector3(),
  };
  const _focusCenter = new THREE.Vector3();
  const _focusTmp = new THREE.Vector3();
  const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

  function focusOn(center: THREE.Vector3, radius: number): void {
    focus.fromT.copy(controls.target);
    focus.toT.copy(center);
    focus.fromD = camera.position.distanceTo(controls.target);
    const margin = 1.7;
    focus.toD = Math.max(0.01, (radius * margin) / Math.tan(((camera.fov * Math.PI) / 180) / 2));
    focus.dir.copy(camera.position).sub(controls.target).normalize();
    if (focus.dir.lengthSq() === 0) focus.dir.set(0, 0, 1);
    focus.t = 0;
    focus.active = true;
  }

  function updateFocus(dt: number): void {
    if (!focus.active) return;
    focus.t = Math.min(1, focus.t + dt / focus.dur);
    const e = easeInOut(focus.t);
    _focusTmp.copy(focus.fromT).lerp(focus.toT, e);
    const d = Math.exp(Math.log(focus.fromD) * (1 - e) + Math.log(focus.toD) * e);
    controls.target.copy(_focusTmp);
    camera.position.copy(_focusTmp).addScaledVector(focus.dir, d);
    if (focus.t >= 1) focus.active = false;
  }

  async function makeDriver(): Promise<SimDriver> {
    const id = $archetypeId.get();
    // Sphere-traced fractals never run as a point sim: hand back an inert driver so the worker is
    // never asked to instantiate one, while keeping `driver` non-null for the rest of bootstrap.
    if (isRaymarch(id)) return new NullDriver(id, getFactory(id).label);
    const g = $global.get();
    const p = $params.get();
    return useWorker
      ? WorkerDriver.create(id, p, g.dt, g.particleCount, SEED, g.trailLength)
      : new MainThreadDriver(id, p, g.dt, g.particleCount, SEED);
  }

  let driver = await makeDriver();
  driver.setTrailLength($global.get().trailLength);
  let posArray = new Float32Array(driver.particleCount * 3);
  let cloud: PointCloud = createPointCloud(posArray, driver.colors, {
    geometry: 'points',
    pointSize: driver.pointSize,
  });
  let trailCloud: TrailCloud = makeTrailCloud();
  scene.add(cloud.points);
  scene.add(trailCloud.group);
  $hierarchy.set(driver.hierarchy);

  function makeTrailCloud(): TrailCloud {
    const tc = createTrailCloud(driver.trailRing(), driver.particleCount, driver.trailSlots(), driver.colors, driver.pointSize);
    tc.refreshAll();
    tc.setVisible($global.get().trailLength > 0);
    return tc;
  }

  // --- experimental GPU-compute mode (attractors only), isolated from the CPU pipeline ---
  let gpuSim: GpuSim | null = null;
  function gpuRequested(): boolean {
    return $global.get().gpuCompute && hasGpu($archetypeId.get());
  }
  function teardownGpu(): void {
    if (!gpuSim) return;
    scene.remove(gpuSim.points);
    gpuSim.dispose();
    gpuSim = null;
  }
  async function setupGpu(): Promise<void> {
    teardownGpu();
    const id = $archetypeId.get();
    if (!hasGpu(id)) return;
    const g = $global.get();
    try {
      const sim = createGpu(id, g.particleCount, g.dt, $params.get());
      scene.add(sim.points);
      if (sim.init) await renderer.computeAsync(sim.init);
      gpuSim = sim;
    } catch (err) {
      console.error('[ethersim] GPU compute init failed — reverting to CPU', err);
      $global.setKey('gpuCompute', false);
    }
  }
  // --- sphere-traced 3D fractals: a full-screen distance-estimator pass, orbited by the camera ---
  let raymarch: RaymarchPass | null = null;
  function teardownRaymarch(): void {
    if (!raymarch) return;
    scene.remove(raymarch.mesh);
    raymarch.dispose();
    raymarch = null;
  }
  function setupRaymarch(): void {
    teardownRaymarch();
    const id = $archetypeId.get();
    const sys = RAYMARCH_SYSTEMS[id];
    if (!sys) return;
    try {
      raymarch = createRaymarch(sys, backend);
      raymarch.setParams($params.get());
      scene.add(raymarch.mesh);
      // frame the fractal: target origin, pull the camera back to a sensible distance
      controls.target.set(0, 0, 0);
      camera.position.set(0.55, 0.42, 1).normalize().multiplyScalar(raymarch.cameraDistance);
      controls.update();
    } catch (err) {
      console.error('[ethersim] raymarch init failed', err);
      teardownRaymarch();
    }
  }

  // Toggle visibility/driver between CPU, GPU, and raymarch paths without tearing down the pipeline.
  function applyMode(): void {
    if (isRaymarch($archetypeId.get())) {
      driver.setPaused(true);
      cloud.points.visible = false;
      trailCloud.setVisible(false);
      teardownGpu();
      if (!raymarch) setupRaymarch();
      $telemetry.setKey('backend', `${backend} · raymarch`);
      return;
    }
    teardownRaymarch();
    const useGpu = gpuRequested();
    driver.setPaused(useGpu ? true : paused);
    cloud.points.visible = !useGpu;
    trailCloud.setVisible(!useGpu && $global.get().trailLength > 0);
    if (useGpu) {
      if (!gpuSim) void setupGpu();
    } else {
      teardownGpu();
    }
    $telemetry.setKey('backend', `${backend} · ${useGpu ? 'GPU compute' : useWorker ? 'worker+SAB' : 'main-thread'}`);
  }

  // --- rebuild (archetype or particle-count change), serialized + atomically swapped ---
  let chain: Promise<void> = Promise.resolve();
  let rebuildQueued = false;
  function scheduleRebuild(): void {
    if (rebuildQueued) return;
    rebuildQueued = true;
    queueMicrotask(() => {
      rebuildQueued = false;
      chain = chain.then(doRebuild).catch((err) => console.error('[ethersim] rebuild failed', err));
    });
  }
  async function doRebuild(): Promise<void> {
    const next = await makeDriver();
    next.setTrailLength($global.get().trailLength);
    const nextPos = new Float32Array(next.particleCount * 3);
    const nextCloud = createPointCloud(nextPos, next.colors, {
      geometry: 'points',
      pointSize: next.pointSize,
    });
    const oldDriver = driver;
    const oldCloud = cloud;
    const oldTrail = trailCloud;
    // Atomic swap (synchronous — the render loop cannot interleave here).
    driver = next;
    posArray = nextPos;
    cloud = nextCloud;
    trailCloud = makeTrailCloud();
    scene.remove(oldCloud.points);
    scene.remove(oldTrail.group);
    scene.add(cloud.points);
    scene.add(trailCloud.group);
    oldDriver.dispose();
    oldCloud.dispose();
    oldTrail.dispose();
    $hierarchy.set(driver.hierarchy);
    $selectedNode.set(null); // clear selection/highlight for the new archetype
    teardownGpu(); // force a fresh GPU sim for the new archetype / particle count
    teardownRaymarch(); // force a fresh raymarch pass (e.g. switching between 3D fractals)
    applyMode(); // re-establish raymarch vs GPU vs CPU
    // The Kármán field is a flat horizontal sheet — frame it near top-down (the classic CFD view).
    if ($archetypeId.get() === 'karman') {
      controls.target.set(0, 0, 0);
      camera.position.set(0, 3.2, 0.85);
      controls.update();
    }
    scheduleLle();
  }

  // --- in-app Lyapunov validation (attractors only), off the critical path ---
  function scheduleLle(): void {
    const id = $archetypeId.get();
    const system = SYSTEMS[id];
    if (!system) {
      $telemetry.setKey('lle', NaN);
      return;
    }
    window.setTimeout(() => {
      if ($archetypeId.get() !== id) return; // archetype changed meanwhile
      const lle = largestLyapunov(system, resolveParams($params.get(), $global.get().dt), {
        intervals: 700,
        transient: 1500,
      });
      $telemetry.setKey('lle', lle);
    }, 350);
  }
  scheduleLle();

  // --- store subscriptions (.listen = no initial fire) ---
  let lastCount = $global.get().particleCount;
  let lastTrail = $global.get().trailLength;
  let lastGpu = $global.get().gpuCompute;
  $archetypeId.listen(() => scheduleRebuild());
  $global.listen((g) => {
    driver.setParams($params.get(), g.dt);
    gpuSim?.setParams({ dt: g.dt });
    if (g.trailLength !== lastTrail) {
      lastTrail = g.trailLength;
      driver.setTrailLength(g.trailLength);
      if (!gpuSim) trailCloud.setVisible(g.trailLength > 0);
    }
    if (g.gpuCompute !== lastGpu) {
      lastGpu = g.gpuCompute;
      applyMode();
    }
    if (g.particleCount !== lastCount) {
      lastCount = g.particleCount;
      scheduleRebuild();
    }
  });
  $params.listen((p) => {
    driver.setParams(p, $global.get().dt);
    gpuSim?.setParams({ ...p, dt: $global.get().dt });
    raymarch?.setParams(p);
    scheduleLle();
  });

  // --- resize ---
  function resize(): void {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // --- render loop (decoupled from the sim) ---
  const timer = new THREE.Timer();
  // NB: intentionally not calling timer.connect(document) — the Page Visibility API would
  // freeze the clock (and the main-thread fallback sim) whenever the page reports hidden.
  // The Math.min clamp below handles large deltas after a tab switch.
  let paused = false;
  let frames = 0;
  let windowStart = 0;

  applyMode(); // establish CPU (default) or GPU path now that `paused` exists

  renderer.setAnimationLoop(() => {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05); // clamp residual large deltas

    if (raymarch) {
      if (!paused) raymarch.update(timer.getElapsed()); // drive shader animation (frozen while paused)
    } else if (gpuSim) {
      if (!paused) {
        for (let s = 0; s < gpuSim.substeps; s++) {
          for (const pass of gpuSim.steps) renderer.compute(pass); // submitted, not awaited
        }
      }
    } else {
      if (!paused) driver.pump(dt);
      floatingOrigin.rebase(driver.source(), posArray); // anchor = 0 (identity copy) in P1
      cloud.posAttr.needsUpdate = true;
      if (trailCloud.group.visible) trailCloud.update(driver.trailHead());
    }
    updateFocus(dt);
    controls.update();
    renderer.render(scene, camera);

    frames++;
    const now = timer.getElapsed();
    if (now - windowStart >= 0.25) {
      $telemetry.setKey('fps', frames / (now - windowStart));
      $telemetry.setKey('particles', gpuSim ? gpuSim.particleCount : driver.particleCount);
      $telemetry.setKey('substeps', gpuSim ? gpuSim.substeps : driver.substeps());
      $telemetry.setKey('camPos', [camera.position.x, camera.position.y, camera.position.z]);
      $telemetry.setKey('camTarget', [controls.target.x, controls.target.y, controls.target.z]);
      frames = 0;
      windowStart = now;
    }
  });

  // --- snapshot ---
  function cameraSnapshot(): SnapshotCamera {
    return {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
      zoomDecade: 0,
      fov: camera.fov,
      logarithmicDepth: false,
    };
  }

  const engine: Engine = {
    backend,
    exportSnapshot(): Snapshot {
      return buildSnapshot({
        archetypeId: driver.archetypeId,
        particleCount: driver.particleCount,
        dt: $global.get().dt,
        trailLength: $global.get().trailLength,
        archetypeParams: $params.get(),
        hierarchy: driver.hierarchy,
        camera: cameraSnapshot(),
        frameIndex: driver.frameIndex(),
        seed: SEED,
      });
    },
    importSnapshot(snap: Snapshot): void {
      $global.set({
        dt: snap.global.dt,
        particleCount: snap.particleCount,
        trailLength: snap.global.trailLength ?? $global.get().trailLength,
        gpuCompute: $global.get().gpuCompute,
      });
      $params.set({ ...snap.archetypeParams });
      $archetypeId.set(snap.archetypeId); // triggers rebuild via listeners
      const [px, py, pz] = snap.camera.position;
      const [tx, ty, tz] = snap.camera.target;
      camera.position.set(px, py, pz);
      controls.target.set(tx, ty, tz);
      controls.update();
    },
    setCamera(position, target) {
      camera.position.set(position[0], position[1], position[2]);
      controls.target.set(target[0], target[1], target[2]);
      controls.update();
    },
    async captureImageBlob(): Promise<Blob> {
      // Render the current view into an offscreen target (the WebGPU swap-chain isn't readable),
      // sRGB so it matches the screen, then composite a branded overlay and embed the snapshot.
      const sizeV = new THREE.Vector2();
      renderer.getDrawingBufferSize(sizeV);
      const w = Math.max(1, sizeV.x | 0);
      const h = Math.max(1, sizeV.y | 0);
      const rt = new THREE.RenderTarget(w, h);
      rt.texture.colorSpace = THREE.SRGBColorSpace;
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(rt);
      await renderer.renderAsync(scene, camera);
      const buf = (await renderer.readRenderTargetPixelsAsync(rt, 0, 0, w, h)) as Uint8Array;
      renderer.setRenderTarget(prev);
      rt.dispose();

      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext('2d');
      if (!ctx) throw new Error('2D canvas context unavailable');
      const img = ctx.createImageData(w, h);
      // WebGPU pads each readback row to a 256-byte boundary; WebGL2 packs tightly. Detect which,
      // then copy each row from its real (padded) source offset — otherwise rows drift and shear.
      const stride = buf.length === w * h * 4 ? w * 4 : Math.ceil((w * 4) / 256) * 256;
      for (let r = 0; r < h; r++) {
        const src = (h - 1 - r) * stride; // flip Y (readback is bottom-up)
        img.data.set(buf.subarray(src, src + w * 4), r * w * 4);
      }
      ctx.putImageData(img, 0, 0);

      // --- overlay: ETHERSIM + version (bottom-left), system/params/camera (bottom-right) ---
      const id = driver.archetypeId;
      const label = getFactory(id).label;
      const p = $params.get();
      const paramStr = Object.entries(p)
        .slice(0, 5)
        .map(([k, v]) => `${k} ${(+v).toFixed(2)}`)
        .join('   ');
      const cam = `cam ${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}`;
      const fs = Math.max(11, Math.round(h * 0.016));
      const pad = Math.round(h * 0.03);
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = fs * 0.5;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.font = `600 ${Math.round(fs * 1.5)}px ui-monospace, "SF Mono", Menlo, monospace`;
      ctx.fillStyle = 'rgba(120,232,220,0.95)';
      ctx.fillText('ETHERSIM', pad, h - pad - fs * 1.3);
      ctx.font = `${Math.round(fs * 0.85)}px ui-monospace, monospace`;
      ctx.fillStyle = 'rgba(200,220,240,0.6)';
      ctx.fillText(`v${APP_VERSION}  ·  ethersim.ai`, pad, h - pad);
      ctx.textAlign = 'right';
      ctx.font = `${Math.round(fs * 1.1)}px ui-monospace, monospace`;
      ctx.fillStyle = 'rgba(225,238,252,0.9)';
      ctx.fillText(label, w - pad, h - pad - fs * 2.6);
      ctx.font = `${Math.round(fs * 0.85)}px ui-monospace, monospace`;
      ctx.fillStyle = 'rgba(185,205,228,0.65)';
      ctx.fillText(paramStr, w - pad, h - pad - fs * 1.3);
      ctx.fillText(cam, w - pad, h - pad);

      // PNG → embed the full snapshot as a tEXt chunk (the image alone can recreate the sim).
      const blob: Blob = await new Promise((res) => cv.toBlob((b) => res(b as Blob), 'image/png'));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const withMeta = embedText(bytes, 'ethersim', JSON.stringify(this.exportSnapshot()));
      return new Blob([withMeta as unknown as BlobPart], { type: 'image/png' });
    },
    async exportImage(): Promise<void> {
      const blob = await this.captureImageBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ethersim-${driver.archetypeId}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    },
    togglePause(): boolean {
      paused = !paused;
      driver.setPaused(paused);
      $paused.set(paused); // mirror to the store so demo cycling halts while frozen + the HUD reflects it
      return paused;
    },
    // Pan the view (translate camera + orbit target together) without rotating. dx/dy are screen
    // directions in [-1,1]; the step scales with zoom distance so it feels consistent. Used by the
    // arrow keys to nudge the framing — handy when the Learn panel overlaps the sim.
    panView(dx: number, dy: number): void {
      camera.updateMatrixWorld();
      const dist = Math.max(0.001, camera.position.distanceTo(controls.target));
      const step = dist * 0.05;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
      const move = right.multiplyScalar(dx * step).add(up.multiplyScalar(dy * step));
      camera.position.add(move);
      controls.target.add(move);
      controls.update();
    },
    reset(): void {
      scheduleRebuild();
    },
    highlightParticles(start: number | null, count: number): void {
      cloud.highlight(start, count);
    },
    focusNode(start: number | null, count: number): void {
      if (start === null || count <= 0) return;
      const pos = driver.source();
      const end = start + count;
      let cx = 0;
      let cy = 0;
      let cz = 0;
      for (let i = start; i < end; i++) {
        const o = i * 3;
        cx += pos[o];
        cy += pos[o + 1];
        cz += pos[o + 2];
      }
      cx /= count;
      cy /= count;
      cz /= count;
      let r2 = 0;
      for (let i = start; i < end; i++) {
        const o = i * 3;
        const dx = pos[o] - cx;
        const dy = pos[o + 1] - cy;
        const dz = pos[o + 2] - cz;
        const d = dx * dx + dy * dy + dz * dz;
        if (d > r2) r2 = d;
      }
      _focusCenter.set(cx, cy, cz);
      focusOn(_focusCenter, Math.max(Math.sqrt(r2), 0.05));
    },
  };

  $engine.set(engine);
  return engine;
}

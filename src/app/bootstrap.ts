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
import { createGpu, hasGpu, type GpuSim } from '../gpu';
import { detectCapabilities } from './capabilities';
import type { Engine } from './engine';
import { $archetypeId, $engine, $global, $hierarchy, $params, $selectedNode, $telemetry } from '../ui/store';

const SEED = 1;

// Composition root: wires capabilities → renderer → sim driver → render loop → UI store.
export async function bootstrap(canvas: HTMLCanvasElement): Promise<Engine> {
  registerArchetypes();

  const caps = await detectCapabilities();
  const { renderer, backend } = await createRenderer(canvas);
  const useWorker = caps.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined';
  $telemetry.setKey('backend', `${backend} · ${useWorker ? 'worker+SAB' : 'main-thread'}`);

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
  // Toggle visibility/driver between CPU and GPU paths without tearing down the CPU pipeline.
  function applyMode(): void {
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
    applyMode(); // re-establish GPU vs CPU
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

    if (gpuSim) {
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
    togglePause(): boolean {
      paused = !paused;
      driver.setPaused(paused);
      return paused;
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

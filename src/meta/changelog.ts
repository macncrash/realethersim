// ETHERSIM release history — the single source of truth for the in-app "What's New" popup and the
// About panel's version list. Each release lists the system ids it FIRST introduced (deep-linkable
// from the What's New cards) plus short notes for non-system changes. Reconstructed from git history;
// every one of the registered systems appears in exactly one release (verified). Newest-first.
//
// When you ship a new release: add a new entry at the TOP with the bumped version (matching
// src/version.ts), today's date, the new system ids, and any feature notes — then the What's New
// popup auto-shows it once per visitor (it compares APP_VERSION against a locally-stored last-seen).

export interface Release {
  version: string; // semver patch, matches src/version.ts (e.g. "0.1.33")
  date: string; // ISO date YYYY-MM-DD
  title: string; // short human headline
  summary: string; // 1-2 sentence blurb
  newSystems: string[]; // archetype ids first registered in this release (exact ids; deep-linkable)
  notes: string[]; // non-system changes (features/fixes), shown as bullets
}

export const RELEASES: Release[] = [
  {
    "version": "0.1.59",
    "date": "2026-07-02",
    "title": "Deep time — the sim clock",
    "summary": "Simulations now carry a physical clock: the telemetry panel shows honest elapsed time in real units. The Galaxy Collision is calibrated to the published Andromeda timeline — watch 'T + 4.3 Gyr' tick past as the disks first graze — and its encounter now runs to completion (merger + billions of years of remnant relaxation) before replaying.",
    "newSystems": [],
    "notes": [
      "Sim clock: any system can declare a physical time scale (factory.clock) and the telemetry panel shows 'sim time: T + … ' live — synced exactly to the integrator's fixed steps, pause- and speed-aware",
      "Galaxy Collision: calibrated to real gigayears (first Milky Way–Andromeda passage anchored at ≈4.3 Gyr, per van der Marel et al.); the encounter arc extended through the merger and long post-merger relaxation before replay; default pacing slowed so the eons read as eons"
    ]
  },
  {
    "version": "0.1.58",
    "date": "2026-07-01",
    "title": "Bioluminescence — the ocean answers",
    "summary": "Three living-light systems: a bioluminescent bay where invisible swimmers trail wakes of flashing dinoflagellates, a ctenophore whose rainbow is diffraction (not glow), and a jellyfish fountain of real Verlet-rope tendrils — ETHERSIM's first constraint-dynamics system.",
    "newSystems": ["bioBay", "combJelly", "jellyfishFountain"],
    "notes": [
      "Bioluminescent Bay (Life): dinoflagellate stimulus–response — invisible swimmers roam a dark bay and the water answers, wakes of cyan flashes blooming, diffusing and sinking into ambient sea-sparkle. After the bio bays of Vieques, Puerto Rico",
      "Comb Jelly (Life): eight comb rows as travelling rainbow point-trains — the metachronal diffraction wave of a real ctenophore (structural colour, not bioluminescence), on a glassy tumbling body",
      "Jellyfish Fountain (Life): a dome of tendrils, each a position-based Verlet rope pinned to a beating crown ring — pulses kick the dome outward and gravity settles it back"
    ]
  },
  {
    "version": "0.1.57",
    "date": "2026-07-01",
    "title": "Lightning — stepped leader & return stroke",
    "summary": "A full lightning strike as a dynamical system: a branching stepped leader crackles down from the cloud, the first branch to touch ground fires a white-hot return stroke UP the winning channel, the bolt decays, and a fresh tree grows — every strike different.",
    "newSystems": ["lightning"],
    "notes": [
      "Lightning (Plasma): dielectric-breakdown growth (the DLA family) with the real event cycle — stepped leader reveal, ground attachment, upward return stroke with per-frame crackle, decay, restrike. Live branchiness / wander / strike-rate; built to blaze under the new HDR bloom"
    ]
  },
  {
    "version": "0.1.56",
    "date": "2026-07-01",
    "title": "HDR bloom — everything glows",
    "summary": "A real HDR bloom post pass on the renderer: bright regions now bloom into soft halos, so every one of the 187 systems — and every screenshot, clip, and thumbnail — gets the luminous look of the reference art. The whole gallery has been re-rendered with it.",
    "newSystems": [],
    "notes": [
      "HDR bloom post-processing (TSL BloomNode) on the WebGPU renderer — the live view, screenshots, clips AND thumbnails all composite through it; per-system strength is tunable and ?bloom=0 disables it",
      "All 187 gallery thumbnails regenerated with the new look",
      "Fixed a subtle capture bug: offscreen renders (thumbnails/clips) outside the animation loop reused a stale frame with post-processing active — the node frame is now advanced manually"
    ]
  },
  {
    "version": "0.1.55",
    "date": "2026-06-30",
    "title": "Galaxy Collision — Milky Way × Andromeda",
    "summary": "A real gravitational simulation of the Andromeda–Milky Way merger: two disks of stars swing past each other, throw out tidal tails and bridges, and spiral into a single elliptical — the Toomre restricted N-body model, integrated live.",
    "newSystems": ["galaxyCollision"],
    "notes": [
      "Galaxy Collision (Cosmology): the classic Toomre & Toomre (1972) restricted N-body encounter — two massive cores orbit and merge (via dynamical friction) while clouds of test stars, feeling both cores, get flung into tidal tails and bridges. Live mass-ratio / pericenter / inclination / friction / speed. An actual integrated simulation, not a baked shape"
    ]
  },
  {
    "version": "0.1.54",
    "date": "2026-06-30",
    "title": "Solar eruptions + a 3-D galaxy",
    "summary": "Two upgrades: the Sun now erupts (animated prominences + CMEs, not just rotation), and the spiral galaxy gained real 3-D depth — a spheroidal bulge, a flaring disk, and an inclined view.",
    "newSystems": [],
    "notes": [
      "Solar Corona: active sites now ERUPT on a staggered cycle — confined prominences that rise and fall back, and coronal mass ejections that escape — flung out as curved plasma jets. New 'eruptions' rate control",
      "Spiral Galaxy: no longer a flat sheet — a 3-D spheroidal bulge, a disk with a flaring scale height, and a tilted view so the depth reads"
    ]
  },
  {
    "version": "0.1.53",
    "date": "2026-06-30",
    "title": "The active Sun + a spiral galaxy",
    "summary": "Two pieces of real astrophysics: the Sun's corona built from its magnetic loop structure, and a spiral galaxy whose arms are density waves (why the arms don't wind up — and why their distances keep getting revised).",
    "newSystems": ["solarCorona", "spiralGalaxy"],
    "notes": [
      "Solar Corona (Plasma): the Sun in 171 Å EUV, built from magnetism not fluid — coronal loops arcing between active-region footpoints in the sunspot latitude bands, a granular surface, polar plumes, a glowing limb, and slow rotation",
      "Spiral Galaxy (Cosmology): a density-wave spiral — stars on precessing elliptical orbits crowd into two arms and flow through them while the pattern turns at its own speed, with a central bar/bulge and pink star-forming knots. The generative answer to the 'winding problem'"
    ]
  },
  {
    "version": "0.1.52",
    "date": "2026-06-30",
    "title": "Moiré illusion + attractor swarms",
    "summary": "A barrier-grid moiré that reads as rotation, and two scatters of tumbling strange-attractor 'butterflies' (all-Lorenz, or a mixed menagerie). Plus: the Bloom piece is now the generic 'Ink Bloom'.",
    "newSystems": ["moire", "lorenzSwarm", "attractorMenagerie"],
    "notes": [
      "Moiré Grid (Linework): a fixed radial hash grating XOR'd with a sliding vertical barrier — the interference rosette sweeps as illusory rotation, though nothing actually turns. Live hashes / barrier density / speed",
      "Lorenz Butterfly Swarm (Attractor): a scatter of Lorenz attractors, each baked into a butterfly and tumbling on its own axis — a nod to the butterfly effect (and Sagan's butterflies who 'flutter for a day')",
      "Attractor Menagerie (Attractor): the same swarm across a mix of species — Lorenz, Rössler, Aizawa, Thomas, Halvorsen — to show the variety of bounded chaos",
      "Renamed 'Seedform' → 'Ink Bloom' and made it a generic watercolour/ink-diffusion piece (removed the prior artist attribution at the artist's request)"
    ]
  },
  {
    "version": "0.1.51",
    "date": "2026-06-30",
    "title": "Jellyfish Bloom — bioluminescence in the deep",
    "summary": "A drifting swarm of bioluminescent jellyfish: pulsing translucent bells trailing luminous tentacles, in cool living-light blues and violets over the abyss.",
    "newSystems": ["jellyfishBloom"],
    "notes": [
      "Jellyfish Bloom (Bloom): a per-pixel swarm of glowing medusae — each an elliptical bell (luminous rim + soft fill) pulsing in anti-phase (the jellyfish jet) with wavy tentacles, drifting over an abyssal gradient flecked with marine snow. Live glow / pulse / drift / hue"
    ]
  },
  {
    "version": "0.1.50",
    "date": "2026-06-30",
    "title": "Four new systems: light, lensing & a dandelion",
    "summary": "An optics-and-nature batch: a gravitational lens bending a starfield into an Einstein ring, two diffraction pieces (crossed-grating spokes and a dispersive wavefront), and a Fibonacci-packed dandelion blowball.",
    "newSystems": ["gravLens", "crossedDiffraction", "dispersionWave", "dandelion"],
    "notes": [
      "Gravitational Lens (Spacetime): a procedural sky bent by a point mass into an Einstein ring + arcs via the thin-lens map β=θ(1−rE²/|θ|²) — pure lensing, no disk/horizon (unlike the black-hole marcher). Live Einstein-radius / zoom / drift",
      "Crossed Diffraction (Spectral): white light through crossed gratings → a radiant lattice of spectral spokes (white zeroth order, blue→red within each diffraction order). After the OPN 'Image of the Week'",
      "Dispersion (Spectral): a point-source wavefront on a grainy domed bowl; crests propagate outward while the dispersed spectrum is baked by radius, so each crest recolours warm→cool as it travels. After hal09999",
      "Dandelion (Parametric): a blowball — seed stalks on a Fibonacci (golden-angle) sphere, each tipped with a pappus puff; the same packing nature uses for sunflower phyllotaxis"
    ]
  },
  {
    "version": "0.1.49",
    "date": "2026-06-30",
    "title": "Three new systems: string worldsheet, Stokes phase, Ink Bloom",
    "summary": "A daily-adds trio spanning physics and art: the 2-D sheet a relativistic string sweeps through spacetime, the saddle-point landscape behind the Stokes phenomenon, and a watercolour ink-bloom that opens a new Bloom category.",
    "newSystems": ["stringWorldsheet", "stokesPhase", "inkBloom"],
    "notes": [
      "String Worldsheet (Parametric): a vibrating string (sum of standing-wave harmonics, open or closed) swept through a static spacetime grid by retarded time — the present edge leads and its past trails, so the worldsheet flows. Live harmonics/tension/amplitude/sweep/window",
      "Stokes Phase Surface (Spectral): the cubic phase Φ=z³/3−sz as a 3-D monkey-saddle terrain, with the steepest-descent contours through its two saddles lit warm/cool — sweep arg(s) to cross the Stokes lines where a saddle's contribution switches on",
      "Ink Bloom (Bloom): a soft watercolour bloom of overlapping translucent pigment lobes (subtractive ink layering, so overlaps deepen to an inky heart)",
      "New 'Bloom' category (generative botanical / watercolour pieces)"
    ]
  },
  {
    "version": "0.1.48",
    "date": "2026-06-30",
    "title": "Capture Clip — share the motion (WebM + GIF)",
    "summary": "A new 'Clip ↗' export records a few seconds of the live animation as a WebM video and an animated GIF — because a still frame can't show the 3D motion. Watermarked and ready to post.",
    "newSystems": [],
    "notes": [
      "New 'Clip ↗' button (Snapshot controls): records ~5s of the live view and downloads BOTH a WebM (MediaRecorder) and an animated GIF (in-browser via gifenc), each watermarked (ETHERSIM · ethersim.ai · system) — a motion-faithful share asset a screenshot can't be",
      "Capture pauses the live loop for clean frames and renders at a compact clip resolution; everything is client-side (nothing uploaded)"
    ]
  },
  {
    "version": "0.1.47",
    "date": "2026-06-29",
    "title": "Contour Field — a new Linework category",
    "summary": "Morphing contour-line art (after Zach Lieberman): nested isolines of a folded, symmetric wave field, drawn as crisp white level-sets on black. Opens a new Linework category for generative line drawing.",
    "newSystems": ["contourField"],
    "notes": [
      "Contour Field (Linework): per-pixel level sets of an interference field — mirror-folded for crisp 4-fold symmetry, domain-warped for an organic quasi-3D drift, fwidth-anti-aliased lines. Live contours / warp / line-weight / zoom / morph",
      "New 'Linework' category (generative line-art / contour drawing)"
    ]
  },
  {
    "version": "0.1.46",
    "date": "2026-06-29",
    "title": "Three new systems: Newton fractal, root cloud, cymatics",
    "summary": "A daily-adds trio inspired by math art in the wild: polynomiography's flowing n-fold basins, Simone Conradi's polynomial-root clouds, and the standing-wave geometry of cymatics.",
    "newSystems": ["newtonFractal", "polynomialRoots", "cymatics"],
    "notes": [
      "Newton Fractal (Conformal): per-pixel basins of Newton's method for zⁿ−1 — flowing n-fold-symmetric ribbons, coloured by which root each point reaches and how long it took. Live fold/over-relaxation/zoom/morph",
      "Polynomial Root Cloud (Sampler): scatters the complex roots of thousands of random ±1 (Littlewood) or {−1,0,1} (Bohemian) polynomials, found via Durand–Kerner — the iconic fractal feather hugging the unit circle (after Simone Conradi's 40-million-root pieces)",
      "Cymatic Plate (Field): a Faraday-wave superposition of the circular eigenmode band near a drive frequency — dense shimmering interference rosettes, distinct from the single-mode Chladni drumhead",
      "Refactor: the Bessel-function helpers are now a shared module (src/archetypes/bessel.ts) used by both drumhead and cymatics"
    ]
  },
  {
    "version": "0.1.45",
    "date": "2026-06-29",
    "title": "Engine upgrade — Three.js r185",
    "summary": "ETHERSIM's WebGPU/TSL engine moves up to Three.js r185. A full 169-system smoke test — every family, on both the WebGPU and WebGL2-fallback backends — confirmed pixel-faithful parity, so nothing changes on screen; the upgrade just keeps us current on perf and TSL features.",
    "newSystems": [],
    "notes": [
      "Upgraded three.js r184 → r185 (WebGPU renderer + TSL node materials + GPU-compute). Verified: all 169 systems render correctly, GPU-compute attractors/maps/fields intact, raymarch surfaces/fractals/volumes intact, additive-blend glow at parity (no premultiplied-alpha regression), WebGL2 fallback OK",
      "Silenced a benign r185 TSL console warning on raymarch systems — wrapped an inline If() callback in braces so it no longer hands TSL an implicit return"
    ]
  },
  {
    "version": "0.1.44",
    "date": "2026-06-28",
    "title": "Symmetric icons gain depth",
    "summary": "The six symmetric-icon maps now sit on a radial 3D relief — depth that preserves their exact N-fold symmetry — completing the Map category's dimensionality. Plus an internal render-path cleanup.",
    "newSystems": [],
    "notes": [
      "Symmetric Icons (sanddollar, trinity, pentagram, hexagon, heptagon, clamshell): a radial relief z=f(R) adds 3D depth while keeping the N-fold rosette symmetry exact (CPU + GPU twins)",
      "Modernized the offline thumbnail/snapshot capture to renderer.render()/compute() (the deprecated renderAsync/computeAsync are gone — silences the console warning)"
    ]
  },
  {
    "version": "0.1.43",
    "date": "2026-06-28",
    "title": "Maps gain depth + Decaying Spiral reborn",
    "summary": "The attractor-image iterated maps now drape over a 3D relief so orbiting reveals real dimensionality, and the Decaying Spiral is rebuilt as a true 3D logarithmic funnel-coil. Canonical phase portraits (Hénon, Ikeda, the symmetric icons…) stay authentically flat.",
    "newSystems": [],
    "notes": [
      "Iterated maps: Clifford, de Jong, Svensson, Hopalong, Gumowski–Mira, Bedhead, King's Dream, Sprott Quadratic, Duffing, Gingerbreadman, Martin now drape over a 3D height-field relief (CPU + GPU twins); the face-on image is unchanged",
      "Left authentically 2D: Hénon, Lozi, Chirikov Standard, Zaslavsky, Tinkerbell, Ikeda, and the symmetric icons (their structure is only meaningful in the plane)",
      "Decaying Spiral: rebuilt as a genuine 3D logarithmic funnel-coil (uniform turns, exponentially-decaying radius, climbing) instead of a flat comet"
    ]
  },
  {
    "version": "0.1.42",
    "date": "2026-06-28",
    "title": "3D depth + fixes",
    "summary": "Several flat systems gain real 3D dimensionality when you orbit, DLA is fixed so its dendrite is actually visible, and the About panel scrollbar sits flush at the edge.",
    "newSystems": [],
    "notes": [
      "Magnetic Reconnection: extruded into a 3D current-sheet slab — the X-point null becomes a glowing X-line (opt-in guide-field helix on the jets)",
      "Fractal Flame: the chaos game lifted to a true 3D attractor (face-on flame preserved)",
      "Spiral of Theodorus: a shallow radial dome adds depth while the rosette still reads face-on",
      "Decaying Spiral: a 3D corrugation lifts the coil out of the plane",
      "DLA fix: the dendrite is pre-grown (frontier-launch + kill-radius) and framed from above, so it's immediately visible instead of an edge-on smudge; runs on the CPU path",
      "About panel: the vertical scrollbar now sits flush at the modal edge (no gap)"
    ]
  },
  {
    "version": "0.1.41",
    "date": "2026-06-28",
    "title": "Magnetic Reconnection",
    "summary": "A new Plasma category opens with the magnetic-reconnection X-point — blue field lines rush in, gold plasma jets blast out, and a blazing white null marks where they snap and splice.",
    "newSystems": [
      "reconnection"
    ],
    "notes": [
      "New Plasma category: reconnection — the X-point saddle flow v = (−αx, +βy) (streamfunction ψ = αxy); every particle a closed-form tracer, baked blue-inflow / gold-jet / white-null populations, jetBoost sets the outflow:inflow asymmetry"
    ]
  },
  {
    "version": "0.1.40",
    "date": "2026-06-28",
    "title": "Spiral of Theodorus",
    "summary": "Theodorus of Cyrene's 2,400-year-old √n staircase of right triangles, drift-deformed and mirrored into a glowing rotationally-symmetric flower of nested zigzag petals.",
    "newSystems": [
      "theodorus"
    ],
    "notes": [
      "theodorus (Parametric): the √n spiral of right triangles (vertex n at radius √n, angle Σ atan(1/√k)), drift-twisted + replicated M-fold into a flower; tube-swept per arm, coloured along the spectrum"
    ]
  },
  {
    "version": "0.1.39",
    "date": "2026-06-28",
    "title": "Cosmic Web",
    "summary": "A new Cosmology category opens with the largest structure that exists — watch a near-uniform universe fold into voids, filaments, and blazing cluster nodes via the Zel'dovich approximation.",
    "newSystems": [
      "cosmicWeb"
    ],
    "notes": [
      "New Cosmology category: cosmicWeb — Zel'dovich-approximation large-scale structure; particles ride frozen trajectories x = q + D·ψ(q) from one seeded Gaussian field, tinted by overdensity δ = −∇·ψ (void → filament → node)"
    ]
  },
  {
    "version": "0.1.38",
    "date": "2026-06-28",
    "title": "Pseudospectrum",
    "summary": "A new Spectral category opens with the resolvent-norm landscape of a non-normal matrix — eigenvalue cones rising from broad continents of near-instability that the eigenvalues alone never reveal.",
    "newSystems": [
      "pseudospectrum"
    ],
    "notes": [
      "New Spectral category: pseudospectrum — the height field 1/σ_min(zI−A) over the complex plane, exact closed form for a 2×2 non-normal A; |g| controls non-normality, drift wanders the eigenvalues"
    ]
  },
  {
    "version": "0.1.37",
    "date": "2026-06-27",
    "title": "Octic Node Lattice",
    "summary": "A new procedural algebraic surface — quartic axis-wells fused by a nodal-coupling term into a crystalline cell lattice, cropped to a sphere.",
    "newSystems": [
      "octicLattice"
    ],
    "notes": [
      "octicLattice (Surface): the implicit surface QxQyQz − 0.028(x²−y²)(y²−z²)(z²−x²) − 0.012xyz = 0, sphere-traced"
    ]
  },
  {
    "version": "0.1.36",
    "date": "2026-06-27",
    "title": "Fractal Flame",
    "summary": "The chaos game gains nonlinear variations — fractal flames, the glowing organic cousins of the Barnsley fern, with a seed to explore the family and N-fold symmetry.",
    "newSystems": [
      "fractalFlame"
    ],
    "notes": [
      "fractalFlame (Fractal): IFS chaos game + nonlinear variations (swirl, sinusoidal, horseshoe…), seed-selected with rotational symmetry"
    ]
  },
  {
    "version": "0.1.35",
    "date": "2026-06-27",
    "title": "Circular Chladni + Orbit Weave",
    "summary": "A circular drumhead (Bessel vibration modes) joins the Field family, and a new Orbital category opens with collective trajectories in a central well.",
    "newSystems": [
      "drumhead",
      "orbitWeave"
    ],
    "notes": [
      "drumhead: vibrating circular membrane — the Jₘ(λr)·cos(mθ) Bessel eigenmodes, mode picked by (n,m)",
      "New Orbital category: orbitWeave — closed elliptical orbits in a central harmonic potential, woven with long trails"
    ]
  },
  {
    "version": "0.1.34",
    "date": "2026-06-27",
    "title": "Vortex Funnel",
    "summary": "A draining-whirlpool funnel joins the Fluid family — a rippled surface that steepens into a glowing spiralling throat.",
    "newSystems": [
      "vortexFunnel"
    ],
    "notes": [
      "New Fluid system: a Rankine-vortex free surface with differential swirl and travelling ripples"
    ]
  },
  {
    "version": "0.1.33",
    "date": "2026-06-27",
    "title": "Three new families + in-app discoverability",
    "summary": "Adds a decay spiral, Chladni plate waves, and a kaleidoscope tunnel, plus a new in-app way to browse the whole catalog and read what changed.",
    "newSystems": [
      "decaySpiral",
      "chladniWave",
      "kaleidoTunnel"
    ],
    "notes": [
      "New: in-app What's New popup, Browse-all gallery, and About panel (license + attributions + version history)",
      "decaySpiral joins Parametric; chladniWave joins Field; kaleidoTunnel starts the Kaleidoscope category"
    ]
  },
  {
    "version": "0.1.32",
    "date": "2026-06-27",
    "title": "Conformal maps, Molecular Dynamics, HMC sampler",
    "summary": "Three new system families: complex-plane conformal maps, a molecular-dynamics crystal, and a Hamiltonian Monte Carlo sampler.",
    "newSystems": [
      "mobiusFlow",
      "inversion",
      "zSquared",
      "complexExp",
      "joukowskiMap",
      "crystal",
      "hmc"
    ],
    "notes": [
      "New Conformal category (Mobius flow, inversion, z-squared, complex exp, Joukowski)",
      "New Matter category (crystal) and Sampler category (HMC)"
    ]
  },
  {
    "version": "0.1.31",
    "date": "2026-06-27",
    "title": "Voxel Cloud volumetrics",
    "summary": "Adds a Voxel Cloud rendered with opt-in front-to-back occlusion volumetrics.",
    "newSystems": [
      "voxelCloud"
    ],
    "notes": [
      "Opt-in front-to-back occlusion volumetric path in the Volume category"
    ]
  },
  {
    "version": "0.1.30",
    "date": "2026-06-27",
    "title": "Dynamical billiard",
    "summary": "Adds a dynamical billiard with bounded specular reflection, opening the new Billiard category.",
    "newSystems": [
      "billiard"
    ],
    "notes": [
      "New Billiard category with bounded specular reflection"
    ]
  },
  {
    "version": "0.1.29",
    "date": "2026-06-27",
    "title": "Plasma Orb + Nebula volumetrics",
    "summary": "Two volumetric-emission raymarched systems start the new Volume category.",
    "newSystems": [
      "plasmaOrb",
      "nebula"
    ],
    "notes": [
      "New Volume category using volumetric-emission raymarching"
    ]
  },
  {
    "version": "0.1.28",
    "date": "2026-06-26",
    "title": "Gravitationally-lensed black hole",
    "summary": "Adds a gravitationally-lensed black hole as the first system in the new Spacetime raymarch category.",
    "newSystems": [
      "blackhole"
    ],
    "notes": [
      "New Spacetime category (raymarched gravitational lensing)"
    ]
  },
  {
    "version": "0.1.27",
    "date": "2026-06-26",
    "title": "Harmonograph + spherical Lissajous",
    "summary": "Two new parametric systems: a harmonograph and a spherical Lissajous curve.",
    "newSystems": [
      "harmonograph",
      "sphericalLissajous"
    ],
    "notes": [
      "Both added to the Parametric category"
    ]
  },
  {
    "version": "0.1.26",
    "date": "2026-06-26",
    "title": "Pendulum wave, Duffing, magnetic pendulum, K-S",
    "summary": "Four new systems spanning oscillators, driven chaos, and a reaction-diffusion field.",
    "newSystems": [
      "pendulumWave",
      "duffing",
      "magnetic-pendulum",
      "kuramotoSivashinsky"
    ],
    "notes": [
      "pendulumWave (Oscillator), duffing + magnetic-pendulum (Attractor), kuramotoSivashinsky (Field)"
    ]
  },
  {
    "version": "0.1.25",
    "date": "2026-06-26",
    "title": "One-shot install in the hero",
    "summary": "Surfaces the one-shot install flow directly in the landing hero.",
    "newSystems": [],
    "notes": [
      "Hero CTA now exposes the one-shot install command"
    ]
  },
  {
    "version": "0.1.24",
    "date": "2026-06-26",
    "title": "One-shot install UX + trust pages",
    "summary": "Adds a one-shot install experience and accompanying trust/info pages.",
    "newSystems": [],
    "notes": [
      "One-shot install UX",
      "Trust pages"
    ]
  },
  {
    "version": "0.1.23",
    "date": "2026-06-25",
    "title": "Demo interval slider",
    "summary": "Adds a demo interval slider and a fixed-width icon badge.",
    "newSystems": [],
    "notes": [
      "Demo interval slider",
      "Fixed-width icon badge"
    ]
  },
  {
    "version": "0.1.21",
    "date": "2026-06-25",
    "title": "Guide-geometry overlays + demo history",
    "summary": "Adds a guide-geometry overlay hook and prev/next history navigation in demo mode.",
    "newSystems": [],
    "notes": [
      "Guide-geometry overlay (factory.guides hook)",
      "Demo prev/next history"
    ]
  },
  {
    "version": "0.1.20",
    "date": "2026-06-25",
    "title": "Demo interactions: HUD + knob keys",
    "summary": "Demo mode gains a HUD, primary-knob key controls, and a pause split.",
    "newSystems": [],
    "notes": [
      "Demo HUD",
      "Primary-knob keyboard controls",
      "Pause split"
    ]
  },
  {
    "version": "0.1.19",
    "date": "2026-06-25",
    "title": "Demo screensaver mode",
    "summary": "Adds a screensaver-style demo with a details overlay, pause, and a Cmd-D shortcut.",
    "newSystems": [],
    "notes": [
      "Demo details overlay",
      "Pause + Cmd-D toggle"
    ]
  },
  {
    "version": "0.1.18",
    "date": "2026-06-25",
    "title": "Teal/orange palette + full-screen demo",
    "summary": "New teal/orange color palette and a full-screen demo mode.",
    "newSystems": [],
    "notes": [
      "Teal/orange palette",
      "Full-screen demo mode"
    ]
  },
  {
    "version": "0.1.17",
    "date": "2026-06-25",
    "title": "GPU twins for 4D conservative flows",
    "summary": "Adds vec4 GPU-compute twins for the 4D conservative-chaos flows.",
    "newSystems": [],
    "notes": [
      "vec4 GPU-compute kernels for the 4D conservative flows"
    ]
  },
  {
    "version": "0.1.16",
    "date": "2026-06-25",
    "title": "Conservative-chaos systems + deep-link sharing",
    "summary": "Adds conservative/Hamiltonian chaos systems and shareable URL deep links.",
    "newSystems": [
      "double-pendulum",
      "henon-heiles",
      "einstein-rosen"
    ],
    "notes": [
      "URL deep-link sharing",
      "double-pendulum + henon-heiles (Attractor), einstein-rosen (Parametric)"
    ]
  },
  {
    "version": "0.1.14",
    "date": "2026-06-24",
    "title": "Arrow-key view panning",
    "summary": "Adds arrow-key camera panning without rotation.",
    "newSystems": [],
    "notes": [
      "Arrow-key view panning (no rotation)"
    ]
  },
  {
    "version": "0.1.13",
    "date": "2026-06-24",
    "title": "Hearts-only favourites",
    "summary": "Simplifies favouriting to hearts-only and clarifies the share fallback.",
    "newSystems": [],
    "notes": [
      "Hearts-only favourites",
      "Clearer share fallback"
    ]
  },
  {
    "version": "0.1.12",
    "date": "2026-06-24",
    "title": "Keyboard shortcuts, sharing, feedback",
    "summary": "Adds keyboard shortcuts, social share, report-a-problem, and thumbs feedback.",
    "newSystems": [],
    "notes": [
      "Keyboard shortcuts",
      "Social share",
      "Report-a-problem",
      "Thumbs up/down feedback"
    ]
  },
  {
    "version": "0.1.11",
    "date": "2026-06-24",
    "title": "Gray-Scott + command palette & demo mode",
    "summary": "Adds the Gray-Scott reaction-diffusion field along with a command palette, demo mode, and a code viewer.",
    "newSystems": [
      "grayScottField"
    ],
    "notes": [
      "Command palette (Cmd-K)",
      "Demo mode",
      "Code viewer",
      "grayScottField joins the Field category"
    ]
  },
  {
    "version": "0.1.10",
    "date": "2026-06-24",
    "title": "Catalog surge: surfaces, maps & attractors to 136",
    "summary": "Four big batches add dozens of algebraic/minimal surfaces and parametric forms, then 13 more strange attractors and 13 more iterated maps, bringing the catalog to 136 systems.",
    "newSystems": [
      "barth",
      "dini",
      "goursat",
      "harmonic",
      "heart",
      "lissajous",
      "sunflower",
      "tanglecube",
      "torusknot",
      "boy",
      "breather",
      "cayley",
      "clebsch",
      "enneper",
      "fischerKoch",
      "hopf",
      "kuen",
      "kummer",
      "maurerRose",
      "orbital",
      "roman",
      "schwarzCLP",
      "astroidalEllipsoid",
      "catalan",
      "catenoidHelicoid",
      "dingDong",
      "henneberg",
      "lidinoid",
      "scherk",
      "sievert",
      "superToroid",
      "togliatti",
      "tooth",
      "toroidalSpiral",
      "whitneyUmbrella",
      "bohemianDome",
      "bourSurface",
      "cassini",
      "conicalSpiral",
      "crossCap",
      "decocube",
      "dupinCyclide",
      "endrassOctic",
      "monkeySaddle",
      "orthocircle",
      "pluckerConoid",
      "sphericalSpiral",
      "supershape3D",
      "lu",
      "chen-lee",
      "newton-leipnik",
      "burke-shaw",
      "rikitake",
      "shimizu-morioka",
      "rucklidge",
      "genesio-tesi",
      "arneodo",
      "finance",
      "sprott-b",
      "hindmarsh-rose",
      "sakarya",
      "icon-sanddollar",
      "icon-trinity",
      "icon-pentagram",
      "icon-hexagon",
      "icon-heptagon",
      "icon-clamshell",
      "gingerbreadman",
      "standard",
      "duffing-map",
      "kings-dream",
      "sprott-quadratic",
      "zaslavsky",
      "martin"
    ],
    "notes": [
      "+9, then +13, +13, +13 Surface/Parametric systems (algebraic & minimal surfaces, knots, phyllotaxis, harmonics, TPMS, cyclides, supershapes, Endrass octic)",
      "+13 strange attractors (Lu, Rikitake dynamo, Hindmarsh-Rose, etc.)",
      "+13 iterated maps (Field-Golubitsky symmetric icons + classic maps)",
      "README system count updated 42 to 136"
    ]
  },
  {
    "version": "0.1.5",
    "date": "2026-06-23",
    "title": "Surface & Parametric categories debut",
    "summary": "Introduces implicit isosurfaces (new Surface category) and a Parametric category seeded with the Fibonacci sphere and classic parametric surfaces.",
    "newSystems": [
      "chmutov",
      "gyroid",
      "neovius",
      "schoenIWP",
      "schwarzD",
      "schwarzP",
      "fibonacci",
      "klein",
      "mobius",
      "seashell",
      "superformula",
      "torus"
    ],
    "notes": [
      "New Surface category (gyroid, Schwarz P/D, Schoen I-WP, Neovius, Chmutov octic)",
      "New Parametric category (Fibonacci sphere + classics)",
      "Screenshot export, version & camera telemetry"
    ]
  },
  {
    "version": "0.1.3",
    "date": "2026-06-23",
    "title": "Oscillator synchrony + Kármán CFD",
    "summary": "Adds the Kuramoto synchronisation model, chimera states, and the Kármán vortex street CFD solver.",
    "newSystems": [
      "kuramoto",
      "chimera",
      "karman"
    ],
    "notes": [
      "Kuramoto + chimera (Oscillator)",
      "Karman vortex street Lattice-Boltzmann solver (Fluid), CPU + GPU",
      "GPU compute on by default; 3D relief for escape-time fractals"
    ]
  },
  {
    "version": "0.1.2",
    "date": "2026-06-22",
    "title": "3D fractals + 42nd system",
    "summary": "Adds a sphere-traced 3D fractal suite and the Lozi map, rounding the early catalog to 42 systems.",
    "newSystems": [
      "mandelbox",
      "mandelbulb",
      "menger",
      "qjulia",
      "lozi"
    ],
    "notes": [
      "3D sphere-traced fractals (Mandelbulb, Quaternion Julia, Mandelbox, Menger)",
      "Lozi map (the 42nd system)",
      "Standalone scrollytelling demo page"
    ]
  },
  {
    "version": "0.1.1",
    "date": "2026-06-22",
    "title": "Fractals, Lenia, DLA + Learn panel",
    "summary": "Adds the Fractal category (IFS chaos-game and escape-time), continuous-CA Lenia, diffusion-limited aggregation, and an in-app Learn panel.",
    "newSystems": [
      "barnsley-fern",
      "dragon",
      "sierpinski",
      "sierpinski-carpet",
      "mandelbrot",
      "julia",
      "burning-ship",
      "lenia",
      "dla"
    ],
    "notes": [
      "New Fractal category: IFS chaos-game (Barnsley fern, Sierpinski, dragon, carpet) + escape-time (Mandelbrot, Julia, Burning Ship)",
      "Lenia continuous CA (Field)",
      "Diffusion-limited aggregation",
      "In-app Learn panel (About / Math / Code), CPU + GPU paths"
    ]
  },
  {
    "version": "0.1.0b",
    "date": "2026-06-22",
    "title": "Emergent agents, fields & fluids",
    "summary": "Adds the Life category (Particle Life, Boids, slime mold) plus excitable-medium spiral waves and point-vortex flow.",
    "newSystems": [
      "particleLife",
      "boids",
      "slimeMold",
      "excitableMedium",
      "pointVortices"
    ],
    "notes": [
      "New Life category (Particle Life, Boids, Physarum slime mold) on a spatial-hash neighbor grid",
      "Excitable-medium spiral waves (Field) + point-vortex flow (Fluid)",
      "GPU compute kernels for maps, Life, Fluid and Field systems"
    ]
  },
  {
    "version": "0.1.0",
    "date": "2026-06-22",
    "title": "Initial release + catalog to 27",
    "summary": "First public build of ETHERSIM (the dynamical-systems visualizer) with four core archetypes, expanded the same day to 27 systems across attractor flows and iterated maps.",
    "newSystems": [
      "lorenz",
      "rossler",
      "aizawa",
      "thomas",
      "hyperOscillator",
      "nbody",
      "quantumFoam",
      "clifford",
      "de-jong",
      "svensson",
      "hopalong",
      "gumowski-mira",
      "tinkerbell",
      "ikeda",
      "henon",
      "bedhead",
      "pickover",
      "halvorsen",
      "chen",
      "dadras",
      "lorenz84",
      "rabinovich-fabrikant",
      "sprott-linz-f",
      "wang-four-wing",
      "bouali",
      "nose-hoover",
      "chua"
    ],
    "notes": [
      "Initial WebGPU engine: hyper-oscillator, N-body, quantum-foam, and strange-attractor archetypes (worker/SAB sim, fading trails, GPU-compute path, Lyapunov gate)",
      "Rename AETHER-SIM to ETHERSIM",
      "Expanded catalog to 27 systems: +10 attractor flows and +10 iterated maps",
      "GPU compute kernels for all 10 maps + restored GPU for all attractors"
    ]
  }
];

// The current/top release — what the "What's New" popup highlights by default.
export const LATEST_RELEASE: Release = RELEASES[0];

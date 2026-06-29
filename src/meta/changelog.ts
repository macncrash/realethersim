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

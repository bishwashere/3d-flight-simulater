# Coastal Flight Simulator

Desktop-first browser flight-simulator project built with React, TypeScript,
Tailwind CSS, Zustand, and Babylon.js. The current milestone is intentionally a
map-review build: choose Level 1 and explore a real airport environment with a
first-person flying camera. Aircraft physics come later.

## Current build

- Route-backed home (`/`), level selection (`/play`), and Level 1
  (`/game/level-1`)
- Babylon.js WebGPU startup with automatic WebGL2 fallback
- Local KSQL/San Carlos Airport terrain, satellite imagery, buildings, runway,
  taxiways, apron, roads, lagoon, and surrounding neighborhoods
- Pointer-lock mouse look and six-direction keyboard movement
- Mesh collisions, world bounds, pause, focus-loss handling, and clean reset
- Babylon GUI telemetry updated at 10 Hz
- Low, Medium, High, and custom performance settings persisted with Zustand and
  validated with Zod
- Local menu artwork plus synthesized UI and background audio
- No paid map service, runtime CDN, API key, or external token

## Controls

| Input | Action |
| --- | --- |
| Mouse | Look around after pointer lock |
| W / S or ↑ / ↓ | Move forward / backward |
| A / D or ← / → | Move left / right |
| Space / E | Rise |
| Ctrl / Q | Descend |
| Shift | Boost |
| R | Reset above the airport |
| P | Pause / resume |
| Escape | Release pointer lock, then pause |

## Performance

Open **Settings → Performance** before entering the map. Render distance controls
the camera range and fog. Render scale caps internal pixel density, shadows can
be disabled, and adaptive resolution moves toward the selected frame-rate target.
Babylon and the world assets are lazy-loaded only on the Level 1 route.

## Commands

Bun is recommended; Node.js 22.12+ with npm also works.

```bash
bun install
bun run dev -- --host 127.0.0.1 --port 6969
bun run typecheck
bun run lint
bun run test
bun run build
```

## Architecture

```text
src/
├── audio/                     # Reusable UI and ambience services
├── components/
│   ├── game/                  # React lifecycle shell for Babylon
│   ├── home/                  # Launcher presentation
│   ├── panels/                # Levels, settings, controls, credits
│   └── ui/                    # Reusable headless UI wrappers
├── game/
│   ├── world/                 # KSQL asset loader and world setup
│   ├── create-level-one-engine.ts
│   ├── create-level-one-scene.ts
│   ├── level-one-hud.ts
│   └── level-one-runtime.ts   # Camera, loop, bounds, telemetry
├── hooks/                     # React adapters for reusable services
├── state/                     # Zod-validated Zustand settings
└── app-router.tsx             # Browser routes and lazy game boundary

public/assets/world/
├── ASSET-SOURCES.md           # Source, license, adaptations, hashes
└── ksql-airport/              # Local GLB geometry and satellite texture
```

React owns menus and the engine lifecycle. Babylon owns camera state and all
per-frame rendering, so movement does not trigger React renders.

## Assets and licenses

- KSQL Airport by OpenRobotics and Cole Biesemeyer, adapted under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Exact source,
  changes, and checksums are in
  [`public/assets/world/ASSET-SOURCES.md`](public/assets/world/ASSET-SOURCES.md).
- Google Sans Flex via Fontsource: SIL Open Font License 1.1.
- Lucide icons: ISC, with Feather-derived icons under MIT terms.
- Menu key art was generated specifically for this project with OpenAI image
  generation. UI sounds and ambience are synthesized locally at runtime.

All Level 1 media is served by Vite from the repository.

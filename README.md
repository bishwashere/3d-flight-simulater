# Coastal Flight Simulator

Desktop-first geometric flight game built with React, TypeScript, Tailwind CSS,
Zustand, and Babylon.js. Level 1 is a compact coastal training course: start on
the runway, fly through the ordered checkpoint rings, and return for a safe
landing.

## Level 1

- Procedural island, airport, runway, hills, water, obstacles, and aircraft made
  from Babylon.js primitives
- Fixed-step 120 Hz aircraft simulation, independent from React rendering
- Ground roll, throttle, lift, drag, stalls, steering, braking, and crash checks
- Cockpit and chase cameras
- Optional collectible coins, slow airborne-time scoring, ordered checkpoint
  rewards, landing validation, crash reset, and level completion
- Babylon GUI flight HUD with live aircraft and course telemetry
- Procedural engine, wind, checkpoint, crash/fire, and success audio generated
  with the Web Audio API
- WebGPU when supported, with automatic WebGL2 fallback
- Low, Medium, and High performance presets persisted with Zustand and validated
  with Zod

No map service, API key, runtime CDN, or external Level 1 art/audio asset is
required.

## Controls

| Input | Action |
| --- | --- |
| I | Start engine |
| Shift / Ctrl | Increase / decrease throttle |
| W / S | Pitch control |
| A / D | Roll control |
| Q / E | Yaw / rudder control |
| B | Hold brakes |
| C | Switch cockpit / chase camera |
| R | Reset flight |
| P / Escape | Pause / resume |

Fly through every ring in order. After the final checkpoint, follow the runway
guidance, touch down gently inside the marked landing zone, and slow to complete
the level. A hard impact or obstacle collision crashes the aircraft; reset to
retry cleanly.

Coins are optional exploration rewards worth 25 points each. While genuinely
airborne, the aircraft also earns one point every three seconds. Airtime pauses
on the ground, while paused, and after a crash; resetting clears the full score.

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
├── audio/                         # Menu ambience and reusable UI sounds
├── components/game/               # React lifecycle and game-state overlays
├── game/
│   ├── flight/
│   │   └── aircraft-simulation.ts # Pure fixed-step aircraft simulation
│   ├── world/                     # Geometric world, aircraft, and crash VFX
│   ├── create-level-one-engine.ts # WebGPU/WebGL2 engine selection
│   ├── create-level-one-scene.ts  # Babylon scene composition
│   ├── level-one-audio.ts         # Procedural Web Audio soundscape
│   ├── level-one-course.ts        # Checkpoints, score, and landing rules
│   ├── level-one-hud.ts           # Babylon GUI instruments and guidance
│   └── level-one-runtime.ts       # 120 Hz loop, cameras, state, and telemetry
├── hooks/                         # React adapters for reusable services
├── state/                         # Zod-validated Zustand settings
└── app-router.tsx                 # Route-backed menus and lazy game boundary
```

React owns routing, menus, settings, and full-screen states. Babylon owns the
scene, cameras, HUD, and visual effects. The runtime advances flight logic at a
stable 120 Hz and publishes throttled telemetry instead of rendering React every
frame.

## Assets and licenses

- Level 1 geometry, materials, effects, and audio are generated at runtime; no
  third-party Level 1 art or sound files are used.
- Google Sans Flex via Fontsource: SIL Open Font License 1.1.
- Lucide icons: ISC, with Feather-derived icons under MIT terms.
- Menu key art was generated specifically for this project with OpenAI image
  generation.

See [`public/assets/world/ASSET-SOURCES.md`](public/assets/world/ASSET-SOURCES.md)
for the Level 1 asset policy.

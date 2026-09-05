# Coastal Flight Simulator

Desktop-first geometric flight game built with Next.js, React, TypeScript,
Tailwind CSS, Zustand, and Babylon.js. Start on the runway, fly through each
level's ordered checkpoint rings, and return for a safe landing.

## Levels

- **Level 1 — First Flight:** three straight gates for takeoff and landing
- **Level 2 — Island Bend:** six gates with a gentle climbing turn
- **Level 3 — Coastal Circuit:** nine gates, sharper turns, and a tower gate

Only Level 1 starts unlocked. Completing a safe landing unlocks the next level;
completion and best scores are saved locally. The same geometric island is used
throughout, with cyan, amber, and violet HUD/checkpoint themes distinguishing the
three routes.

## Gameplay

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

No map service, runtime CDN, or external gameplay art/audio asset is required.

## Controls

| Input | Action |
| --- | --- |
| Space / Ctrl | Increase / decrease throttle |
| W / S or ↑ / ↓ | Pitch control |
| A / D or ← / → | Roll control |
| Q / E | Yaw / rudder control |
| B | Hold brakes |
| C | Switch cockpit / chase camera |
| R | Reset flight |
| P / Escape | Pause / resume |
| X | Hide the in-flight controls helper |
| L | Complete the active level (cheat) |

Choose a level from **Start Game**. Fly through every ring in order. After the
final checkpoint, follow the runway guidance, touch down gently inside the
marked landing zone, and slow to complete the level. A hard impact or obstacle
collision crashes the aircraft; reset to retry cleanly.

The first level opened on a device asks for a username and email. The pilot is
saved in local storage and is not requested again. On startup and after every
completed level, the client synchronizes the pilot and best scores through the
Next.js API to Cloudflare R2.

Coins are optional exploration rewards worth 25 points each. While genuinely
airborne, the aircraft also earns one point every three seconds. Airtime pauses
on the ground, while paused, and after a crash; resetting clears the full score.

## Local setup

Node.js 22.12+ with npm or Bun works. The development server always uses port
6969.

```bash
npm install
cp .env.example .env.local
npm run dev

npm run typecheck
npm run lint
npm test
npm run build
```

Open <http://localhost:6969>.

## Cloudflare R2

This project reuses the Wanderer app's `wander-place-data` R2 bucket. Copy the
same Object Read & Write credentials into this project's `.env.local`:

```dotenv
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=wander-place-data
```

Every object owned by this game is isolated below the `flight-simulator/`
prefix. Pilot records use
`flight-simulator/users/<encoded-email>.json` inside the shared bucket:

```json
{
  "email": "pilot@example.com",
  "username": "Sky Pilot",
  "levels": [{ "id": 1, "score": 1050, "passed": true }]
}
```

`GET /api/player?email=...` loads a pilot and `PUT /api/player` creates or
updates it. R2 credentials never enter the browser bundle. Without R2 variables,
the game still remembers the pilot and scores locally while the API returns a
clear `503` configuration response. This MVP intentionally has no account
authentication or email uniqueness check; the same normalized email updates the
same object and preserves the highest score per level.

## Architecture

```text
app/
├── (menu)/                       # Client-only menu pages and URL panels
├── game/[levelId]/               # Client-only Babylon route (SSR disabled)
└── api/player/route.ts           # Server-only R2 GET/PUT handler
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
├── hooks/                         # React adapters and pilot synchronization
├── server/                        # Server-only R2 repository
└── state/                         # Zod-validated Zustand settings/progression
```

Next.js App Router owns URLs while every visual page is dynamically mounted with
SSR disabled. React owns menus, settings, and full-screen states. Babylon owns
the scene, cameras, HUD, and visual effects. The runtime advances flight logic
at a stable 120 Hz and publishes throttled telemetry instead of rendering React
every frame. The R2 API route is intentionally server-only.

## Assets and licenses

- Gameplay geometry, materials, effects, and audio are generated at runtime; no
  third-party gameplay art or sound files are used.
- Google Sans Flex via Fontsource: SIL Open Font License 1.1.
- Lucide icons: ISC, with Feather-derived icons under MIT terms.
- Menu key art was generated specifically for this project with OpenAI image
  generation.

See [`public/assets/world/ASSET-SOURCES.md`](public/assets/world/ASSET-SOURCES.md)
for the gameplay asset policy.

# Coastal Flight Simulator

A flight game you play in the browser: take off and fly along an endless, procedurally generated coastline, from the cockpit or from a chase camera, with working instruments and a scoring system. There is nothing to install.

The front end is a Next.js web app using Babylon.js for the 3D world; the flight simulation runs at a fixed 120 steps per second so flying feels smooth and consistent. The technical details follow below.

# Coastal Flight Simulator

Desktop-first geometric flight game built with Next.js, React, TypeScript,
Tailwind CSS, Zustand, and Babylon.js. Start on the runway, explore a continuously
generated archipelago in any direction, then land and stop when you want to bank
your accumulated score.

## Unlimited flight

There are no levels, locked routes, or final checkpoint. Deterministic island
regions, mountains, collectible trails, and usable airstrips stream in around the
aircraft and unload behind it, keeping active geometry bounded as the world grows.
Every direction is available from the first takeoff.

## Gameplay

- Streamed procedural islands, airstrips, hills, water, collectibles, and an
  aircraft made from Babylon.js primitives
- Fixed-step 120 Hz aircraft simulation, independent from React rendering
- Ground roll, throttle, lift, drag, stalls, steering, braking, and crash checks
- Cockpit and chase cameras
- One accumulating score for airborne time, distance, newly explored regions,
  coins, and the final landing
- Babylon GUI flight HUD with live aircraft, exploration, and runway telemetry
- Procedural engine, wind, discovery, crash/fire, and success audio generated
  with the Web Audio API
- WebGPU when supported, with automatic WebGL2 fallback
- Low, Medium, and High performance presets persisted with Zustand and validated
  with Zod

No map service, runtime CDN, or external gameplay art/audio asset is required.

## Controls

| Input | Action |
| --- | --- |
| Space / Ctrl | Increase / decrease power |
| W / S or ↑ / ↓ | Pitch control |
| A / D or ← / → | Roll control |
| Q / E | Yaw / rudder control |
| B | Hold brakes |
| C | Switch cockpit / chase camera |
| R | Reset flight |
| Enter / P / Escape | Pause / resume |
| X | Toggle the in-flight controls helper |

Choose **Start Unlimited Flight** and fly wherever you like. The HUD reports the
nearest generated runway. To finish, touch down gently on any runway, reduce
throttle, and hold **B** until the aircraft stops. The result screen then shows
the complete accumulated score, distance, air time, regions, and coins. A hard
impact or obstacle collision crashes the aircraft; reset to retry cleanly.

Returning pilots can log in from the home screen, or skip and stay in guest
mode. After a guest completes a flight, the game can ask for a username and email
to save that run. Skipping leaves the result unsaved. Saved pilots are stored in
local storage and synchronized with their personal best through the Next.js API to
Cloudflare R2.

Coins are optional exploration rewards worth 25–75 points. Travel and newly
visited regions add exploration points, while genuine air time adds one point
every three seconds. Scoring pauses on the ground, while paused, and after a
crash; resetting clears the current flight.

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

## Cloudflare R2 (optional, for pilot data storage)

This is optional. Without these credentials the game still runs: pilot profiles stay in local storage, cloud sync is disabled, and returning pilot login reports itself unavailable.

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
  "bestScore": 1050,
  "completedFlights": 3
}
```

`GET /api/player?email=...` loads a pilot and `PUT /api/player` creates or
updates it. R2 credentials never enter the browser bundle. Without R2 variables,
the game still remembers the pilot and scores locally while the API returns a
clear `503` configuration response. This MVP intentionally has no account
authentication or email uniqueness check; the same normalized email updates the
same object and preserves the highest unlimited-flight score. Records from the
former level format are migrated automatically when read.

## Architecture

```text
app/
├── (menu)/                       # Client-only menu pages and URL panels
├── game/                         # Client-only Babylon route (SSR disabled)
└── api/player/route.ts           # Server-only R2 GET/PUT handler
src/
├── audio/                         # Menu ambience and reusable UI sounds
├── components/game/               # React lifecycle and game-state overlays
├── game/
│   ├── flight/
│   │   └── aircraft-simulation.ts # Pure fixed-step aircraft simulation
│   ├── world/                     # Streamed regions, aircraft, and crash VFX
│   ├── create-level-one-engine.ts # WebGPU/WebGL2 engine selection
│   ├── create-level-one-scene.ts  # Babylon scene composition
│   ├── level-one-audio.ts         # Procedural Web Audio soundscape
│   ├── level-one-course.ts        # Exploration score and landing rules
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

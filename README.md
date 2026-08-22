# Coastal Flight Simulator

Browser-based 3D flight-simulator project built with React, TypeScript, and Babylon.js. The current milestone provides the game home screen and reusable menu foundation; the 3D simulation is not connected yet.

## Current features

- Single cinematic coastal-dusk theme with original generated key art
- Responsive game launcher with route-backed Start Game, Controls, Settings, and Credits flows
- Preflight staging screen ready to hand off to the future Babylon scene
- Complete keyboard control reference
- Persistent interface volume, sound, rendering-quality, and mouse-yoke settings
- Zod-validated settings hydration and deterministic fallback defaults
- Procedural hover, click, confirm, and back sounds using Web Audio
- TanStack Hotkeys-powered keyboard handling
- Base UI headless controls with Motion-powered menu transitions
- No paid services, map tokens, or runtime CDNs

## Stack

- Vite, React, and TypeScript for the application shell
- Tailwind CSS v4 theme variables and utilities for the single visual mode
- React Router for `/play`, `/controls`, `/settings`, and `/credits`
- Base UI for accessible headless buttons, dialogs, switches, sliders, and grouped controls
- Motion for reduced-motion-aware game-menu transitions and feedback
- Self-hosted Google Sans Flex for all interface typography
- Babylon.js core, GUI, loaders, and materials for the future 3D layer
- Havok WebAssembly for future physics and collision work
- Zustand with local-storage persistence for settings
- Zod for validation at persisted-data boundaries
- TanStack Hotkeys for type-safe keyboard shortcuts
- Vitest and Testing Library for unit and component tests
- Oxlint for static analysis

## Requirements

- Node.js 22.12 or newer
- npm 10 or newer

## Commands

```bash
npm install
npm run dev -- --port 6969
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

## Architecture

```text
src/
├── audio/                 # Reusable procedural Web Audio service
├── assets/                # Optimized, repository-owned menu art
├── components/
│   ├── home/              # Home shell, backdrop, hero, menu, and status rail
│   ├── panels/            # Preflight, controls, settings, and credits features
│   └── ui/                # Reusable buttons, toggles, sliders, and dialog shell
├── config/                # Data-driven control mappings
├── hooks/                 # React integration for shared services
├── lib/                   # Shared class-composition and utility functions
├── state/                 # Persisted Zustand settings store
├── test/                  # Shared test-environment setup
├── types/                 # Shared component and menu contracts
├── app-router.tsx         # Browser routing and route composition
├── home-page.test.tsx     # Launcher and routing interaction tests
├── index.css              # Tailwind import and aviation theme variables only
└── main.tsx               # React entry point and self-hosted font import
```

All project source filenames use kebab-case. React component symbols remain PascalCase by language convention. The menu does not initialize Babylon.js or Havok; later game code can mount behind the existing preflight route without coupling engine lifecycle to React renders.

The repository-local Codex Playwright skill is stored in `.codex/skills/playwright` for later browser-game verification work.

## Audio behavior

The menu never plays audio on page load. The shared audio service creates and resumes its `AudioContext` only after a user gesture, complying with browser autoplay rules. Sounds are synthesized locally, respect the persisted mute/volume settings, and require no media downloads.

## Assets and licenses

| Asset | Source | License |
| --- | --- | --- |
| Lucide React icons | [lucide-icons/lucide](https://github.com/lucide-icons/lucide) | ISC; Feather-derived icons retain MIT terms in the repository license |
| Google Sans Flex variable font | [Google Fonts](https://fonts.google.com/specimen/Google+Sans+Flex) via Fontsource | SIL Open Font License 1.1 |
| Coastal flight menu key art | Original image generated for this project with OpenAI image generation | Project-owned generated asset |
| Menu interaction sounds | Original procedural Web Audio synthesis | Project-owned source code |

No third-party stock art, music, aircraft models, maps, or textures are included yet. Google Sans Flex became available under the SIL Open Font License in November 2025; Product Sans is not used.

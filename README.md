# Coastal Flight Simulator

Bare project scaffold for a browser-based 3D flight simulator. This step contains no game, scene, login, or gameplay logic yet.

## Stack

- Vite, React, and TypeScript for the application shell
- Babylon.js core, GUI, loaders, and materials for the future 3D layer
- Havok WebAssembly for future physics and collision work
- Zustand for future application and game-state coordination
- Vitest and Testing Library for unit and component tests
- Oxlint for static analysis

## Requirements

- Node.js 22.12 or newer
- npm 10 or newer

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

## Current structure

```text
src/
├── test/
│   └── setup.ts  # Shared test-environment setup
├── App.tsx       # Minimal React application shell
├── App.css       # Shell-specific styles
├── App.test.tsx  # Baseline component smoke test
├── index.css     # Global reset and theme foundation
└── main.tsx      # React entry point
```

Game engine, simulation, world, input, audio, HUD, and state modules will be introduced in later implementation steps. Keeping them out of this scaffold avoids committing to interfaces before those systems exist.

## Assets and licenses

No third-party art, audio, models, maps, or textures are included in this scaffold.

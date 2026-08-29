'use client'

import dynamic from 'next/dynamic'

const LevelRoute = dynamic(
  () =>
    import('../../../src/components/game/level-route').then(
      (module) => module.LevelRoute,
    ),
  {
    loading: () => (
      <main className="fixed inset-0 grid place-items-center bg-flight-950 text-flight-100">
        <div className="flex items-center gap-3 text-sm font-semibold tracking-[0.18em] text-hud">
          <span className="size-4 animate-spin rounded-full border-2 border-flight-700 border-t-hud" />
          LOADING FLIGHT
        </div>
      </main>
    ),
    ssr: false,
  },
)

export default function GameLevelPage() {
  return <LevelRoute />
}

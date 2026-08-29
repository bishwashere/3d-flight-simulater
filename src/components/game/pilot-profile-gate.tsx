import type { GameLevelDefinition } from '../../config/game-levels'
import type { PilotIdentity } from '../../lib/pilot-profile'
import { PilotProfileForm } from './pilot-profile-form'

interface PilotProfileGateProps {
  level: GameLevelDefinition
  onSubmit: (identity: PilotIdentity) => void
  submitting?: boolean
}

export function PilotProfileGate({
  level,
  onSubmit,
  submitting,
}: PilotProfileGateProps) {
  return (
    <main className="fixed inset-0 grid place-items-center overflow-hidden bg-flight-950 px-6 text-flight-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgb(88_230_223/0.12),transparent_42%)]" />
      <section
        aria-labelledby="pilot-profile-title"
        className="relative z-10 w-full max-w-md border-l-2 border-hud bg-flight-900/95 p-7 shadow-panel"
      >
        <p className="text-xs font-bold tracking-[0.2em] text-hud uppercase">
          Level {level.number} · {level.name}
        </p>
        <h1
          className="mt-2 text-4xl leading-tight font-semibold"
          id="pilot-profile-title"
        >
          Identify pilot
        </h1>
        <p className="mt-2 text-sm text-flight-300">
          Saved on this device for future flights.
        </p>
        <PilotProfileForm onSubmit={onSubmit} submitting={submitting} />
      </section>
    </main>
  )
}

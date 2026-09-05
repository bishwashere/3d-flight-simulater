import type { GameLevelDefinition } from '../../config/game-levels'
import type { PilotIdentity } from '../../lib/pilot-profile'
import { PilotProfileForm } from './pilot-profile-form'

interface PilotProfileGateProps {
  level: GameLevelDefinition
  mode?: 'postflight' | 'preflight'
  onSkip?: () => void
  onSubmit: (identity: PilotIdentity) => void
  score?: number
  submitting?: boolean
}

export function PilotProfileGate({
  level,
  mode = 'preflight',
  onSkip,
  onSubmit,
  score,
  submitting,
}: PilotProfileGateProps) {
  const isPostflight = mode === 'postflight'

  return (
    <main className="fixed inset-0 z-30 grid place-items-center overflow-hidden bg-flight-950/88 px-6 text-flight-100 backdrop-blur-sm">
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
          {isPostflight ? 'Save this run?' : 'Identify pilot'}
        </h1>
        <p className="mt-2 text-sm text-flight-300">
          {isPostflight
            ? 'Identify the pilot to save this result. Skipping leaves this flight unsaved.'
            : 'Saved on this device for future flights.'}
        </p>
        {isPostflight && typeof score === 'number' ? (
          <p className="mt-4 border border-hud/25 bg-hud/10 px-3 py-2 text-xs font-bold tracking-[0.16em] text-hud uppercase">
            Score {score.toLocaleString()}
          </p>
        ) : null}
        <PilotProfileForm
          onSubmit={onSubmit}
          submitLabel={isPostflight ? 'Save progress' : 'Save and fly'}
          submitting={submitting}
          submittingLabel={isPostflight ? 'Saving progress' : 'Syncing pilot'}
        />
        {isPostflight && onSkip ? (
          <button
            className="mt-3 w-full border border-flight-500/35 px-4 py-3 text-sm font-bold text-flight-200 transition-colors hover:border-flight-300 hover:text-flight-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hud-bright disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
            onClick={onSkip}
            type="button"
          >
            Skip saving
          </button>
        ) : null}
      </section>
    </main>
  )
}

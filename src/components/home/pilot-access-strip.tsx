import { Button } from '@base-ui/react/button'
import { LogIn, UserRound, UserRoundCheck } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

interface PilotAccessStripProps {
  guestModeSelected: boolean
  onHover: () => void
  onLogin: () => void
  onSkip: () => void
  pilotName?: string
}

export function PilotAccessStrip({
  guestModeSelected,
  onHover,
  onLogin,
  onSkip,
  pilotName,
}: PilotAccessStripProps) {
  const reduceMotion = useReducedMotion()
  const signedIn = Boolean(pilotName)

  return (
    <motion.section
      aria-label="Pilot access"
      className="mt-4 border border-flight-300/18 bg-flight-900/70 p-4 text-flight-100/90 backdrop-blur-sm"
      initial={reduceMotion ? false : { opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: reduceMotion ? 0 : 0.44,
        duration: reduceMotion ? 0 : 0.32,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center border border-hud/30 bg-hud/10 text-hud">
          {signedIn ? (
            <UserRoundCheck aria-hidden={true} size={18} strokeWidth={1.8} />
          ) : (
            <UserRound aria-hidden={true} size={18} strokeWidth={1.8} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.64rem] font-bold tracking-[0.16em] text-hud uppercase">
            {signedIn
              ? 'Pilot loaded'
              : guestModeSelected
                ? 'Guest mode'
                : 'Returning pilot?'}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-flight-100">
            {signedIn ? pilotName : 'Fly now, save later'}
          </p>
        </div>
      </div>

      {!signedIn ? (
        <div
          className={`mt-4 grid gap-2 ${
            guestModeSelected ? 'grid-cols-1' : 'grid-cols-2'
          }`}
        >
          <Button
            className="inline-flex min-h-10 items-center justify-center gap-2 border border-hud/45 bg-hud/12 px-3 py-2 text-[0.68rem] font-bold tracking-[0.12em] text-hud uppercase transition-colors hover:border-hud-bright hover:bg-hud/20 hover:text-hud-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hud/60"
            onClick={onLogin}
            onMouseEnter={onHover}
            type="button"
          >
            <LogIn aria-hidden={true} size={15} />
            Log in
          </Button>
          {!guestModeSelected ? (
            <Button
              className="min-h-10 border border-flight-500/30 px-3 py-2 text-[0.68rem] font-bold tracking-[0.12em] text-flight-300 uppercase transition-colors hover:border-flight-300 hover:text-flight-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hud/60"
              onClick={onSkip}
              onMouseEnter={onHover}
              type="button"
            >
              Skip
            </Button>
          ) : null}
        </div>
      ) : null}
    </motion.section>
  )
}

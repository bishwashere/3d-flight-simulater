import { Button } from '@base-ui/react/button'
import { AtSign, LogIn } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'

import {
  isPilotStorageUnconfigured,
  loadPilotRecord,
} from '../../lib/pilot-api'
import { applyPilotProgress } from '../../lib/pilot-progress'
import {
  pilotIdentitySchema,
  type PilotRecord,
} from '../../lib/pilot-profile'
import { usePilotProfileStore } from '../../state'
import { MenuOverlay } from '../ui/menu-overlay'

interface PilotLoginDialogProps {
  onClose: () => void
  onLoaded: (record: PilotRecord) => void
  onStayGuest: () => void
  open: boolean
}

export function PilotLoginDialog({
  onClose,
  onLoaded,
  onStayGuest,
  open,
}: PilotLoginDialogProps) {
  const inputId = useId()
  const setPilotRecord = usePilotProfileStore((state) => state.setRecord)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsedEmail = pilotIdentitySchema.shape.email.safeParse(email)

    if (!parsedEmail.success) {
      setError(parsedEmail.error.issues[0]?.message ?? 'Enter a valid email')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const record = await loadPilotRecord(parsedEmail.data)

      if (!record) {
        setError('No saved pilot found for that email.')
        return
      }

      applyPilotProgress(record)
      const savedRecord = setPilotRecord(record)
      onLoaded(savedRecord)
    } catch (loadError) {
      setError(
        isPilotStorageUnconfigured(loadError)
          ? 'Pilot login is unavailable. You can still fly as guest.'
          : 'Could not load that pilot right now.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <MenuOverlay title="Pilot login" onClose={onClose} open={open}>
      <form
        aria-label="Returning pilot login"
        className="mx-auto grid max-w-md gap-5"
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="grid gap-2">
          <p className="text-xs font-bold tracking-[0.18em] text-hud uppercase">
            Returning pilot
          </p>
          <p className="font-body text-sm leading-6 text-flight-300">
            Enter the email used for a saved pilot. Skip this and the game will
            keep flying in guest mode.
          </p>
        </div>

        <label
          className="grid gap-1.5 text-[0.65rem] font-semibold tracking-[0.12em] text-flight-300 uppercase"
          htmlFor={inputId}
        >
          Email
          <span className="relative block">
            <AtSign
              aria-hidden={true}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-flight-500"
              size={17}
              strokeWidth={1.8}
            />
            <input
              aria-describedby={error ? `${inputId}-error` : undefined}
              aria-invalid={Boolean(error)}
              autoComplete="email"
              autoFocus
              className="h-11 w-full border border-flight-500/35 bg-flight-900/85 pr-3 pl-10 text-sm text-flight-100 outline-none transition-colors placeholder:text-flight-500/70 hover:border-flight-500 focus:border-hud focus:shadow-hud aria-invalid:border-critical aria-invalid:focus:border-critical"
              disabled={loading}
              id={inputId}
              onChange={(event) => {
                setEmail(event.target.value)
                setError(null)
              }}
              placeholder="pilot@example.com"
              type="email"
              value={email}
            />
          </span>
        </label>

        {error ? (
          <p
            className="text-[0.72rem] leading-5 text-critical"
            id={`${inputId}-error`}
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            className="flex items-center justify-center gap-2 bg-hud px-4 py-3 text-sm font-bold text-flight-950 hover:bg-hud-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hud-bright"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Loading pilot' : 'Log in'}
            <LogIn aria-hidden={true} size={17} />
          </Button>
          <Button
            className="border border-flight-500/35 px-4 py-3 text-sm font-bold text-flight-200 transition-colors hover:border-flight-300 hover:text-flight-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hud-bright"
            disabled={loading}
            onClick={onStayGuest}
            type="button"
          >
            Stay guest
          </Button>
        </div>
      </form>
    </MenuOverlay>
  )
}

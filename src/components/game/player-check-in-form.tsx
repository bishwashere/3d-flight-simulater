import { Button } from '@base-ui/react/button'
import { AtSign, LogIn, UserRound } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'

import {
  playerCheckInSchema,
  type PlayerCheckIn,
} from '../../lib/player-check-in'
import type { IconComponent } from '../../types/icon'

interface PlayerCheckInFormProps {
  onSkip: () => void
  onSubmit: (checkIn: PlayerCheckIn) => void
}

type PlayerCheckInField = keyof PlayerCheckIn
type PlayerCheckInErrors = Partial<Record<PlayerCheckInField, string>>

interface PlayerFieldDefinition {
  autoComplete: 'email' | 'username'
  icon: IconComponent
  label: string
  name: PlayerCheckInField
  placeholder: string
  type: 'email' | 'text'
}

const PLAYER_FIELDS: readonly PlayerFieldDefinition[] = [
  {
    autoComplete: 'username',
    icon: UserRound,
    label: 'Username',
    name: 'username',
    placeholder: 'Pilot name',
    type: 'text',
  },
  {
    autoComplete: 'email',
    icon: AtSign,
    label: 'Email',
    name: 'email',
    placeholder: 'pilot@example.com',
    type: 'email',
  },
]

const EMPTY_VALUES: PlayerCheckIn = {
  email: '',
  username: '',
}

export function PlayerCheckInForm({
  onSkip,
  onSubmit,
}: PlayerCheckInFormProps) {
  const formId = useId()
  const [errors, setErrors] = useState<PlayerCheckInErrors>({})
  const [values, setValues] = useState<PlayerCheckIn>(EMPTY_VALUES)

  const updateField = (field: PlayerCheckInField, value: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }))
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = playerCheckInSchema.safeParse(values)

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors({
        email: fieldErrors.email?.[0],
        username: fieldErrors.username?.[0],
      })
      return
    }

    setErrors({})
    onSubmit(result.data)
  }

  return (
    <form
      aria-label="Optional pilot check-in"
      className="mt-6 border-t border-flight-500/25 pt-5"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xs font-bold tracking-[0.18em] text-flight-100 uppercase">
          Pilot check-in
        </h2>
        <span className="border border-hud/30 bg-hud/10 px-2 py-1 text-[0.58rem] font-bold tracking-[0.15em] text-hud uppercase">
          Optional
        </span>
      </div>

      <div className="grid gap-3">
        {PLAYER_FIELDS.map((field) => {
          const fieldId = `${formId}-${field.name}`
          const errorId = `${fieldId}-error`
          const error = errors[field.name]
          const Icon = field.icon

          return (
            <div className="grid gap-1.5" key={field.name}>
              <label
                className="text-[0.65rem] font-semibold tracking-[0.12em] text-flight-300 uppercase"
                htmlFor={fieldId}
              >
                {field.label}
              </label>
              <span className="relative block">
                <Icon
                  aria-hidden={true}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-flight-500"
                  size={17}
                  strokeWidth={1.8}
                />
                <input
                  aria-describedby={error ? errorId : undefined}
                  aria-invalid={Boolean(error)}
                  autoComplete={field.autoComplete}
                  autoFocus={field.name === 'username'}
                  className="h-11 w-full border border-flight-500/35 bg-flight-900/85 pr-3 pl-10 text-sm text-flight-100 outline-none transition-colors placeholder:text-flight-500/70 hover:border-flight-500 focus:border-hud focus:shadow-hud aria-invalid:border-critical aria-invalid:focus:border-critical"
                  id={fieldId}
                  name={field.name}
                  onChange={(event) => updateField(field.name, event.target.value)}
                  placeholder={field.placeholder}
                  type={field.type}
                  value={values[field.name]}
                />
              </span>
              {error ? (
                <span
                  className="text-[0.66rem] leading-4 text-critical"
                  id={errorId}
                  role="alert"
                >
                  {error}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
        <Button
          className="flex items-center justify-center gap-2 bg-hud px-4 py-3 text-sm font-bold text-flight-950 hover:bg-hud-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hud-bright"
          type="submit"
        >
          Check in <LogIn aria-hidden={true} size={17} />
        </Button>
        <Button
          className="border border-flight-700 px-4 py-3 text-sm font-semibold text-flight-300 hover:border-flight-500 hover:text-flight-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hud"
          onClick={onSkip}
          type="button"
        >
          Skip
        </Button>
      </div>
    </form>
  )
}

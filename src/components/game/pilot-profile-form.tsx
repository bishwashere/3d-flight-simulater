import { Button } from '@base-ui/react/button'
import { AtSign, LogIn, UserRound } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'

import {
  pilotIdentitySchema,
  type PilotIdentity,
} from '../../lib/pilot-profile'
import type { IconComponent } from '../../types/icon'

interface PilotProfileFormProps {
  onSubmit: (identity: PilotIdentity) => void
  submitting?: boolean
}

type PilotProfileField = keyof PilotIdentity
type PilotProfileErrors = Partial<Record<PilotProfileField, string>>

interface PilotFieldDefinition {
  autoComplete: 'email' | 'username'
  icon: IconComponent
  label: string
  name: PilotProfileField
  placeholder: string
  type: 'email' | 'text'
}

const PILOT_FIELDS: readonly PilotFieldDefinition[] = [
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

const EMPTY_VALUES: PilotIdentity = {
  email: '',
  username: '',
}

export function PilotProfileForm({
  onSubmit,
  submitting = false,
}: PilotProfileFormProps) {
  const formId = useId()
  const [errors, setErrors] = useState<PilotProfileErrors>({})
  const [values, setValues] = useState<PilotIdentity>(EMPTY_VALUES)

  const updateField = (field: PilotProfileField, value: string) => {
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
    const result = pilotIdentitySchema.safeParse(values)

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
      aria-label="Pilot profile"
      className="mt-6 border-t border-flight-500/25 pt-5"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xs font-bold tracking-[0.18em] text-flight-100 uppercase">
          Pilot profile
        </h2>
        <span className="border border-hud/30 bg-hud/10 px-2 py-1 text-[0.58rem] font-bold tracking-[0.15em] text-hud uppercase">
          One time
        </span>
      </div>

      <div className="grid gap-3">
        {PILOT_FIELDS.map((field) => {
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
                  disabled={submitting}
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

      <Button
        className="mt-5 flex w-full items-center justify-center gap-2 bg-hud px-4 py-3 text-sm font-bold text-flight-950 hover:bg-hud-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hud-bright"
        disabled={submitting}
        type="submit"
      >
        {submitting ? 'Syncing pilot' : 'Save and fly'}{' '}
        <LogIn aria-hidden={true} size={17} />
      </Button>
    </form>
  )
}

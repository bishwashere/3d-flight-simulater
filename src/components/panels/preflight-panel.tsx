import { useState } from 'react'
import { Button } from '@base-ui/react/button'
import { ArrowRight, Check, Map } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { MenuAudioController } from '../../hooks/use-menu-audio'
import { MenuOverlay } from '../ui/menu-overlay'

interface PreflightPanelProps {
  audio: MenuAudioController
  onClose: () => void
  open: boolean
}

const FLIGHT_BRIEF = [
  { label: 'Aircraft', value: 'Trainer 01' },
  { label: 'Weather', value: 'Coastal clear' },
  { label: 'Departure', value: 'Runway 24' },
] as const

export function PreflightPanel({
  audio,
  onClose,
  open,
}: PreflightPanelProps) {
  const [flightStaged, setFlightStaged] = useState(false)
  const reduceMotion = useReducedMotion()

  return (
    <MenuOverlay title="Preflight staging" onClose={onClose} open={open}>
      <div className="grid gap-5">
        <div className="flex min-h-40 items-center gap-[clamp(1.1rem,3vw,2rem)] border border-flight-500/25 bg-linear-to-r from-hud/10 to-flight-800/30 p-[clamp(1rem,2vw,1.6rem)] max-[31rem]:items-start">
          <div className="relative grid size-30 shrink-0 place-items-center overflow-hidden rounded-full border border-hud/35 bg-flight-950/70 text-hud before:absolute before:inset-1/3 before:rounded-full before:border before:border-hud/15 before:content-[''] after:absolute after:inset-[16%] after:rounded-full after:border after:border-hud/15 after:content-[''] max-[31rem]:size-22">
            <span className="absolute inset-[50%_50%_0_0] origin-top-right animate-radar bg-linear-to-tr from-transparent via-transparent to-hud/50" />
            <Map
              className="relative z-10 max-[31rem]:w-8"
              aria-hidden="true"
              size={44}
              strokeWidth={1.2}
            />
          </div>
          <div>
            <h3 className="text-[clamp(1.4rem,3vw,2.1rem)] font-semibold tracking-[0.04em] uppercase">
              Free flight
            </h3>
          </div>
        </div>

        <dl className="grid grid-cols-3 border border-flight-500/25 max-[47rem]:grid-cols-1">
          {FLIGHT_BRIEF.map(({ label, value }) => (
            <div
              className="border-r border-flight-500/25 p-4 last:border-r-0 max-[47rem]:[&:nth-child(2)]:border-r-0 max-[47rem]:[&:nth-child(-n+2)]:border-b max-[47rem]:[&:nth-child(-n+2)]:border-flight-500/25"
              key={label}
            >
              <dt className="mb-1 text-[0.55rem] font-semibold tracking-[0.14em] text-flight-500 uppercase">
                {label}
              </dt>
              <dd className="text-xs font-semibold tracking-[0.06em] text-flight-100 uppercase">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <AnimatePresence initial={false}>
          {flightStaged ? (
            <motion.div
              key="staged"
              className="flex min-h-14 items-center gap-3 border border-hud/35 bg-hud/10 px-4 py-3 text-hud-bright"
              role="status"
              aria-label="Flight status"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            >
              <Check className="shrink-0" aria-hidden="true" size={22} />
              <strong className="text-xs font-semibold tracking-[0.1em] uppercase">
                Flight flow staged
              </strong>
            </motion.div>
          ) : (
            <Button
              key="stage"
              className="flex min-h-14 w-full items-center justify-between bg-linear-to-r from-hud to-hud/75 px-5 py-3 text-xs font-bold tracking-[0.13em] text-flight-950 uppercase transition-[filter] duration-200 motion-reduce:transition-none hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hud-bright focus-visible:ring-offset-2 focus-visible:ring-offset-flight-950"
              onClick={() => {
                audio.play('confirm')
                setFlightStaged(true)
              }}
              render={<motion.button exit={{ opacity: 0, y: -6 }} />}
            >
              Stage free flight
              <ArrowRight aria-hidden="true" size={20} />
            </Button>
          )}
        </AnimatePresence>
      </div>
    </MenuOverlay>
  )
}

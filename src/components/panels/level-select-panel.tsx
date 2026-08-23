import { Button } from '@base-ui/react/button'
import { ArrowRight, Lock, MapPinned, Plane } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import type { MenuAudioController } from '../../hooks/use-menu-audio'
import type { LevelId } from '../../types/menu'
import { MenuOverlay } from '../ui/menu-overlay'

interface LevelSelectPanelProps {
  audio: MenuAudioController
  onClose: () => void
  onLaunchLevel: (level: LevelId) => void
  open: boolean
}

const LOCKED_LEVELS = [
  { label: 'Level 2', location: 'Highland route' },
  { label: 'Level 3', location: 'Night approach' },
] as const

export function LevelSelectPanel({
  audio,
  onClose,
  onLaunchLevel,
  open,
}: LevelSelectPanelProps) {
  const reduceMotion = useReducedMotion()

  const launchLevelOne = () => {
    audio.play('confirm')
    onLaunchLevel('level-1')
  }

  return (
    <MenuOverlay title="Select level" onClose={onClose} open={open}>
      <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(15rem,0.8fr)] gap-4 max-[47rem]:grid-cols-1">
        <Button
          className="group relative min-h-72 overflow-hidden border border-hud/45 bg-linear-to-br from-hud/16 via-flight-800/55 to-flight-950 p-0 text-left shadow-hud focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hud-bright"
          type="button"
          onClick={launchLevelOne}
          render={
            <motion.button
              whileHover={reduceMotion ? undefined : { y: -3 }}
              whileTap={reduceMotion ? undefined : { scale: 0.99 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
            />
          }
        >
          <span className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_72%_22%,rgb(88_230_223_/_0.2),transparent_30%),linear-gradient(135deg,transparent_42%,rgb(88_230_223_/_0.08)_42%,rgb(88_230_223_/_0.08)_43%,transparent_43%)]" />
          <span className="relative flex h-full min-h-72 flex-col justify-between p-6">
            <span className="flex items-start justify-between gap-4">
              <span className="grid size-16 place-items-center border border-hud/35 bg-flight-950/65 text-hud">
                <MapPinned aria-hidden="true" size={31} strokeWidth={1.5} />
              </span>
              <span className="border border-ready/35 bg-ready/10 px-2.5 py-1 text-[0.57rem] font-bold tracking-[0.14em] text-ready uppercase">
                Ready
              </span>
            </span>

            <span className="grid gap-2">
              <span className="text-[0.62rem] font-semibold tracking-[0.16em] text-hud uppercase">
                Level 1 · Map preview
              </span>
              <strong className="text-[clamp(1.65rem,3vw,2.45rem)] leading-none font-semibold tracking-[0.03em] text-flight-100 uppercase">
                Coastal range
              </strong>
              <span className="font-body text-sm leading-6 text-flight-300">
                Inspect the island, airfield, harbor, and mountain route.
              </span>
              <span className="mt-2 flex items-center justify-between border-t border-flight-500/25 pt-4 text-[0.65rem] font-bold tracking-[0.13em] text-hud-bright uppercase">
                Open map
                <ArrowRight
                  className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
                  aria-hidden="true"
                  size={20}
                />
              </span>
            </span>
          </span>
        </Button>

        <div className="grid content-stretch gap-4">
          {LOCKED_LEVELS.map((level) => (
            <Button
              className="flex min-h-32 cursor-not-allowed items-center gap-4 border border-flight-500/20 bg-flight-800/20 p-5 text-left opacity-55"
              key={level.label}
              type="button"
              disabled
            >
              <span className="grid size-11 shrink-0 place-items-center border border-flight-500/25 bg-flight-950/55 text-flight-500">
                <Lock aria-hidden="true" size={19} />
              </span>
              <span className="grid min-w-0 flex-1 gap-1">
                <strong className="text-sm font-semibold tracking-[0.09em] text-flight-300 uppercase">
                  {level.label}
                </strong>
                <span className="font-body text-xs text-flight-500">
                  {level.location}
                </span>
              </span>
              <Plane aria-hidden="true" size={19} strokeWidth={1.5} />
            </Button>
          ))}
        </div>
      </div>
    </MenuOverlay>
  )
}

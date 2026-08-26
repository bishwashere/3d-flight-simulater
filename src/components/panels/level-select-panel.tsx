import { Button } from '@base-ui/react/button'
import { ArrowRight, Check, Lock, Plane } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { GAME_LEVELS } from '../../config/game-levels'
import type { MenuAudioController } from '../../hooks/use-menu-audio'
import { useProgressionStore } from '../../state'
import type { LevelId } from '../../types/menu'
import { MenuOverlay } from '../ui/menu-overlay'

interface LevelSelectPanelProps {
  audio: MenuAudioController
  onClose: () => void
  onLaunchLevel: (level: LevelId) => void
  open: boolean
}

export function LevelSelectPanel({
  audio,
  onClose,
  onLaunchLevel,
  open,
}: LevelSelectPanelProps) {
  const reduceMotion = useReducedMotion()
  const bestScores = useProgressionStore((state) => state.bestScores)
  const completedLevelIds = useProgressionStore(
    (state) => state.completedLevelIds,
  )
  const unlockedLevelIds = useProgressionStore(
    (state) => state.unlockedLevelIds,
  )

  return (
    <MenuOverlay title="Select level" onClose={onClose} open={open}>
      <div className="grid grid-cols-3 gap-4 max-[47rem]:grid-cols-1">
        {GAME_LEVELS.map((level) => {
          const unlocked = unlockedLevelIds.includes(level.id)
          const completed = completedLevelIds.includes(level.id)
          const bestScore = bestScores[level.id]

          return (
            <Button
              aria-label={`${unlocked ? '' : 'Locked '}Level ${level.number}: ${level.name}`}
              className="group relative min-h-64 overflow-hidden border border-hud/35 bg-linear-to-br from-hud/12 via-flight-800/55 to-flight-950 p-0 text-left shadow-hud focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hud-bright disabled:cursor-not-allowed disabled:border-flight-500/20 disabled:opacity-50 disabled:shadow-none"
              key={level.id}
              type="button"
              disabled={!unlocked}
              onClick={() => {
                audio.play('confirm')
                onLaunchLevel(level.id)
              }}
              render={
                <motion.button
                  whileHover={
                    reduceMotion || !unlocked ? undefined : { y: -3 }
                  }
                  whileTap={
                    reduceMotion || !unlocked ? undefined : { scale: 0.99 }
                  }
                  transition={{ duration: reduceMotion ? 0 : 0.18 }}
                />
              }
            >
              <span className="absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_78%_18%,rgb(88_230_223_/_0.2),transparent_30%),linear-gradient(135deg,transparent_42%,rgb(88_230_223_/_0.07)_42%,rgb(88_230_223_/_0.07)_43%,transparent_43%)]" />
              <span className="relative flex min-h-64 flex-col justify-between p-5">
                <span className="flex items-start justify-between gap-3">
                  <span className="grid size-11 place-items-center border border-hud/30 bg-flight-950/65 text-hud group-disabled:border-flight-500/25 group-disabled:text-flight-500">
                    {completed ? (
                      <Check aria-hidden="true" size={20} />
                    ) : unlocked ? (
                      <Plane aria-hidden="true" size={20} strokeWidth={1.5} />
                    ) : (
                      <Lock aria-hidden="true" size={18} />
                    )}
                  </span>
                  <span
                    className={`border px-2.5 py-1 text-[0.56rem] font-bold tracking-[0.13em] uppercase ${
                      completed
                        ? 'border-ready/35 bg-ready/10 text-ready'
                        : unlocked
                          ? 'border-hud/35 bg-hud/10 text-hud'
                          : 'border-flight-500/25 bg-flight-800/30 text-flight-500'
                    }`}
                  >
                    {completed ? 'Complete' : unlocked ? 'Ready' : 'Locked'}
                  </span>
                </span>

                <span className="grid gap-2">
                  <span className="text-[0.6rem] font-semibold tracking-[0.15em] text-hud uppercase group-disabled:text-flight-500">
                    Level {level.number} · {level.difficulty}
                  </span>
                  <strong className="text-xl leading-tight font-semibold tracking-[0.03em] text-flight-100 uppercase">
                    {level.name}
                  </strong>
                  <span className="min-h-10 font-body text-xs leading-5 text-flight-300">
                    {level.description}
                  </span>
                  <span className="mt-1 flex items-center justify-between border-t border-flight-500/25 pt-3 text-[0.62rem] font-bold tracking-[0.12em] text-hud-bright uppercase group-disabled:text-flight-500">
                    {completed ? `Best ${bestScore ?? 0}` : `${level.checkpointPositions.length} gates`}
                    {unlocked ? (
                      <ArrowRight
                        className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
                        aria-hidden="true"
                        size={18}
                      />
                    ) : (
                      <Lock aria-hidden="true" size={15} />
                    )}
                  </span>
                </span>
              </span>
            </Button>
          )
        })}
      </div>
    </MenuOverlay>
  )
}

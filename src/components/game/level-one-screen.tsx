import {
  ArrowRight,
  Keyboard,
  LogOut,
  Music,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useHotkeys } from '@tanstack/react-hotkeys'

import { gameAmbience } from '../../audio/game-ambience'
import type { GameLevelDefinition } from '../../config/game-levels'
import { LevelOneRuntime } from '../../game/level-one-runtime'
import { resolveLevelOnePerformance } from '../../game/level-one-performance'
import {
  DEFAULT_LEVEL_ONE_ASSETS,
  type LevelOneAssets,
  type LevelOneGameStatus,
  type LevelOnePerformanceSettings,
} from '../../game/level-one-types'
import { useMenuAudio } from '../../hooks/use-menu-audio'
import { ControlsPanel } from '../panels/controls-panel'
import { SettingsPanel } from '../panels/settings-panel'

export interface LevelOneScreenProps {
  assets?: LevelOneAssets
  gameplaySoundsEnabled?: boolean
  level: GameLevelDefinition
  masterVolume?: number
  musicEnabled?: boolean
  onComplete: (score: number) => void
  onExit: () => void
  onGameplaySoundsEnabledChange?: (enabled: boolean) => void
  onMusicEnabledChange?: (enabled: boolean) => void
  onNextLevel?: () => void
  performance?: LevelOnePerformanceSettings
  pointerYoke?: boolean
}

type LoadingStatus = 'error' | 'loading' | 'ready'
type PausePanel = 'controls' | 'settings' | null

const INITIAL_GAME_STATUS: LevelOneGameStatus = {
  phase: 'ready',
  score: 0,
}

const WEBGPU_FAILURE_SESSION_KEY = 'coastal-flight-webgpu-fallback'
const INITIAL_HELD_CONTROLS = {
  brakes: false,
  pitchDown: false,
  pitchUp: false,
  rollLeft: false,
  rollRight: false,
  throttleDown: false,
  throttleUp: false,
  yawLeft: false,
  yawRight: false,
}

type HeldControls = typeof INITIAL_HELD_CONTROLS

const CONTROL_KEY_CODES = new Set([
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ControlLeft',
  'ControlRight',
  'KeyA',
  'KeyB',
  'KeyD',
  'KeyE',
  'KeyQ',
  'KeyS',
  'KeyW',
  'ShiftLeft',
  'ShiftRight',
])

function deriveHeldControls(heldCodes: ReadonlySet<string>): HeldControls {
  return {
    brakes: heldCodes.has('KeyB'),
    pitchDown: heldCodes.has('KeyW') || heldCodes.has('ArrowUp'),
    pitchUp: heldCodes.has('KeyS') || heldCodes.has('ArrowDown'),
    rollLeft: heldCodes.has('KeyA') || heldCodes.has('ArrowLeft'),
    rollRight: heldCodes.has('KeyD') || heldCodes.has('ArrowRight'),
    throttleDown:
      heldCodes.has('ControlLeft') || heldCodes.has('ControlRight'),
    throttleUp: heldCodes.has('ShiftLeft') || heldCodes.has('ShiftRight'),
    yawLeft: heldCodes.has('KeyQ'),
    yawRight: heldCodes.has('KeyE'),
  }
}

function controlsEqual(left: HeldControls, right: HeldControls): boolean {
  return (Object.keys(INITIAL_HELD_CONTROLS) as (keyof HeldControls)[]).every(
    (key) => left[key] === right[key],
  )
}

function hadWebGpuFailureThisSession(): boolean {
  try {
    return sessionStorage.getItem(WEBGPU_FAILURE_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function rememberWebGpuFailure(): void {
  try {
    sessionStorage.setItem(WEBGPU_FAILURE_SESSION_KEY, '1')
  } catch {
    // Storage may be disabled; the in-memory fallback still works.
  }
}

export function LevelOneScreen({
  assets,
  gameplaySoundsEnabled = true,
  level,
  masterVolume = 0.7,
  musicEnabled = true,
  onComplete,
  onExit,
  onGameplaySoundsEnabledChange,
  onMusicEnabledChange,
  onNextLevel,
  performance,
  pointerYoke = false,
}: LevelOneScreenProps) {
  const menuAudio = useMenuAudio()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const completionReportedRef = useRef(false)
  const gameplaySoundsEnabledRef = useRef(gameplaySoundsEnabled)
  const heldCodesRef = useRef<Set<string>>(new Set())
  const masterVolumeRef = useRef(masterVolume)
  const performanceRef = useRef(resolveLevelOnePerformance(performance))
  const pointerYokeRef = useRef(pointerYoke)
  const runtimeRef = useRef<LevelOneRuntime | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [forceWebGl2, setForceWebGl2] = useState(
    hadWebGpuFailureThisSession,
  )
  const [gameStatus, setGameStatus] = useState(INITIAL_GAME_STATUS)
  const [heldControls, setHeldControls] =
    useState<HeldControls>(INITIAL_HELD_CONTROLS)
  const [pausePanel, setPausePanel] = useState<PausePanel>(null)
  const [paused, setPaused] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [status, setStatus] = useState<LoadingStatus>('loading')

  const resolvedAssets = useMemo<LevelOneAssets>(
    () => ({ ...DEFAULT_LEVEL_ONE_ASSETS, ...assets }),
    [assets],
  )
  const resolvedPerformance = useMemo(
    () => resolveLevelOnePerformance(performance),
    [performance],
  )

  useHotkeys(
    [
      {
        callback: () => runtimeRef.current?.resetGame(),
        hotkey: 'R',
      },
      {
        callback: () => runtimeRef.current?.cycleCamera(),
        hotkey: 'C',
      },
      {
        callback: () => runtimeRef.current?.startEngine(),
        hotkey: 'I',
      },
      {
        callback: () => runtimeRef.current?.togglePaused(),
        hotkey: 'P',
      },
      {
        callback: () => runtimeRef.current?.releasePointerLockOrPause(),
        hotkey: 'Escape',
      },
    ],
    {
      enabled: status === 'ready',
      ignoreInputs: false,
    },
  )

  useEffect(() => {
    if (gameStatus.phase !== 'complete') {
      completionReportedRef.current = false
      return
    }
    if (completionReportedRef.current) {
      return
    }
    completionReportedRef.current = true
    onComplete(gameStatus.score)
  }, [gameStatus.phase, gameStatus.score, onComplete])

  useEffect(() => {
    runtimeRef.current?.setControlInput({
      brakes: heldControls.brakes,
      pitch: Number(heldControls.pitchUp) - Number(heldControls.pitchDown),
      roll: Number(heldControls.rollRight) - Number(heldControls.rollLeft),
      throttleDown: heldControls.throttleDown,
      throttleUp: heldControls.throttleUp,
      yaw: Number(heldControls.yawRight) - Number(heldControls.yawLeft),
    })
  }, [heldControls])

  useEffect(() => {
    runtimeRef.current?.setMasterVolume(masterVolume)
  }, [masterVolume])

  useEffect(() => {
    runtimeRef.current?.setGameplayAudioEnabled(gameplaySoundsEnabled)
  }, [gameplaySoundsEnabled])

  useEffect(() => {
    gameplaySoundsEnabledRef.current = gameplaySoundsEnabled
    masterVolumeRef.current = masterVolume
  }, [gameplaySoundsEnabled, masterVolume])

  useEffect(() => {
    if (status !== 'ready') {
      performanceRef.current = resolvedPerformance
      pointerYokeRef.current = pointerYoke
    }
  }, [pointerYoke, resolvedPerformance, status])

  useEffect(() => {
    const syncHeldControls = () => {
      const nextControls = deriveHeldControls(heldCodesRef.current)
      setHeldControls((currentControls) =>
        controlsEqual(currentControls, nextControls)
          ? currentControls
          : nextControls,
      )
    }

    const clearHeldControls = () => {
      if (heldCodesRef.current.size === 0) {
        return
      }
      heldCodesRef.current.clear()
      syncHeldControls()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (status !== 'ready') {
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()
        if (!event.repeat) {
          runtimeRef.current?.togglePaused()
        }
        return
      }

      if (event.code === 'KeyX') {
        event.preventDefault()
        if (!event.repeat) {
          runtimeRef.current?.toggleControlsHelper()
        }
        return
      }

      if (!CONTROL_KEY_CODES.has(event.code)) {
        return
      }

      event.preventDefault()
      heldCodesRef.current.add(event.code)
      syncHeldControls()
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!CONTROL_KEY_CODES.has(event.code)) {
        return
      }

      event.preventDefault()
      heldCodesRef.current.delete(event.code)
      syncHeldControls()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', clearHeldControls)
    document.addEventListener('visibilitychange', clearHeldControls)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', clearHeldControls)
      document.removeEventListener('visibilitychange', clearHeldControls)
    }
  }, [status])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    let cancelled = false
    setStatus('loading')
    setErrorMessage('')
    setPaused(false)
    setGameStatus(INITIAL_GAME_STATUS)
    heldCodesRef.current.clear()
    setHeldControls(INITIAL_HELD_CONTROLS)
    canvas.dataset.level = level.id
    canvas.dataset.theme = level.theme

    const initialize = async () => {
      // React Strict Mode mounts, cleans up, then mounts effects again in
      // development. Yield once so the cancelled probe never creates a second
      // GPU engine on the same canvas.
      await new Promise<void>((resolve) => {
        queueMicrotask(resolve)
      })
      if (cancelled) {
        return
      }

      try {
        const runtime = await LevelOneRuntime.create(canvas, {
          assets: resolvedAssets,
          forceWebGl2,
          gameplayAudioEnabled: gameplaySoundsEnabledRef.current,
          level,
          masterVolume: masterVolumeRef.current,
          onBackendFailure: () => {
            if (!cancelled) {
              rememberWebGpuFailure()
              setForceWebGl2(true)
              setRetryKey((value) => value + 1)
            }
          },
          onGameStatus: setGameStatus,
          onPauseChange: (nextPaused) => {
            setPaused(nextPaused)
            if (!nextPaused) {
              setPausePanel(null)
            }
          },
          onTelemetry: (telemetry) => {
            canvas.dataset.altitude = telemetry.altitude.toFixed(1)
            canvas.dataset.backend = telemetry.backend
            canvas.dataset.camera = telemetry.cameraMode
            canvas.dataset.fps = telemetry.fps.toFixed(0)
            canvas.dataset.phase = telemetry.phase
            canvas.dataset.score = telemetry.score.toFixed(0)
            canvas.dataset.airborneSeconds = telemetry.airborneSeconds.toFixed(1)
            canvas.dataset.coinsCollected = telemetry.coinsCollected.toString()
            canvas.dataset.coinCount = telemetry.coinCount.toString()
            canvas.dataset.checkpointCount = telemetry.checkpointCount.toString()
            canvas.dataset.checkpointIndex = telemetry.checkpointIndex.toString()
            canvas.dataset.speed = telemetry.speed.toFixed(1)
          },
          performance: performanceRef.current,
          pointerYoke: pointerYokeRef.current,
        })

        if (cancelled) {
          runtime.dispose()
          return
        }

        runtimeRef.current = runtime
        setStatus('ready')
        canvas.focus()
      } catch (error) {
        if (!cancelled) {
          console.error(`Level ${level.number} startup failed.`, error)
          setErrorMessage(
            error instanceof Error
              ? error.message
              : `The Level ${level.number} renderer could not start.`,
          )
          setStatus('error')
        }
      }
    }

    void initialize()

    return () => {
      cancelled = true
      runtimeRef.current?.dispose()
      runtimeRef.current = null
    }
  }, [
    forceWebGl2,
    level,
    resolvedAssets,
    retryKey,
  ])

  useEffect(() => {
    const pauseAfterFocusLoss = () => runtimeRef.current?.setPaused(true)
    const pauseWhenHidden = () => {
      if (document.hidden) {
        pauseAfterFocusLoss()
      }
    }

    window.addEventListener('blur', pauseAfterFocusLoss)
    document.addEventListener('visibilitychange', pauseWhenHidden)
    return () => {
      window.removeEventListener('blur', pauseAfterFocusLoss)
      document.removeEventListener('visibilitychange', pauseWhenHidden)
    }
  }, [])

  const startEngine = () => {
    runtimeRef.current?.startEngine()
    if (pointerYoke) {
      runtimeRef.current?.requestPointerLock()
    }
  }

  const resume = () => {
    setPausePanel(null)
    runtimeRef.current?.setPaused(false)
    if (pointerYoke) {
      runtimeRef.current?.requestPointerLock()
    }
  }

  const restart = () => {
    setPausePanel(null)
    runtimeRef.current?.resetGame()
    runtimeRef.current?.setPaused(false)
  }

  const exitLevel = () => {
    setPausePanel(null)
    runtimeRef.current?.setPaused(true)
    onExit()
  }

  const openPausePanel = (panel: Exclude<PausePanel, null>) => {
    menuAudio.play('click')
    setPausePanel(panel)
  }

  const closePausePanel = () => {
    menuAudio.play('back')
    setPausePanel(null)
  }

  const toggleMusic = () => {
    const enabled = !musicEnabled
    onMusicEnabledChange?.(enabled)
    gameAmbience.configure({ enabled, volume: masterVolume })
    if (enabled) {
      void gameAmbience.unlock()
    }
  }

  const toggleGameplaySounds = () => {
    const enabled = !gameplaySoundsEnabled
    onGameplaySoundsEnabledChange?.(enabled)
    runtimeRef.current?.setGameplayAudioEnabled(enabled)
  }

  return (
    <main className="fixed inset-0 isolate overflow-hidden bg-flight-950 text-flight-100">
      <canvas
        key={`${level.id}-${forceWebGl2 ? 'webgl2-canvas' : 'automatic-canvas'}`}
        ref={canvasRef}
        aria-label={`Level ${level.number} ${level.name} flight course`}
        className="block h-full w-full cursor-crosshair outline-none"
        onClick={() => {
          if (pointerYoke) {
            runtimeRef.current?.requestPointerLock()
          }
        }}
        tabIndex={0}
      />

      {status === 'loading' ? (
        <div className="absolute inset-0 grid place-items-center bg-flight-950/95">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="size-9 animate-spin rounded-full border-2 border-flight-700 border-t-hud" />
            <p className="text-sm font-semibold tracking-[0.2em] text-hud">
              BUILDING {level.name.toUpperCase()}
            </p>
          </div>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="absolute inset-0 grid place-items-center bg-flight-950/95 px-6">
          <section className="w-full max-w-md rounded-xl border border-critical/35 bg-flight-900 p-7 shadow-panel">
            <p className="text-xs font-semibold tracking-[0.18em] text-critical">
              RENDERER UNAVAILABLE
            </p>
            <h1 className="mt-3 text-2xl font-semibold">
              Level {level.number} could not start
            </h1>
            <p className="mt-3 text-sm leading-6 text-flight-300">
              {errorMessage}
            </p>
            <div className="mt-7 flex gap-3">
              <button
                className="rounded-md bg-hud px-4 py-2 text-sm font-semibold text-flight-950 hover:bg-hud-bright"
                onClick={() => setRetryKey((value) => value + 1)}
                type="button"
              >
                Retry
              </button>
              <button
                className="rounded-md border border-flight-700 px-4 py-2 text-sm font-semibold hover:border-flight-500"
                onClick={onExit}
                type="button"
              >
                Exit
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {status === 'ready' && !paused ? (
        <div className="absolute right-6 top-6 flex flex-col gap-2">
          <button
            aria-label={`Pause Level ${level.number}`}
            className="grid size-11 place-items-center rounded-md border border-flight-500/40 bg-flight-950/65 text-flight-100 backdrop-blur hover:border-hud/60 hover:text-hud"
            onClick={() => runtimeRef.current?.setPaused(true)}
            title="Pause"
            type="button"
          >
            <Pause aria-hidden="true" size={18} />
          </button>
          <button
            aria-label={musicEnabled ? 'Turn music off' : 'Turn music on'}
            aria-pressed={musicEnabled}
            className="grid size-11 place-items-center rounded-md border border-flight-500/40 bg-flight-950/65 text-flight-100 backdrop-blur hover:border-hud/60 hover:text-hud data-[active=false]:text-flight-500"
            data-active={musicEnabled}
            onClick={toggleMusic}
            title={musicEnabled ? 'Music on' : 'Music off'}
            type="button"
          >
            {musicEnabled ? (
              <Music aria-hidden="true" size={18} />
            ) : (
              <VolumeX aria-hidden="true" size={18} />
            )}
          </button>
          <button
            aria-label={
              gameplaySoundsEnabled
                ? 'Turn gameplay sounds off'
                : 'Turn gameplay sounds on'
            }
            aria-pressed={gameplaySoundsEnabled}
            className="grid size-11 place-items-center rounded-md border border-flight-500/40 bg-flight-950/65 text-flight-100 backdrop-blur hover:border-hud/60 hover:text-hud data-[active=false]:text-flight-500"
            data-active={gameplaySoundsEnabled}
            onClick={toggleGameplaySounds}
            title={gameplaySoundsEnabled ? 'Gameplay sounds on' : 'Gameplay sounds off'}
            type="button"
          >
            {gameplaySoundsEnabled ? (
              <Volume2 aria-hidden="true" size={18} />
            ) : (
              <VolumeX aria-hidden="true" size={18} />
            )}
          </button>
        </div>
      ) : null}

      {status === 'ready' && gameStatus.phase === 'ready' && !paused ? (
        <div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-5 rounded-lg border border-hud/35 bg-flight-950/85 px-5 py-4 shadow-hud backdrop-blur">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-hud">
              AIRCRAFT PARKED
            </p>
            <p className="mt-1 text-sm text-flight-300">
              Shift throttle · WASD/arrows pitch/roll · Space pause
            </p>
          </div>
          <button
            className="whitespace-nowrap rounded-md bg-hud px-5 py-3 text-sm font-bold text-flight-950 hover:bg-hud-bright"
            onClick={startEngine}
            type="button"
          >
            START ENGINE&nbsp; [I]
          </button>
        </div>
      ) : null}

      {status === 'ready' && paused ? (
        <div className="absolute inset-0 grid place-items-center bg-flight-950/65 px-6 backdrop-blur-sm">
          <section
            aria-labelledby="level-one-paused-title"
            aria-modal="true"
            className="w-full max-w-sm rounded-xl border border-flight-700 bg-flight-900/95 p-7 shadow-panel"
            role="dialog"
          >
            <p className="text-xs font-semibold tracking-[0.2em] text-hud">
              LEVEL {level.number}
            </p>
            <h1 id="level-one-paused-title" className="mt-2 text-3xl font-semibold">
              Paused
            </h1>

            <div className="mt-7 grid gap-2">
              <button
                className="flex items-center gap-3 rounded-md bg-hud px-4 py-3 text-left font-semibold text-flight-950 hover:bg-hud-bright"
                onClick={resume}
                type="button"
              >
                <Play aria-hidden="true" size={18} /> Resume
              </button>
              <button
                className="flex items-center gap-3 rounded-md border border-flight-700 px-4 py-3 text-left font-semibold hover:border-flight-500"
                onClick={restart}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={18} /> Restart level
              </button>
              <button
                className="flex items-center gap-3 rounded-md border border-flight-700 px-4 py-3 text-left font-semibold hover:border-flight-500"
                onClick={() => openPausePanel('controls')}
                type="button"
              >
                <Keyboard aria-hidden="true" size={18} /> Controls
              </button>
              <button
                className="flex items-center gap-3 rounded-md border border-flight-700 px-4 py-3 text-left font-semibold hover:border-flight-500"
                onClick={() => openPausePanel('settings')}
                type="button"
              >
                <Settings aria-hidden="true" size={18} /> Settings
              </button>
              <button
                className="flex items-center gap-3 rounded-md px-4 py-3 text-left font-semibold text-flight-300 hover:bg-flight-800 hover:text-flight-100"
                onClick={exitLevel}
                type="button"
              >
                <LogOut aria-hidden="true" size={18} /> Exit to levels
              </button>
            </div>
          </section>
          <ControlsPanel
            onClose={closePausePanel}
            open={pausePanel === 'controls'}
          />
          <SettingsPanel
            audio={menuAudio}
            onClose={closePausePanel}
            open={pausePanel === 'settings'}
          />
        </div>
      ) : null}

      {status === 'ready' && gameStatus.phase === 'crashed' && !paused ? (
        <div className="absolute inset-0 grid place-items-center bg-black/35 px-6">
          <section className="w-full max-w-sm border-l-2 border-critical bg-flight-950/90 p-7 shadow-panel backdrop-blur">
            <p className="text-xs font-bold tracking-[0.22em] text-critical">
              AIRCRAFT LOST
            </p>
            <h1 className="mt-2 text-4xl font-semibold">Crashed</h1>
            <button
              className="mt-7 flex w-full items-center justify-center gap-3 rounded-md bg-critical px-4 py-3 font-bold text-white hover:brightness-110"
              onClick={restart}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={18} /> Restart [R]
            </button>
          </section>
        </div>
      ) : null}

      {status === 'ready' && gameStatus.phase === 'complete' && !paused ? (
        <div className="absolute inset-0 grid place-items-center bg-flight-950/45 px-6 backdrop-blur-[2px]">
          <section className="w-full max-w-sm border-l-2 border-ready bg-flight-950/92 p-7 shadow-hud">
            <p className="text-xs font-bold tracking-[0.22em] text-ready">
              RUN COMPLETE
            </p>
            <h1 className="mt-2 text-4xl font-semibold">
              Level {level.number} cleared
            </h1>
            <p className="mt-3 text-lg text-hud">{gameStatus.score} points</p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              {onNextLevel ? (
                <button
                  className="col-span-2 flex items-center justify-center gap-2 rounded-md bg-ready px-4 py-3 font-bold text-flight-950 hover:brightness-110"
                  onClick={onNextLevel}
                  type="button"
                >
                  Next level <ArrowRight aria-hidden="true" size={18} />
                </button>
              ) : null}
              <button
                className="rounded-md bg-hud px-4 py-3 font-bold text-flight-950 hover:bg-hud-bright"
                onClick={restart}
                type="button"
              >
                Fly again
              </button>
              <button
                className="rounded-md border border-flight-700 px-4 py-3 font-semibold hover:border-flight-500"
                onClick={exitLevel}
                type="button"
              >
                Exit
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}

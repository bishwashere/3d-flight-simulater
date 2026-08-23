import { LogOut, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useHotkeys, useKeyHold } from '@tanstack/react-hotkeys'

import { LevelOneRuntime } from '../../game/level-one-runtime'
import { resolveLevelOnePerformance } from '../../game/level-one-performance'
import {
  DEFAULT_LEVEL_ONE_ASSETS,
  type LevelOneAssets,
  type LevelOneGameStatus,
  type LevelOnePerformanceSettings,
} from '../../game/level-one-types'

export interface LevelOneScreenProps {
  assets?: LevelOneAssets
  masterVolume?: number
  onExit: () => void
  performance?: LevelOnePerformanceSettings
  pointerYoke?: boolean
}

type LoadingStatus = 'error' | 'loading' | 'ready'

const INITIAL_GAME_STATUS: LevelOneGameStatus = {
  phase: 'ready',
  score: 0,
}

const WEBGPU_FAILURE_SESSION_KEY = 'coastal-flight-webgpu-fallback'

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
  masterVolume = 0.7,
  onExit,
  performance,
  pointerYoke = false,
}: LevelOneScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runtimeRef = useRef<LevelOneRuntime | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [forceWebGl2, setForceWebGl2] = useState(
    hadWebGpuFailureThisSession,
  )
  const [gameStatus, setGameStatus] = useState(INITIAL_GAME_STATUS)
  const [paused, setPaused] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [status, setStatus] = useState<LoadingStatus>('loading')

  const pitchDownHeld = useKeyHold('W')
  const pitchUpHeld = useKeyHold('S')
  const rollLeftHeld = useKeyHold('A')
  const rollRightHeld = useKeyHold('D')
  const yawLeftHeld = useKeyHold('Q')
  const yawRightHeld = useKeyHold('E')
  const throttleUpHeld = useKeyHold('Shift')
  const throttleDownHeld = useKeyHold('Control')
  const brakesHeld = useKeyHold('B')

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
    runtimeRef.current?.setControlInput({
      brakes: brakesHeld,
      pitch: Number(pitchUpHeld) - Number(pitchDownHeld),
      roll: Number(rollRightHeld) - Number(rollLeftHeld),
      throttleDown: throttleDownHeld,
      throttleUp: throttleUpHeld,
      yaw: Number(yawRightHeld) - Number(yawLeftHeld),
    })
  }, [
    brakesHeld,
    pitchDownHeld,
    pitchUpHeld,
    rollLeftHeld,
    rollRightHeld,
    throttleDownHeld,
    throttleUpHeld,
    yawLeftHeld,
    yawRightHeld,
  ])

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
          masterVolume,
          onBackendFailure: () => {
            if (!cancelled) {
              rememberWebGpuFailure()
              setForceWebGl2(true)
              setRetryKey((value) => value + 1)
            }
          },
          onGameStatus: setGameStatus,
          onPauseChange: setPaused,
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
            canvas.dataset.speed = telemetry.speed.toFixed(1)
          },
          performance: resolvedPerformance,
          pointerYoke,
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
          console.error('Level 1 startup failed.', error)
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'The Level 1 renderer could not start.',
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
    masterVolume,
    pointerYoke,
    resolvedAssets,
    resolvedPerformance,
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
    runtimeRef.current?.setPaused(false)
    if (pointerYoke) {
      runtimeRef.current?.requestPointerLock()
    }
  }

  const restart = () => {
    runtimeRef.current?.resetGame()
    runtimeRef.current?.setPaused(false)
  }

  const exitLevel = () => {
    runtimeRef.current?.setPaused(true)
    onExit()
  }

  return (
    <main className="fixed inset-0 isolate overflow-hidden bg-flight-950 text-flight-100">
      <canvas
        key={forceWebGl2 ? 'webgl2-canvas' : 'automatic-canvas'}
        ref={canvasRef}
        aria-label="Level 1 geometric island flight course"
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
              BUILDING ISLAND RUN
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
            <h1 className="mt-3 text-2xl font-semibold">Level 1 could not start</h1>
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
        <button
          aria-label="Pause Level 1"
          className="absolute right-6 top-6 grid size-11 place-items-center rounded-md border border-flight-500/40 bg-flight-950/65 text-flight-100 backdrop-blur hover:border-hud/60 hover:text-hud"
          onClick={() => runtimeRef.current?.setPaused(true)}
          type="button"
        >
          <Pause aria-hidden="true" size={18} />
        </button>
      ) : null}

      {status === 'ready' && gameStatus.phase === 'ready' && !paused ? (
        <div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-5 rounded-lg border border-hud/35 bg-flight-950/85 px-5 py-4 shadow-hud backdrop-blur">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-hud">
              AIRCRAFT PARKED
            </p>
            <p className="mt-1 text-sm text-flight-300">
              Shift throttle · WASD pitch/roll · Q/E yaw · C camera
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
              LEVEL 1
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
                className="flex items-center gap-3 rounded-md px-4 py-3 text-left font-semibold text-flight-300 hover:bg-flight-800 hover:text-flight-100"
                onClick={exitLevel}
                type="button"
              >
                <LogOut aria-hidden="true" size={18} /> Exit to levels
              </button>
            </div>
          </section>
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
            <h1 className="mt-2 text-4xl font-semibold">Level 1 cleared</h1>
            <p className="mt-3 text-lg text-hud">{gameStatus.score} points</p>
            <div className="mt-7 grid grid-cols-2 gap-3">
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

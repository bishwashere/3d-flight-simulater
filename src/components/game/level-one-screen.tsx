import { LogOut, MousePointer2, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useHotkeys, useKeyHold } from '@tanstack/react-hotkeys'

import { LevelOneRuntime } from '../../game/level-one-runtime'
import { resolveLevelOnePerformance } from '../../game/level-one-performance'
import {
  DEFAULT_LEVEL_ONE_ASSETS,
  type LevelOneAssets,
  type LevelOnePerformanceSettings,
} from '../../game/level-one-types'

export interface LevelOneScreenProps {
  assets?: LevelOneAssets
  onExit: () => void
  performance?: LevelOnePerformanceSettings
}

type LoadingStatus = 'error' | 'loading' | 'ready'

export function LevelOneScreen({
  assets,
  onExit,
  performance,
}: LevelOneScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runtimeRef = useRef<LevelOneRuntime | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [paused, setPaused] = useState(false)
  const [pointerLocked, setPointerLocked] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [status, setStatus] = useState<LoadingStatus>('loading')
  const boostHeld = useKeyHold('Shift')

  const resolvedAssets = useMemo<LevelOneAssets>(
    () => ({
      ...DEFAULT_LEVEL_ONE_ASSETS,
      ...assets,
      world: assets?.world ?? DEFAULT_LEVEL_ONE_ASSETS.world,
    }),
    [assets],
  )
  const resolvedPerformance = useMemo(
    () => resolveLevelOnePerformance(performance),
    [performance],
  )

  useHotkeys(
    [
      {
        callback: () => runtimeRef.current?.resetView(),
        hotkey: 'R',
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
    runtimeRef.current?.setBoost(status === 'ready' && boostHeld)
  }, [boostHeld, status])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    let cancelled = false
    setStatus('loading')
    setErrorMessage('')
    setPaused(false)
    setPointerLocked(false)

    const initialize = async () => {
      try {
        const runtime = await LevelOneRuntime.create(canvas, {
          assets: resolvedAssets,
          onPauseChange: setPaused,
          onTelemetry: (telemetry) => {
            canvas.dataset.altitude = telemetry.altitude.toFixed(1)
            canvas.dataset.backend = telemetry.backend
            canvas.dataset.fps = telemetry.fps.toFixed(0)
            canvas.dataset.speed = telemetry.speed.toFixed(1)
            setPointerLocked(telemetry.pointerLocked)
          },
          performance: resolvedPerformance,
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
  }, [resolvedAssets, resolvedPerformance, retryKey])

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

  const resume = () => {
    const runtime = runtimeRef.current
    runtime?.setPaused(false)
    runtime?.requestPointerLock()
  }

  const exitLevel = () => {
    runtimeRef.current?.setPaused(true)
    onExit()
  }

  return (
    <main className="fixed inset-0 isolate overflow-hidden bg-flight-950 text-flight-100">
      <canvas
        ref={canvasRef}
        aria-label="Level 1 airport map free-flight view"
        className="block h-full w-full cursor-crosshair outline-none"
        tabIndex={0}
      />

      {status === 'loading' ? (
        <div className="absolute inset-0 grid place-items-center bg-flight-950/95">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="size-9 animate-spin rounded-full border-2 border-flight-700 border-t-hud" />
            <div>
              <p className="text-sm font-semibold tracking-[0.2em] text-hud">
                PREPARING LEVEL 1
              </p>
              <p className="mt-2 text-sm text-flight-300">
                Loading the airport map…
              </p>
            </div>
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
                Back to levels
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {status === 'ready' && !paused ? (
        <button
          aria-label="Pause map exploration"
          className="absolute right-6 top-6 grid size-11 place-items-center rounded-md border border-flight-500/40 bg-flight-950/65 text-flight-100 backdrop-blur hover:border-hud/60 hover:text-hud"
          onClick={() => runtimeRef.current?.setPaused(true)}
          type="button"
        >
          <Pause aria-hidden="true" size={18} />
        </button>
      ) : null}

      {status === 'ready' && !paused && !pointerLocked ? (
        <button
          className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-hud/30 bg-flight-950/80 px-5 py-3 text-left shadow-hud backdrop-blur hover:border-hud/60"
          onClick={() => runtimeRef.current?.requestPointerLock()}
          type="button"
        >
          <MousePointer2 aria-hidden="true" className="text-hud" size={20} />
          <span>
            <span className="block text-sm font-semibold">Click to look around</span>
            <span className="mt-0.5 block whitespace-nowrap text-xs text-flight-300">
              WASD move · Space/E up · Ctrl/Q down · Shift boost · R reset
            </span>
          </span>
        </button>
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
              Exploration paused
            </h1>
            <p className="mt-2 text-sm text-flight-300">
              KSQL Airport map review
            </p>

            <div className="mt-7 grid gap-2">
              <button
                className="flex items-center gap-3 rounded-md bg-hud px-4 py-3 text-left font-semibold text-flight-950 hover:bg-hud-bright"
                onClick={resume}
                type="button"
              >
                <Play aria-hidden="true" size={18} /> Resume exploration
              </button>
              <button
                className="flex items-center gap-3 rounded-md border border-flight-700 px-4 py-3 text-left font-semibold hover:border-flight-500"
                onClick={() => runtimeRef.current?.resetView()}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={18} /> Reset view
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
    </main>
  )
}

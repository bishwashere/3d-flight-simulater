import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LevelOneGameStatus } from '../../game/level-one-types'
import { useProgressionStore } from '../../state'
import { LevelOneScreen } from './level-one-screen'

const runtimeMock = vi.hoisted(() => {
  let onGameStatus: ((status: LevelOneGameStatus) => void) | undefined

  const readyStatus: LevelOneGameStatus = {
    airborneSeconds: 0,
    coinsCollected: 0,
    distanceTravelled: 0,
    phase: 'ready',
    regionsExplored: 0,
    score: 0,
  }
  const runtime = {
    cycleCamera: vi.fn(),
    dispose: vi.fn(),
    releasePointerLockOrPause: vi.fn(),
    resetGame: vi.fn(() => onGameStatus?.(readyStatus)),
    setControlInput: vi.fn(),
    setGameplayAudioEnabled: vi.fn(),
    setMasterVolume: vi.fn(),
    setPaused: vi.fn(),
    startEngine: vi.fn(),
    toggleControlsHelper: vi.fn(),
    togglePaused: vi.fn(),
  }

  return {
    create: vi.fn(
      async (
        _canvas: HTMLCanvasElement,
        options: { onGameStatus?: (status: LevelOneGameStatus) => void },
      ) => {
        onGameStatus = options.onGameStatus
        return runtime
      },
    ),
    finish: () =>
      onGameStatus?.({
        airborneSeconds: 185,
        coinsCollected: 7,
        distanceTravelled: 12_450,
        phase: 'complete',
        regionsExplored: 5,
        score: 1_840,
      }),
    reset: () => {
      onGameStatus = undefined
    },
    runtime,
  }
})

vi.mock('../../game/level-one-runtime', () => ({
  LevelOneRuntime: { create: runtimeMock.create },
}))

describe('unlimited flight completion flow', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgressionStore.getState().resetProgression()
    runtimeMock.reset()
    vi.clearAllMocks()
  })

  it('shows the accumulated score and flight stats after a manual landing', async () => {
    render(
      <LevelOneScreen
        onComplete={(score) =>
          useProgressionStore.getState().recordFlight(score)
        }
        onExit={vi.fn()}
      />,
    )

    await screen.findByRole('button', { name: 'Pause flight' })
    act(runtimeMock.finish)

    expect(
      screen.getByRole('heading', { name: 'Flight complete' }),
    ).toBeInTheDocument()
    expect(screen.getByText('1,840 points')).toBeInTheDocument()
    expect(screen.getByText('12.4 km')).toBeInTheDocument()
    expect(screen.getByText('3m 5s')).toBeInTheDocument()
    expect(useProgressionStore.getState()).toMatchObject({
      bestScore: 1_840,
      completedFlights: 1,
    })
  })

  it('starts a fresh unlimited run from the result screen', async () => {
    render(<LevelOneScreen onComplete={vi.fn()} onExit={vi.fn()} />)

    await screen.findByRole('button', { name: 'Pause flight' })
    act(runtimeMock.finish)
    fireEvent.click(screen.getByRole('button', { name: 'Fly again' }))

    expect(runtimeMock.runtime.resetGame).toHaveBeenCalledOnce()
    expect(
      screen.queryByRole('heading', { name: 'Flight complete' }),
    ).not.toBeInTheDocument()
  })

  it('toggles pause with Enter', async () => {
    render(
      <LevelOneScreen
        onComplete={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    await screen.findByRole('button', { name: 'Pause flight' })
    fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' })

    expect(runtimeMock.runtime.togglePaused).toHaveBeenCalledOnce()
  })
})

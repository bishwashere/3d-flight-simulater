import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GAME_LEVELS } from '../../config/game-levels'
import { useProgressionStore } from '../../state'
import { LevelOneScreen } from './level-one-screen'

const runtimeMock = vi.hoisted(() => {
  let onGameStatus:
    | ((status: { phase: 'complete'; score: number }) => void)
    | undefined

  const runtime = {
    completeLevel: vi.fn(() => {
      onGameStatus?.({ phase: 'complete', score: 600 })
    }),
    dispose: vi.fn(),
    setControlInput: vi.fn(),
  }

  return {
    create: vi.fn(
      async (
        _canvas: HTMLCanvasElement,
        options: {
          onGameStatus?: (status: { phase: 'complete'; score: number }) => void
        },
      ) => {
        onGameStatus = options.onGameStatus
        return runtime
      },
    ),
    reset: () => {
      onGameStatus = undefined
    },
    runtime,
  }
})

vi.mock('../../game/level-one-runtime', () => ({
  LevelOneRuntime: { create: runtimeMock.create },
}))

describe('level completion cheat', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgressionStore.getState().resetProgression()
    runtimeMock.reset()
    vi.clearAllMocks()
  })

  it('uses the normal completion callback and unlocks the next level', async () => {
    render(
      <LevelOneScreen
        level={GAME_LEVELS[0]}
        onComplete={(score) =>
          useProgressionStore.getState().completeLevel('level-1', score)
        }
        onExit={vi.fn()}
      />,
    )

    await screen.findByRole('button', { name: 'Pause Level 1' })
    fireEvent.keyDown(document, { code: 'KeyL', key: 'l' })
    fireEvent.keyDown(document, { code: 'KeyL', key: 'l', repeat: true })

    expect(runtimeMock.runtime.completeLevel).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole('heading', { name: 'Level 1 cleared' }),
    ).toBeInTheDocument()
    expect(useProgressionStore.getState()).toMatchObject({
      bestScores: { 'level-1': 600 },
      completedLevelIds: ['level-1'],
      unlockedLevelIds: ['level-1', 'level-2'],
    })

    fireEvent.keyUp(document, { code: 'KeyL', key: 'l' })
  })
})

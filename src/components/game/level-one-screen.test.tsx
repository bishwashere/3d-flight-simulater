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
    cycleCamera: vi.fn(),
    dispose: vi.fn(),
    releasePointerLockOrPause: vi.fn(),
    resetGame: vi.fn(),
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

describe('LevelOneScreen completion flow', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgressionStore.getState().resetProgression()
    runtimeMock.reset()
    vi.clearAllMocks()
  })

  it('uses the normal completion callback and unlocks the next level', async () => {
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {})

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
    expect(
      screen.getByRole('form', { name: 'Optional pilot check-in' }),
    ).toBeInTheDocument()
    const username = screen.getByLabelText('Username')
    username.focus()
    expect(
      fireEvent.keyDown(username, { code: 'KeyA', key: 'a' }),
    ).toBe(true)
    expect(
      fireEvent.keyDown(username, { code: 'Space', key: ' ' }),
    ).toBe(true)
    expect(runtimeMock.runtime.completeLevel).toHaveBeenCalledTimes(1)
    expect(runtimeMock.runtime.resetGame).not.toHaveBeenCalled()
    expect(runtimeMock.runtime.togglePaused).not.toHaveBeenCalled()
    fireEvent.blur(window)
    expect(runtimeMock.runtime.setPaused).not.toHaveBeenCalled()
    expect(
      screen.getByRole('form', { name: 'Optional pilot check-in' }),
    ).toBeInTheDocument()

    fireEvent.change(username, {
      target: { value: '  Test Pilot  ' },
    })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: '  PILOT@EXAMPLE.COM  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Check in' }))

    expect(consoleInfo).toHaveBeenCalledWith(
      '[Coastal Flight] Player check-in',
      {
        email: 'pilot@example.com',
        levelId: 'level-1',
        score: 600,
        username: 'Test Pilot',
      },
    )
    expect(screen.getByText('Pilot logged · Test Pilot')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fly again' })).toBeEnabled()

    fireEvent.keyUp(document, { code: 'KeyL', key: 'l' })
    consoleInfo.mockRestore()
  })

  it('skips check-in without logging and keeps completion actions', async () => {
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {})

    render(
      <LevelOneScreen
        level={GAME_LEVELS[0]}
        onComplete={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    await screen.findByRole('button', { name: 'Pause Level 1' })
    fireEvent.keyDown(document, { code: 'KeyL', key: 'l' })
    fireEvent.keyUp(document, { code: 'KeyL', key: 'l' })
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))

    expect(consoleInfo).not.toHaveBeenCalled()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fly again' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Exit' })).toBeEnabled()

    consoleInfo.mockRestore()
  })
})

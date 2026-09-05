import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPilotRecord } from '../../lib/pilot-profile'
import { usePilotProfileStore, useProgressionStore } from '../../state'
import { LevelRoute } from './level-route'

const navigation = vi.hoisted(() => ({
  levelId: 'level-1',
  push: vi.fn(),
  replace: vi.fn(),
}))

const savePilotRecord = vi.hoisted(() =>
  vi.fn(async <T,>(record: T): Promise<T> => record),
)

vi.mock('next/navigation', () => ({
  useParams: () => ({ levelId: navigation.levelId }),
  useRouter: () => ({
    push: navigation.push,
    replace: navigation.replace,
  }),
}))

vi.mock('../../lib/pilot-api', () => ({ savePilotRecord }))

vi.mock('./level-one-screen', () => ({
  LevelOneScreen: ({
    level,
    onComplete,
    onNextLevel,
  }: {
    level: { name: string; number: number }
    onComplete: (score: number) => void
    onNextLevel?: () => void
  }) => (
    <div>
      <p>
        Playing Level {level.number}: {level.name}
      </p>
      <button onClick={() => onComplete(900)} type="button">
        Complete run
      </button>
      {onNextLevel ? (
        <button onClick={onNextLevel} type="button">
          Next level
        </button>
      ) : null}
    </div>
  ),
}))

function renderLevel(path: string) {
  navigation.levelId = path.split('/').at(-1) ?? ''
  return render(<LevelRoute />)
}

describe('level route', () => {
  beforeEach(() => {
    localStorage.clear()
    navigation.levelId = 'level-1'
    navigation.push.mockReset()
    navigation.replace.mockReset()
    savePilotRecord.mockClear()
    useProgressionStore.getState().resetProgression()
    usePilotProfileStore.setState({
      hasHydrated: true,
      hasLoadedRemote: true,
      record: createPilotRecord({
        email: 'pilot@example.com',
        username: 'Test Pilot',
      }),
    })
  })

  it.each(['/game/level-2', '/game/not-a-level'])(
    'redirects guarded URL %s to level select',
    async (path) => {
      renderLevel(path)

      await waitFor(() => {
        expect(navigation.replace).toHaveBeenCalledWith('/play')
      })
    },
  )

  it('starts the level without asking for a pilot profile first', () => {
    usePilotProfileStore.setState({ record: null })
    renderLevel('/game/level-1')

    expect(screen.getByText(/Playing Level 1: First Flight/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Identify pilot' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('form', { name: 'Pilot profile' }),
    ).not.toBeInTheDocument()
  })

  it('lets an unidentified pilot skip saving a completed run', () => {
    usePilotProfileStore.setState({ record: null })
    renderLevel('/game/level-1')

    fireEvent.click(screen.getByRole('button', { name: 'Complete run' }))

    expect(
      screen.getByRole('heading', { name: 'Save this run?' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Score 900')).toBeInTheDocument()
    expect(useProgressionStore.getState()).toMatchObject({
      bestScores: { 'level-1': 0 },
      completedLevelIds: [],
      unlockedLevelIds: ['level-1'],
    })
    expect(savePilotRecord).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Skip saving' }))

    expect(
      screen.queryByRole('heading', { name: 'Save this run?' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Next level' }),
    ).not.toBeInTheDocument()
  })

  it('saves an unidentified pilot after completion when requested', async () => {
    usePilotProfileStore.setState({ record: null })
    renderLevel('/game/level-1')

    fireEvent.click(screen.getByRole('button', { name: 'Complete run' }))
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'New Pilot' },
    })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'new@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save progress' }))

    await waitFor(() => {
      expect(savePilotRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          levels: [{ id: 1, passed: true, score: 900 }],
          username: 'New Pilot',
        }),
      )
    })

    expect(useProgressionStore.getState()).toMatchObject({
      bestScores: { 'level-1': 900 },
      completedLevelIds: ['level-1'],
      unlockedLevelIds: ['level-1', 'level-2'],
    })
    expect(screen.getByRole('button', { name: 'Next level' })).toBeInTheDocument()
  })

  it('records completion, syncs the score, and continues to the next level', async () => {
    const view = renderLevel('/game/level-1')

    expect(screen.getByText(/Playing Level 1: First Flight/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Complete run' }))
    expect(useProgressionStore.getState()).toMatchObject({
      bestScores: { 'level-1': 900 },
      completedLevelIds: ['level-1'],
      unlockedLevelIds: ['level-1', 'level-2'],
    })

    await waitFor(() => {
      expect(savePilotRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'pilot@example.com',
          levels: [{ id: 1, passed: true, score: 900 }],
        }),
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Next level' }))
    expect(navigation.push).toHaveBeenCalledWith('/game/level-2')

    navigation.levelId = 'level-2'
    view.rerender(<LevelRoute />)
    expect(screen.getByText(/Playing Level 2: Island Bend/i)).toBeInTheDocument()
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useProgressionStore } from '../../state'
import { LevelRoute } from './level-route'

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
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/game/:levelId" element={<LevelRoute />} />
        <Route path="/play" element={<p>Level select</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('level route', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgressionStore.getState().resetProgression()
  })

  it.each(['/game/level-2', '/game/not-a-level'])(
    'redirects guarded URL %s to level select',
    (path) => {
      renderLevel(path)

      expect(screen.getByText('Level select')).toBeInTheDocument()
    },
  )

  it('records completion and continues to the unlocked next level', () => {
    renderLevel('/game/level-1')

    expect(screen.getByText(/Playing Level 1: First Flight/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Complete run' }))
    expect(useProgressionStore.getState()).toMatchObject({
      bestScores: { 'level-1': 900 },
      completedLevelIds: ['level-1'],
      unlockedLevelIds: ['level-1', 'level-2'],
    })

    fireEvent.click(screen.getByRole('button', { name: 'Next level' }))
    expect(screen.getByText(/Playing Level 2: Island Bend/i)).toBeInTheDocument()
  })
})

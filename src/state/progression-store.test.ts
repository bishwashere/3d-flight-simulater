import { beforeEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_PROGRESSION,
  PROGRESSION_STORAGE_KEY,
  progressionSchema,
  useProgressionStore,
} from './progression-store'

describe('unlimited-flight progression store', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgressionStore.getState().resetProgression()
  })

  it('starts with one score and no level unlock state', () => {
    expect(useProgressionStore.getState()).toMatchObject({
      bestScore: 0,
      completedFlights: 0,
    })
  })

  it('counts safely landed flights and preserves the personal best', () => {
    const progression = useProgressionStore.getState()
    progression.recordFlight(120.9)
    progression.recordFlight(50)
    progression.recordFlight(275)

    expect(useProgressionStore.getState()).toMatchObject({
      bestScore: 275,
      completedFlights: 3,
    })
  })

  it('ignores invalid scores', () => {
    const progression = useProgressionStore.getState()
    progression.recordFlight(Number.NaN)
    progression.recordFlight(-10)
    expect(useProgressionStore.getState()).toMatchObject(DEFAULT_PROGRESSION)
  })

  it('migrates the highest old level score without retaining levels', () => {
    expect(
      progressionSchema.parse({
        bestScores: {
          'level-1': 42.8,
          'level-2': 910.9,
          'level-3': Number.POSITIVE_INFINITY,
        },
        completedLevelIds: ['level-1', 'level-2'],
      }),
    ).toEqual({
      bestScore: 910,
      completedFlights: 2,
    })
    expect(progressionSchema.parse(null)).toEqual(DEFAULT_PROGRESSION)
  })

  it('imports cloud progress without counting another landing', () => {
    useProgressionStore.getState().recordFlight(300)
    useProgressionStore.getState().importProgress({
      bestScore: 500,
      completedFlights: 8,
    })
    expect(useProgressionStore.getState()).toMatchObject({
      bestScore: 500,
      completedFlights: 8,
    })
  })

  it('persists only the normalized unlimited-flight summary', () => {
    useProgressionStore.getState().recordFlight(80)

    const persisted = JSON.parse(
      localStorage.getItem(PROGRESSION_STORAGE_KEY) ?? '{}',
    ) as { state?: Record<string, unknown> }
    expect(persisted.state).toEqual({ bestScore: 80, completedFlights: 1 })
    expect(persisted.state?.recordFlight).toBeUndefined()
  })

  it('resets all flight history', () => {
    useProgressionStore.getState().recordFlight(300)
    useProgressionStore.getState().resetProgression()
    expect(useProgressionStore.getState()).toMatchObject(DEFAULT_PROGRESSION)
  })
})

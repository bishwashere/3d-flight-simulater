import { beforeEach, describe, expect, it } from 'vitest'
import type { GameLevelId } from '../config/game-levels'
import {
  DEFAULT_PROGRESSION,
  PROGRESSION_STORAGE_KEY,
  progressionSchema,
  useProgressionStore,
} from './progression-store'

describe('progression store', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgressionStore.getState().resetProgression()
  })

  it('starts with only level one unlocked', () => {
    const progression = useProgressionStore.getState()

    expect(progression.completedLevelIds).toEqual([])
    expect(progression.unlockedLevelIds).toEqual(['level-1'])
    expect(progression.bestScores).toEqual({
      'level-1': 0,
      'level-2': 0,
      'level-3': 0,
    })
    expect(progression.isUnlocked('level-1')).toBe(true)
    expect(progression.isUnlocked('level-2')).toBe(false)
  })

  it('unlocks levels in order and records integer best scores', () => {
    useProgressionStore.getState().completeLevel('level-1', 120.9)

    expect(useProgressionStore.getState()).toMatchObject({
      bestScores: { 'level-1': 120, 'level-2': 0, 'level-3': 0 },
      completedLevelIds: ['level-1'],
      unlockedLevelIds: ['level-1', 'level-2'],
    })

    useProgressionStore.getState().completeLevel('level-2', 275)

    expect(useProgressionStore.getState()).toMatchObject({
      bestScores: { 'level-1': 120, 'level-2': 275, 'level-3': 0 },
      completedLevelIds: ['level-1', 'level-2'],
      unlockedLevelIds: ['level-1', 'level-2', 'level-3'],
    })
  })

  it('does not complete a locked level', () => {
    useProgressionStore.getState().completeLevel('level-2', 500)

    expect(useProgressionStore.getState()).toMatchObject(DEFAULT_PROGRESSION)
  })

  it('keeps the highest score and never duplicates completed ids', () => {
    const progression = useProgressionStore.getState()

    progression.completeLevel('level-1', 100)
    progression.completeLevel('level-1', 50)
    progression.completeLevel('level-1', 225)

    expect(useProgressionStore.getState().bestScores['level-1']).toBe(225)
    expect(useProgressionStore.getState().completedLevelIds).toEqual([
      'level-1',
    ])
  })

  it('ignores invalid runtime calls without corrupting progression', () => {
    const progression = useProgressionStore.getState()

    progression.completeLevel('level-4' as GameLevelId, 100)
    progression.completeLevel('level-1', Number.NaN)
    progression.completeLevel('level-1', -10)

    expect(progression.isUnlocked('level-4' as GameLevelId)).toBe(false)
    expect(useProgressionStore.getState()).toMatchObject(DEFAULT_PROGRESSION)
  })

  it('normalizes malformed persisted data and enforces prerequisites', () => {
    expect(
      progressionSchema.parse({
        bestScores: {
          'level-1': 42.8,
          'level-2': -50,
          'level-3': Number.POSITIVE_INFINITY,
          'level-4': 999,
        },
        completedLevelIds: [
          'level-1',
          'level-1',
          'level-3',
          'level-4',
        ],
        unlockedLevelIds: ['level-3'],
      }),
    ).toEqual({
      bestScores: { 'level-1': 42, 'level-2': 0, 'level-3': 0 },
      completedLevelIds: ['level-1'],
      unlockedLevelIds: ['level-1', 'level-2'],
    })

    expect(progressionSchema.parse(null)).toEqual(DEFAULT_PROGRESSION)
  })

  it('persists only serializable progression and restores normalized data', async () => {
    useProgressionStore.getState().completeLevel('level-1', 80)

    const persisted = JSON.parse(
      localStorage.getItem(PROGRESSION_STORAGE_KEY) ?? '{}',
    ) as { state?: Record<string, unknown> }

    expect(persisted.state).toEqual({
      bestScores: { 'level-1': 80, 'level-2': 0, 'level-3': 0 },
      completedLevelIds: ['level-1'],
    })
    expect(persisted.state?.completeLevel).toBeUndefined()

    localStorage.setItem(
      PROGRESSION_STORAGE_KEY,
      JSON.stringify({
        state: {
          bestScores: { 'level-1': 91.7 },
          completedLevelIds: ['level-1'],
        },
        version: 1,
      }),
    )

    await useProgressionStore.persist.rehydrate()

    expect(useProgressionStore.getState()).toMatchObject({
      bestScores: { 'level-1': 91, 'level-2': 0, 'level-3': 0 },
      completedLevelIds: ['level-1'],
      unlockedLevelIds: ['level-1', 'level-2'],
    })
  })

  it('resets all progression', () => {
    useProgressionStore.getState().completeLevel('level-1', 300)
    useProgressionStore.getState().resetProgression()

    expect(useProgressionStore.getState()).toMatchObject(DEFAULT_PROGRESSION)
  })
})

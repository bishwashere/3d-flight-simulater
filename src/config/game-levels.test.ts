import { describe, expect, it } from 'vitest'

import {
  GAME_LEVELS,
  getGameLevel,
  getLevelPath,
} from './game-levels'

describe('game level definitions', () => {
  it('defines three ordered levels with increasingly longer routes', () => {
    expect(GAME_LEVELS.map((level) => level.id)).toEqual([
      'level-1',
      'level-2',
      'level-3',
    ])
    expect(GAME_LEVELS.map((level) => level.number)).toEqual([1, 2, 3])
    expect(GAME_LEVELS.map((level) => level.theme)).toEqual([
      'cyan',
      'amber',
      'violet',
    ])
    expect(GAME_LEVELS.map((level) => level.checkpointPositions.length)).toEqual([
      3, 6, 9,
    ])
  })

  it('keeps the complete nine-checkpoint route and tower gate in level three', () => {
    const levelThree = getGameLevel('level-3')

    expect(levelThree?.checkpointPositions).toEqual([
      [-610, 55, 360],
      [-440, 115, 650],
      [-210, 185, 820],
      [170, 245, 830],
      [560, 235, 650],
      [820, 175, 300],
      [800, 135, -180],
      [-610, 75, -1_100],
      [-610, 45, -800],
    ])
    expect(levelThree?.towerGateCheckpointIndex).toBe(3)
  })

  it('resolves known levels and rejects unknown route ids', () => {
    expect(getGameLevel('level-2')).toMatchObject({
      difficulty: 'medium',
      name: 'Island Bend',
      number: 2,
    })
    expect(getGameLevel('level-4')).toBeUndefined()
    expect(getGameLevel(undefined)).toBeUndefined()
  })

  it('builds a stable route for each level', () => {
    expect(getLevelPath('level-1')).toBe('/game/level-1')
    expect(getLevelPath('level-2')).toBe('/game/level-2')
    expect(getLevelPath('level-3')).toBe('/game/level-3')
  })
})

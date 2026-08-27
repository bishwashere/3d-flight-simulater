export type GameLevelId = 'level-1' | 'level-2' | 'level-3'

export type GameLevelDifficulty = 'easy' | 'hard' | 'medium'

export type GameLevelTheme = 'amber' | 'cyan' | 'violet'

export type GameLevelCheckpointPosition = readonly [
  x: number,
  y: number,
  z: number,
]

export interface GameLevelDefinition {
  readonly checkpointPositions: readonly GameLevelCheckpointPosition[]
  readonly description: string
  readonly difficulty: GameLevelDifficulty
  readonly id: GameLevelId
  readonly name: string
  readonly number: 1 | 2 | 3
  readonly theme: GameLevelTheme
  /** Zero-based checkpoint index surrounded by the optional tower gate. */
  readonly towerGateCheckpointIndex?: number
}

export const GAME_LEVELS = [
  {
    checkpointPositions: [
      [-610, 55, 360],
      [-610, 72, 620],
      [-610, 86, 860],
    ],
    description: 'A straight coastal departure and calm return approach.',
    difficulty: 'easy',
    id: 'level-1',
    name: 'First Flight',
    number: 1,
    theme: 'cyan',
  },
  {
    checkpointPositions: [
      [-610, 55, 360],
      [-520, 78, 580],
      [-400, 105, 760],
      [-520, 105, 900],
      [-700, 75, 760],
      [-610, 40, 600],
    ],
    description: 'A wider island route with smooth climbing turns.',
    difficulty: 'medium',
    id: 'level-2',
    name: 'Island Bend',
    number: 2,
    theme: 'amber',
  },
  {
    checkpointPositions: [
      [-610, 55, 360],
      [-440, 115, 650],
      [-210, 185, 820],
      [170, 245, 830],
      [560, 235, 650],
      [820, 175, 300],
      [800, 135, -180],
      [-610, 75, -1_100],
      [-610, 45, -800],
    ],
    description: 'The complete mountain circuit and precision tower gate.',
    difficulty: 'hard',
    id: 'level-3',
    name: 'Coastal Circuit',
    number: 3,
    theme: 'violet',
    towerGateCheckpointIndex: 3,
  },
] as const satisfies readonly GameLevelDefinition[]

export function getGameLevel(
  levelId: string | undefined,
): GameLevelDefinition | undefined {
  return GAME_LEVELS.find((level) => level.id === levelId)
}

export function getLevelPath(levelId: GameLevelId): string {
  return `/game/${levelId}`
}

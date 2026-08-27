import { z } from 'zod'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { GameLevelId } from '../config/game-levels'

const LEVEL_ORDER = ['level-1', 'level-2', 'level-3'] as const satisfies readonly GameLevelId[]

const levelIdSchema = z.enum(LEVEL_ORDER)

const scoreSchema = z
  .number()
  .finite()
  .nonnegative()
  .transform((score) => Math.min(Number.MAX_SAFE_INTEGER, Math.floor(score)))

const ZERO_BEST_SCORES: Readonly<Record<GameLevelId, number>> = {
  'level-1': 0,
  'level-2': 0,
  'level-3': 0,
}

const bestScoresSchema = z
  .object({
    'level-1': scoreSchema.catch(0),
    'level-2': scoreSchema.catch(0),
    'level-3': scoreSchema.catch(0),
  })
  .catch(ZERO_BEST_SCORES)

const rawProgressionSchema = z.preprocess(
  (value) =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? value
      : {},
  z.object({
    bestScores: bestScoresSchema,
    completedLevelIds: z.array(z.unknown()).catch([]),
  }),
)

export interface ProgressionData {
  bestScores: Record<GameLevelId, number>
  completedLevelIds: GameLevelId[]
  unlockedLevelIds: GameLevelId[]
}

function normalizeCompletedLevelIds(values: unknown[]): GameLevelId[] {
  const requestedLevels = new Set(
    values.flatMap((value) => {
      const parsed = levelIdSchema.safeParse(value)
      return parsed.success ? [parsed.data] : []
    }),
  )
  const completedLevelIds: GameLevelId[] = []

  // A later level cannot be restored as complete without its prerequisites.
  for (const levelId of LEVEL_ORDER) {
    if (!requestedLevels.has(levelId)) {
      break
    }

    completedLevelIds.push(levelId)
  }

  return completedLevelIds
}

function getUnlockedLevelIds(
  completedLevelIds: readonly GameLevelId[],
): GameLevelId[] {
  const unlockedCount = Math.min(
    LEVEL_ORDER.length,
    completedLevelIds.length + 1,
  )

  return LEVEL_ORDER.slice(0, unlockedCount)
}

export const progressionSchema = rawProgressionSchema.transform(
  ({ bestScores, completedLevelIds: storedCompletedLevelIds }) => {
    const completedLevelIds = normalizeCompletedLevelIds(
      storedCompletedLevelIds,
    )

    return {
      bestScores,
      completedLevelIds,
      unlockedLevelIds: getUnlockedLevelIds(completedLevelIds),
    } satisfies ProgressionData
  },
)

export const DEFAULT_PROGRESSION: Readonly<ProgressionData> =
  progressionSchema.parse({})

interface ProgressionActions {
  completeLevel: (levelId: GameLevelId, score: number) => void
  isUnlocked: (levelId: GameLevelId) => boolean
  resetProgression: () => void
}

export type ProgressionState = ProgressionData & ProgressionActions

export const PROGRESSION_STORAGE_KEY = 'coastal-flight-progression'

function createDefaultProgression(): ProgressionData {
  return {
    bestScores: { ...DEFAULT_PROGRESSION.bestScores },
    completedLevelIds: [...DEFAULT_PROGRESSION.completedLevelIds],
    unlockedLevelIds: [...DEFAULT_PROGRESSION.unlockedLevelIds],
  }
}

function mergePersistedProgression(
  persistedState: unknown,
  currentState: ProgressionState,
): ProgressionState {
  return {
    ...currentState,
    ...progressionSchema.parse(persistedState),
  }
}

export const useProgressionStore = create<ProgressionState>()(
  persist(
    (set, get) => ({
      ...createDefaultProgression(),
      completeLevel: (levelId, score) => {
        const parsedLevelId = levelIdSchema.safeParse(levelId)
        const parsedScore = scoreSchema.safeParse(score)

        if (
          !parsedLevelId.success ||
          !parsedScore.success ||
          !get().unlockedLevelIds.includes(parsedLevelId.data)
        ) {
          return
        }

        set((state) => {
          const normalizedLevelId = parsedLevelId.data
          const normalizedScore = parsedScore.data
          const wasCompleted = state.completedLevelIds.includes(
            normalizedLevelId,
          )
          const previousBest = state.bestScores[normalizedLevelId]

          if (wasCompleted && normalizedScore <= previousBest) {
            return state
          }

          const completedLevelIds = wasCompleted
            ? state.completedLevelIds
            : normalizeCompletedLevelIds([
                ...state.completedLevelIds,
                normalizedLevelId,
              ])

          return {
            bestScores: {
              ...state.bestScores,
              [normalizedLevelId]: Math.max(previousBest, normalizedScore),
            },
            completedLevelIds,
            unlockedLevelIds: getUnlockedLevelIds(completedLevelIds),
          }
        })
      },
      isUnlocked: (levelId) => {
        const parsedLevelId = levelIdSchema.safeParse(levelId)
        return (
          parsedLevelId.success &&
          get().unlockedLevelIds.includes(parsedLevelId.data)
        )
      },
      resetProgression: () => set(createDefaultProgression()),
    }),
    {
      merge: mergePersistedProgression,
      migrate: (persistedState) => progressionSchema.parse(persistedState),
      name: PROGRESSION_STORAGE_KEY,
      partialize: (state) => ({
        bestScores: state.bestScores,
        completedLevelIds: state.completedLevelIds,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
)

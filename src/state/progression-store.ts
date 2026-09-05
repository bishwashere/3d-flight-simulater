import { z } from 'zod'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const scoreSchema = z
  .number()
  .finite()
  .nonnegative()
  .transform((score) => Math.min(Number.MAX_SAFE_INTEGER, Math.floor(score)))

const flightCountSchema = z
  .number()
  .finite()
  .nonnegative()
  .transform((count) => Math.min(Number.MAX_SAFE_INTEGER, Math.floor(count)))

const legacyBestScoresSchema = z.record(z.string(), z.unknown()).catch({})

const rawProgressionSchema = z.preprocess(
  (value) =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? value
      : {},
  z.object({
    bestScore: scoreSchema.catch(0),
    bestScores: legacyBestScoresSchema,
    completedFlights: flightCountSchema.catch(0),
    completedLevelIds: z.array(z.unknown()).catch([]),
  }),
)

export interface ProgressionData {
  bestScore: number
  completedFlights: number
}

/** Migrates former per-level saves into one unlimited-flight personal best. */
export const progressionSchema = rawProgressionSchema.transform(
  ({ bestScore, bestScores, completedFlights, completedLevelIds }) => {
    const legacyScores = Object.values(bestScores).flatMap((value) => {
      const result = scoreSchema.safeParse(value)
      return result.success ? [result.data] : []
    })

    return {
      bestScore: Math.max(bestScore, 0, ...legacyScores),
      completedFlights: Math.max(completedFlights, completedLevelIds.length),
    } satisfies ProgressionData
  },
)

export const DEFAULT_PROGRESSION: Readonly<ProgressionData> =
  progressionSchema.parse({})

interface ProgressionActions {
  importProgress: (progress: Partial<ProgressionData>) => void
  recordFlight: (score: number) => void
  resetProgression: () => void
}

export type ProgressionState = ProgressionData & ProgressionActions

export const PROGRESSION_STORAGE_KEY = 'coastal-flight-progression'

function createDefaultProgression(): ProgressionData {
  return { ...DEFAULT_PROGRESSION }
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
    (set) => ({
      ...createDefaultProgression(),
      importProgress: (progress) => {
        const normalized = progressionSchema.parse(progress)
        set((state) => ({
          bestScore: Math.max(state.bestScore, normalized.bestScore),
          completedFlights: Math.max(
            state.completedFlights,
            normalized.completedFlights,
          ),
        }))
      },
      recordFlight: (score) => {
        const parsedScore = scoreSchema.safeParse(score)
        if (!parsedScore.success) {
          return
        }

        set((state) => ({
          bestScore: Math.max(state.bestScore, parsedScore.data),
          completedFlights: Math.min(
            Number.MAX_SAFE_INTEGER,
            state.completedFlights + 1,
          ),
        }))
      },
      resetProgression: () => set(createDefaultProgression()),
    }),
    {
      merge: mergePersistedProgression,
      migrate: (persistedState) => progressionSchema.parse(persistedState),
      name: PROGRESSION_STORAGE_KEY,
      partialize: (state) => ({
        bestScore: state.bestScore,
        completedFlights: state.completedFlights,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 2,
    },
  ),
)

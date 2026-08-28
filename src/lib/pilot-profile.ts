import { z } from 'zod'

import { GAME_LEVELS, type GameLevelId } from '../config/game-levels'
import type { ProgressionData } from '../state/progression-store'

export const pilotIdentitySchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address')
    .max(254, 'Email is too long'),
  username: z
    .string()
    .trim()
    .min(2, 'Use at least 2 characters')
    .max(24, 'Use 24 characters or fewer')
    .regex(
      /^[\p{L}\p{N}_. -]+$/u,
      'Use letters, numbers, spaces, dots, dashes, or underscores',
    ),
})

const levelNumberSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
])

const levelScoreSchema = z
  .number()
  .finite()
  .nonnegative()
  .transform((score) => Math.min(Number.MAX_SAFE_INTEGER, Math.floor(score)))

export const pilotLevelSchema = z.object({
  id: levelNumberSchema,
  passed: z.boolean(),
  score: levelScoreSchema,
})

export const pilotRecordSchema = pilotIdentitySchema.extend({
  levels: z.array(pilotLevelSchema).max(GAME_LEVELS.length),
})

export type PilotIdentity = z.output<typeof pilotIdentitySchema>
export type PilotLevel = z.output<typeof pilotLevelSchema>
export type PilotRecord = z.output<typeof pilotRecordSchema>

export const FLIGHT_SIMULATOR_R2_PREFIX = 'flight-simulator'

export function getPilotObjectKey(email: string): string {
  const normalizedEmail = pilotIdentitySchema.shape.email.parse(email)
  return `${FLIGHT_SIMULATOR_R2_PREFIX}/users/${encodeURIComponent(normalizedEmail)}.json`
}

export function createPilotRecord(
  identity: PilotIdentity,
  progression?: Pick<ProgressionData, 'bestScores' | 'completedLevelIds'>,
): PilotRecord {
  const normalizedIdentity = pilotIdentitySchema.parse(identity)
  const completedLevels = new Set(progression?.completedLevelIds ?? [])
  const levels = progression
    ? GAME_LEVELS.flatMap((level) => {
        const score = progression.bestScores[level.id]
        const passed = completedLevels.has(level.id)

        return passed || score > 0
          ? [{ id: level.number, passed, score } satisfies PilotLevel]
          : []
      })
    : []

  return pilotRecordSchema.parse({
    ...normalizedIdentity,
    levels,
  })
}

export function mergePilotRecords(
  currentRecord: PilotRecord,
  incomingRecord: PilotRecord,
): PilotRecord {
  const current = pilotRecordSchema.parse(currentRecord)
  const incoming = pilotRecordSchema.parse(incomingRecord)

  if (current.email !== incoming.email) {
    return incoming
  }

  const levels = new Map<number, PilotLevel>()

  for (const level of [...current.levels, ...incoming.levels]) {
    const previous = levels.get(level.id)
    levels.set(level.id, {
      id: level.id,
      passed: Boolean(previous?.passed || level.passed),
      score: Math.max(previous?.score ?? 0, level.score),
    })
  }

  return pilotRecordSchema.parse({
    email: incoming.email,
    levels: [...levels.values()].sort((a, b) => a.id - b.id),
    username: incoming.username,
  })
}

export function getGameLevelId(levelNumber: PilotLevel['id']): GameLevelId {
  return `level-${levelNumber}`
}

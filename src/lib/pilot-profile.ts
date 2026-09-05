import { z } from 'zod'

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

const legacyLevelSchema = z.object({
  id: z.number().int().positive(),
  passed: z.boolean(),
  score: scoreSchema,
})

const rawPilotRecordSchema = pilotIdentitySchema.extend({
  bestScore: scoreSchema.catch(0),
  completedFlights: flightCountSchema.catch(0),
  /** Accepted only to migrate records written by the former level system. */
  levels: z.array(legacyLevelSchema).catch([]),
})

export const pilotRecordSchema = rawPilotRecordSchema.transform(
  ({ bestScore, completedFlights, email, levels, username }) => ({
    bestScore: Math.max(bestScore, 0, ...levels.map((level) => level.score)),
    completedFlights: Math.max(
      completedFlights,
      levels.filter((level) => level.passed).length,
    ),
    email,
    username,
  }),
)

export type PilotIdentity = z.output<typeof pilotIdentitySchema>
export type PilotRecord = z.output<typeof pilotRecordSchema>

export const FLIGHT_SIMULATOR_R2_PREFIX = 'flight-simulator'

export function getPilotObjectKey(email: string): string {
  const normalizedEmail = pilotIdentitySchema.shape.email.parse(email)
  return `${FLIGHT_SIMULATOR_R2_PREFIX}/users/${encodeURIComponent(normalizedEmail)}.json`
}

export function createPilotRecord(
  identity: PilotIdentity,
  progression?: Pick<ProgressionData, 'bestScore' | 'completedFlights'>,
): PilotRecord {
  return pilotRecordSchema.parse({
    ...pilotIdentitySchema.parse(identity),
    bestScore: progression?.bestScore ?? 0,
    completedFlights: progression?.completedFlights ?? 0,
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

  return pilotRecordSchema.parse({
    bestScore: Math.max(current.bestScore, incoming.bestScore),
    completedFlights: Math.max(
      current.completedFlights,
      incoming.completedFlights,
    ),
    email: incoming.email,
    username: incoming.username,
  })
}

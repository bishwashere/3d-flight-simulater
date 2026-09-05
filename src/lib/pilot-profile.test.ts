import { describe, expect, it } from 'vitest'

import {
  createPilotRecord,
  getPilotObjectKey,
  mergePilotRecords,
  pilotRecordSchema,
} from './pilot-profile'

describe('pilot profile', () => {
  it('stores a single unlimited-flight personal best', () => {
    expect(
      createPilotRecord(
        { email: '  PILOT@example.com ', username: ' Sky Pilot ' },
        { bestScore: 945.9, completedFlights: 4 },
      ),
    ).toEqual({
      bestScore: 945,
      completedFlights: 4,
      email: 'pilot@example.com',
      username: 'Sky Pilot',
    })
  })

  it('migrates the best former level score into the unlimited record', () => {
    expect(
      pilotRecordSchema.parse({
        email: 'pilot@example.com',
        levels: [
          { id: 1, passed: true, score: 800 },
          { id: 2, passed: true, score: 1_200 },
        ],
        username: 'Pilot',
      }),
    ).toEqual({
      bestScore: 1_200,
      completedFlights: 2,
      email: 'pilot@example.com',
      username: 'Pilot',
    })
  })

  it('merges devices without lowering a best score or flight count', () => {
    expect(
      mergePilotRecords(
        {
          bestScore: 1_200,
          completedFlights: 8,
          email: 'pilot@example.com',
          username: 'Old Name',
        },
        {
          bestScore: 900,
          completedFlights: 10,
          email: 'pilot@example.com',
          username: 'New Name',
        },
      ),
    ).toEqual({
      bestScore: 1_200,
      completedFlights: 10,
      email: 'pilot@example.com',
      username: 'New Name',
    })
  })

  it('isolates normalized pilot records below the R2 prefix', () => {
    expect(getPilotObjectKey('PILOT@example.com')).toBe(
      'flight-simulator/users/pilot%40example.com.json',
    )
  })
})

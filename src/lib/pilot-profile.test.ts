import { describe, expect, it } from 'vitest'

import { DEFAULT_PROGRESSION } from '../state/progression-store'
import {
  createPilotRecord,
  getPilotObjectKey,
  mergePilotRecords,
} from './pilot-profile'

describe('pilot profile', () => {
  it('normalizes identity and maps completed progression to numeric levels', () => {
    expect(
      createPilotRecord(
        { email: '  PILOT@EXAMPLE.COM ', username: '  Sky Pilot  ' },
        {
          ...DEFAULT_PROGRESSION,
          bestScores: {
            ...DEFAULT_PROGRESSION.bestScores,
            'level-1': 945.9,
          },
          completedLevelIds: ['level-1'],
        },
      ),
    ).toEqual({
      email: 'pilot@example.com',
      levels: [{ id: 1, passed: true, score: 945 }],
      username: 'Sky Pilot',
    })
  })

  it('merges existing scores without losing passed levels', () => {
    expect(
      mergePilotRecords(
        {
          email: 'pilot@example.com',
          levels: [{ id: 1, passed: true, score: 1200 }],
          username: 'Old Name',
        },
        {
          email: 'pilot@example.com',
          levels: [
            { id: 1, passed: false, score: 900 },
            { id: 2, passed: true, score: 700 },
          ],
          username: 'New Name',
        },
      ),
    ).toEqual({
      email: 'pilot@example.com',
      levels: [
        { id: 1, passed: true, score: 1200 },
        { id: 2, passed: true, score: 700 },
      ],
      username: 'New Name',
    })
  })

  it('builds one safe R2 key per normalized email', () => {
    expect(getPilotObjectKey(' Pilot+One@Example.com ')).toBe(
      'flight-simulator/users/pilot%2Bone%40example.com.json',
    )
  })
})

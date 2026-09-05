import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { describe, expect, it, vi } from 'vitest'

import { createPilotRepository } from './r2-pilot-repository'

type PilotObjectClient = Parameters<typeof createPilotRepository>[0]

describe('R2 pilot repository', () => {
  it('creates a JSON object when the email has no existing record', async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce({
        $metadata: { httpStatusCode: 404 },
        name: 'NoSuchKey',
      })
      .mockResolvedValueOnce({})
    const repository = createPilotRepository(
      { send } as unknown as PilotObjectClient,
      'wander-place-data',
    )
    const record = {
      bestScore: 0,
      completedFlights: 0,
      email: 'pilot@example.com',
      username: 'Sky Pilot',
    }

    await expect(repository.upsert(record)).resolves.toEqual(record)
    const getCommand = send.mock.calls[0]?.[0]
    expect(getCommand).toBeInstanceOf(GetObjectCommand)
    expect((getCommand as GetObjectCommand).input).toMatchObject({
      Bucket: 'wander-place-data',
      Key: 'flight-simulator/users/pilot%40example.com.json',
    })
    const putCommand = send.mock.calls[1]?.[0]
    expect(putCommand).toBeInstanceOf(PutObjectCommand)
    expect((putCommand as PutObjectCommand).input).toMatchObject({
      Bucket: 'wander-place-data',
      ContentType: 'application/json; charset=utf-8',
      Key: 'flight-simulator/users/pilot%40example.com.json',
    })
    expect(
      JSON.parse(String((putCommand as PutObjectCommand).input.Body)),
    ).toEqual(record)
  })

  it('updates the record while preserving the best unlimited-flight score', async () => {
    const storedRecord = {
      bestScore: 1_500,
      completedFlights: 6,
      email: 'pilot@example.com',
      username: 'Stored Pilot',
    }
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        Body: {
          transformToString: vi.fn(async () => JSON.stringify(storedRecord)),
        },
      })
      .mockResolvedValueOnce({})
    const repository = createPilotRepository(
      { send } as unknown as PilotObjectClient,
      'wander-place-data',
    )

    const result = await repository.upsert({
      bestScore: 1_000,
      completedFlights: 8,
      email: 'pilot@example.com',
      username: 'Latest Pilot',
    })

    expect(result).toEqual({
      bestScore: 1_500,
      completedFlights: 8,
      email: 'pilot@example.com',
      username: 'Latest Pilot',
    })
    expect((send.mock.calls[1]![0] as PutObjectCommand).input.Body).toBe(
      JSON.stringify(result),
    )
  })

  it('migrates a stored level record on read', async () => {
    const send = vi.fn().mockResolvedValueOnce({
      Body: {
        transformToString: vi.fn(async () =>
          JSON.stringify({
            email: 'pilot@example.com',
            levels: [{ id: 3, passed: true, score: 2_250 }],
            username: 'Legacy Pilot',
          }),
        ),
      },
    })
    const repository = createPilotRepository(
      { send } as unknown as PilotObjectClient,
      'wander-place-data',
    )

    await expect(repository.get('pilot@example.com')).resolves.toEqual({
      bestScore: 2_250,
      completedFlights: 1,
      email: 'pilot@example.com',
      username: 'Legacy Pilot',
    })
  })
})

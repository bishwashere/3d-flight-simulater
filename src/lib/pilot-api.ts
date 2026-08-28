import { pilotRecordSchema, type PilotRecord } from './pilot-profile'

const PLAYER_API_PATH = '/api/player'

const playerApiResponseSchema = pilotRecordSchema.transform((record) => record)

export class PilotApiError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Pilot sync failed with status ${status}`)
    this.name = 'PilotApiError'
    this.status = status
  }
}

export function isPilotStorageUnconfigured(error: unknown): boolean {
  return error instanceof PilotApiError && error.status === 503
}

async function parseRecordResponse(response: Response): Promise<PilotRecord> {
  if (!response.ok) {
    throw new PilotApiError(response.status)
  }

  return playerApiResponseSchema.parse(await response.json())
}

export async function loadPilotRecord(
  email: string,
  signal?: AbortSignal,
): Promise<PilotRecord | null> {
  const response = await fetch(
    `${PLAYER_API_PATH}?email=${encodeURIComponent(email)}`,
    {
      cache: 'no-store',
      signal,
    },
  )

  if (response.status === 404) {
    return null
  }

  return parseRecordResponse(response)
}

export async function savePilotRecord(
  record: PilotRecord,
): Promise<PilotRecord> {
  const normalizedRecord = pilotRecordSchema.parse(record)
  const response = await fetch(PLAYER_API_PATH, {
    body: JSON.stringify(normalizedRecord),
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    method: 'PUT',
  })

  return parseRecordResponse(response)
}

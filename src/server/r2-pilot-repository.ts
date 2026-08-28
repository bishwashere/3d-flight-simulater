import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3'
import { z } from 'zod'

import {
  getPilotObjectKey,
  mergePilotRecords,
  pilotRecordSchema,
  type PilotRecord,
} from '../lib/pilot-profile'

const r2EnvironmentSchema = z.object({
  R2_ACCESS_KEY_ID: z.string().trim().min(1),
  R2_ACCOUNT_ID: z.string().trim().min(1),
  R2_BUCKET_NAME: z.string().trim().min(1).default('wander-place-data'),
  R2_SECRET_ACCESS_KEY: z.string().trim().min(1),
})

interface PilotObjectClient {
  send: S3Client['send']
}

export interface PilotRepository {
  get: (email: string) => Promise<PilotRecord | null>
  upsert: (record: PilotRecord) => Promise<PilotRecord>
}

export class R2ConfigurationError extends Error {
  constructor() {
    super('Cloudflare R2 is not configured')
    this.name = 'R2ConfigurationError'
  }
}

function isMissingObject(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const candidate = error as {
    $metadata?: { httpStatusCode?: number }
    name?: string
  }

  return (
    candidate.$metadata?.httpStatusCode === 404 ||
    candidate.name === 'NoSuchKey' ||
    candidate.name === 'NotFound'
  )
}

export function createPilotRepository(
  client: PilotObjectClient,
  bucketName: string,
): PilotRepository {
  const get = async (email: string): Promise<PilotRecord | null> => {
    try {
      const object = await client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: getPilotObjectKey(email),
        }),
      )

      if (!object.Body) {
        return null
      }

      return pilotRecordSchema.parse(
        JSON.parse(await object.Body.transformToString()),
      )
    } catch (error) {
      if (isMissingObject(error)) {
        return null
      }

      throw error
    }
  }

  const upsert = async (record: PilotRecord): Promise<PilotRecord> => {
    const incomingRecord = pilotRecordSchema.parse(record)
    const currentRecord = await get(incomingRecord.email)
    const nextRecord = currentRecord
      ? mergePilotRecords(currentRecord, incomingRecord)
      : incomingRecord

    await client.send(
      new PutObjectCommand({
        Body: JSON.stringify(nextRecord),
        Bucket: bucketName,
        CacheControl: 'no-store',
        ContentType: 'application/json; charset=utf-8',
        Key: getPilotObjectKey(nextRecord.email),
      }),
    )

    return nextRecord
  }

  return { get, upsert }
}

let repository: PilotRepository | null = null

export function getR2PilotRepository(): PilotRepository {
  if (repository) {
    return repository
  }

  const environmentResult = r2EnvironmentSchema.safeParse(process.env)

  if (!environmentResult.success) {
    throw new R2ConfigurationError()
  }

  const environment = environmentResult.data
  const clientConfig: S3ClientConfig = {
    credentials: {
      accessKeyId: environment.R2_ACCESS_KEY_ID,
      secretAccessKey: environment.R2_SECRET_ACCESS_KEY,
    },
    endpoint: `https://${environment.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    region: 'auto',
  }

  repository = createPilotRepository(
    new S3Client(clientConfig),
    environment.R2_BUCKET_NAME,
  )

  return repository
}

import { pilotIdentitySchema, pilotRecordSchema } from '../../../src/lib/pilot-profile'
import {
  getR2PilotRepository,
  R2ConfigurationError,
} from '../../../src/server/r2-pilot-repository'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    headers: { 'cache-control': 'no-store' },
    status,
  })
}

function storageErrorResponse(error: unknown): Response {
  if (error instanceof R2ConfigurationError) {
    return json({ error: 'Cloudflare R2 is not configured' }, 503)
  }

  console.error('[Coastal Flight] R2 request failed', error)
  return json({ error: 'Pilot storage is unavailable' }, 502)
}

export async function GET(request: Request): Promise<Response> {
  const emailResult = pilotIdentitySchema.shape.email.safeParse(
    new URL(request.url).searchParams.get('email'),
  )

  if (!emailResult.success) {
    return json({ error: 'A valid email is required' }, 400)
  }

  try {
    const record = await getR2PilotRepository().get(emailResult.data)
    return record ? json(record) : json({ error: 'Pilot not found' }, 404)
  } catch (error) {
    return storageErrorResponse(error)
  }
}

export async function PUT(request: Request): Promise<Response> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return json({ error: 'Request body must be valid JSON' }, 400)
  }

  const recordResult = pilotRecordSchema.safeParse(body)

  if (!recordResult.success) {
    return json({ error: 'Pilot record is invalid' }, 400)
  }

  try {
    return json(await getR2PilotRepository().upsert(recordResult.data))
  } catch (error) {
    return storageErrorResponse(error)
  }
}

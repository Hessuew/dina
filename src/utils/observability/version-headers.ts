import {
  buildVersionAffinityCookie,
  hasVersionAffinityCookie,
} from './domain/version-affinity.domain'

export type WorkerVersionMetadata = {
  id: string
  tag: string
  timestamp: string
}

export function addWorkerVersionHeaders(
  response: Response,
  options: unknown,
  request: Request,
): Response {
  const headers = new Headers(response.headers)
  const metadata = readWorkerVersionMetadata(options)
  if (metadata) {
    headers.set('x-dina-worker-version', metadata.id)
    headers.set('x-dina-worker-version-tag', metadata.tag)
  }

  if (!hasVersionAffinityCookie(request.headers.get('Cookie'))) {
    headers.append(
      'Set-Cookie',
      buildVersionAffinityCookie(crypto.randomUUID()),
    )
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function readWorkerVersionMetadata(
  value: unknown,
): WorkerVersionMetadata | null {
  if (!isRecord(value)) return null
  return isWorkerVersionMetadata(value.WORKER_VERSION)
    ? value.WORKER_VERSION
    : null
}

function isWorkerVersionMetadata(
  value: unknown,
): value is WorkerVersionMetadata {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.tag === 'string' &&
    typeof value.timestamp === 'string'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

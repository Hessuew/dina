import { AsyncLocalStorage } from 'node:async_hooks'

type ObservabilityRequestContext = {
  requestId: string
}

const requestStorage = new AsyncLocalStorage<ObservabilityRequestContext>()

export function withObservabilityRequest<T>(
  request: Request | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  if (requestStorage.getStore() || !request) return fn()
  return requestStorage.run({ requestId: readRequestId(request) }, fn)
}

export function getRequestId(): string {
  return requestStorage.getStore()?.requestId ?? 'unknown'
}

export function readRequestId(request: Request): string {
  return (
    request.headers.get('cf-ray') ??
    request.headers.get('x-request-id') ??
    crypto.randomUUID()
  )
}

export function elapsedMs(startedAt: number): number {
  return Math.max(0, Math.round(performance.now() - startedAt))
}

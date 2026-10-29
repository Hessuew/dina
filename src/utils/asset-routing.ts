export type AssetBinding = {
  fetch: (request: Request) => Promise<Response>
}

export type AssetRuntime = {
  ASSETS?: AssetBinding
}

export async function fetchWithAssetFallback(
  request: Request,
  runtime: AssetRuntime,
  fetchApplication: () => Promise<Response>,
): Promise<Response> {
  const applicationResponse = await fetchApplication()
  if (
    applicationResponse.status !== 404 ||
    !runtime.ASSETS ||
    !isStaticAssetRequest(request)
  ) {
    return applicationResponse
  }
  return runtime.ASSETS.fetch(request)
}

function isStaticAssetRequest(request: Request): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false
  return /\.[A-Za-z0-9]+$/u.test(new URL(request.url).pathname)
}

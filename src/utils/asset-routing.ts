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
  if (applicationResponse.status !== 404 || !runtime.ASSETS) {
    return applicationResponse
  }
  return runtime.ASSETS.fetch(request)
}

// fallow-ignore-file unused-file -- shared by direct release scripts

// fallow-ignore-next-line unused-export -- shared by direct release scripts
export async function fetchWithTimeout(
  url: URL,
  init: RequestInit,
  timeoutMs = 30_000,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const body = await response.arrayBuffer()
    const normalizedResponse = new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
    Object.defineProperties(normalizedResponse, {
      redirected: { configurable: true, value: response.redirected },
      url: { configurable: true, value: response.url },
    })
    return normalizedResponse
  } finally {
    clearTimeout(timer)
  }
}

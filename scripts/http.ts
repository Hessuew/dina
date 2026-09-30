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
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  } finally {
    clearTimeout(timer)
  }
}

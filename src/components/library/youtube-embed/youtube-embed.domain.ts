const YOUTUBE_ORIGINS = new Set([
  'https://www.youtube.com',
  'https://youtube.com',
])

type YouTubeMessageData = {
  event?: string
  info?: number | Record<string, unknown>
}

export function parseYouTubeMessage(raw: unknown): YouTubeMessageData | null {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (data && typeof data === 'object') return data as YouTubeMessageData
  } catch {}
  return null
}

export function shouldBlockYouTubePlayback(
  origin: string,
  rawData: unknown,
): boolean {
  if (!YOUTUBE_ORIGINS.has(origin)) return false
  const data = parseYouTubeMessage(rawData)
  if (!data) return false
  return (
    data.event === 'onError' &&
    (data.info === 100 || data.info === 101 || data.info === 150)
  )
}

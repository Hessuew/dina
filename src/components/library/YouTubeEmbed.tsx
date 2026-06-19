import { useEffect, useRef, useState } from 'react'
import { ExternalLinkIcon, PlayIcon } from 'lucide-react'

type Props = {
  videoId: string
  originalUrl: string
}

type YouTubeMessageData = {
  event?: string
  info?: number | Record<string, unknown>
}

function parseYouTubeMessage(raw: unknown): YouTubeMessageData | null {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (data && typeof data === 'object') return data as YouTubeMessageData
  } catch {}
  return null
}

function YouTubeBlockedFallback({
  videoId,
  originalUrl,
}: {
  videoId: string
  originalUrl: string
}) {
  const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-[#0F0C07]">
      {/* Blurred thumbnail aura */}
      <div
        className="absolute inset-0 scale-110 opacity-30 blur-md"
        style={{
          backgroundImage: `url(${thumbnail})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,2,0.82)_0%,rgba(15,12,7,0.88)_100%)]" />

      {/* Inset gold hairline */}
      <div className="pointer-events-none absolute inset-[10px] border border-[#C5A059]/20" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-7 px-8 text-center">
        {/* YouTube badge */}
        <div className="flex items-center gap-1.5 bg-[#FF0000] px-3 py-1.5 shadow-[0_4px_20px_rgba(255,0,0,0.35)]">
          <PlayIcon className="size-3 fill-white text-white" />
          <span className="text-[0.58rem] font-semibold tracking-[0.22em] text-white uppercase">
            YouTube
          </span>
        </div>

        {/* Message */}
        <div className="max-w-sm space-y-2">
          <h3 className="font-serif text-[1.15rem] leading-tight text-[#F8F4EC]">
            This video cannot be played here
          </h3>
          <p className="text-[0.78rem] leading-6 text-[#8E816D]">
            The video owner has restricted playback on external sites. Watch it
            directly on YouTube.
          </p>
        </div>

        {/* CTA */}
        <a
          href={originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2.5 border border-[#C5A059]/45 bg-[#1A1716] px-7 py-3 text-[0.7rem] font-medium tracking-[0.22em] text-[#E9D9B4] uppercase shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white"
        >
          Watch on YouTube
          <ExternalLinkIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>
    </div>
  )
}

export function YouTubeEmbed({ videoId, originalUrl }: Props) {
  const [blocked, setBlocked] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening' }),
        'https://www.youtube.com',
      )
    }, 800)

    const YOUTUBE_ORIGINS = new Set([
      'https://www.youtube.com',
      'https://youtube.com',
    ])

    function handleMessage(event: MessageEvent) {
      if (!YOUTUBE_ORIGINS.has(event.origin)) return
      const data = parseYouTubeMessage(event.data)
      if (!data) return
      if (
        data.event === 'onError' &&
        (data.info === 100 || data.info === 101 || data.info === 150)
      ) {
        setBlocked(true)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  if (blocked) {
    return (
      <YouTubeBlockedFallback videoId={videoId} originalUrl={originalUrl} />
    )
  }

  return (
    <div className="aspect-video w-full">
      <iframe
        ref={iframeRef}
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
        className="size-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

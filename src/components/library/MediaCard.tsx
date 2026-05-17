import { Link } from '@tanstack/react-router'
import { FileTextIcon } from 'lucide-react'
import type { MediaLibraryRow } from '@/utils/library/library'

type MediaCardProps = {
  item: MediaLibraryRow
  viewerRole: 'student' | 'teacher' | 'admin'
}

function getYoutubeVideoId(url: string): string | null {
  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const u = new URL(normalized)
    if (u.hostname === 'youtu.be') return u.pathname.replace('/', '') || null
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      const v = u.searchParams.get('v')
      if (v) return v
      if (u.pathname.startsWith('/embed/'))
        return u.pathname.split('/embed/')[1]?.split('/')[0] ?? null
      if (u.pathname.startsWith('/shorts/'))
        return u.pathname.split('/shorts/')[1]?.split('/')[0] ?? null
    }
    return null
  } catch {
    return null
  }
}

export function MediaCard({ item, viewerRole }: MediaCardProps) {
  const videoId =
    item.fileType === 'video' || item.fileType === 'audio'
      ? getYoutubeVideoId(item.fileUrl)
      : null
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : null

  return (
    <Link
      to="/library/$mediaId"
      params={{ mediaId: item.id }}
      className="group flex w-44 shrink-0 flex-col gap-2"
    >
      <div className="relative aspect-video overflow-hidden border border-white/10 bg-black/20">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={item.title}
            className="size-full object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[#8E816D]">
            <FileTextIcon className="size-5" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/10 via-transparent to-black/50" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="line-clamp-2 text-xs font-medium leading-snug text-[#F8F4EC]">
          {item.title}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="border border-white/12 px-1.5 py-0.5 text-[0.6rem] font-medium tracking-widest text-[#8E816D] uppercase">
            {item.fileType === 'document' ? 'PDF' : 'Video'}
          </span>
          <span className="border border-white/12 px-1.5 py-0.5 text-[0.6rem] font-medium tracking-widest text-[#8E816D] uppercase">
            {item.category}
          </span>
          {viewerRole !== 'student' && !item.isPublished && (
            <span className="border border-white/12 px-1.5 py-0.5 text-[0.6rem] font-medium tracking-widest text-[#8E816D] uppercase">
              Draft
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

import { Link } from '@tanstack/react-router'
import { FileTextIcon, Music2Icon, PlayIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MediaLibraryRow } from '@/utils/library/library'

type MediaCardProps = {
  item: MediaLibraryRow
  viewerRole: 'student' | 'teacher' | 'admin'
  size?: 'default' | 'panel' | 'mobile'
}

type MediaTypeConfig = {
  icon: LucideIcon | null
  label: string
  badgeBg: string
  badgeText: string
  badgeBorder?: string
}

const MEDIA_TYPE_CONFIG = {
  video: {
    icon: PlayIcon,
    label: 'YouTube',
    badgeBg: '#FF0000',
    badgeText: '#FFFFFF',
  } satisfies MediaTypeConfig,
  audio: {
    icon: Music2Icon,
    label: 'Audio',
    badgeBg: '#1A1A2E',
    badgeText: '#B4B0FF',
    badgeBorder: 'rgba(255,255,255,0.18)',
  } satisfies MediaTypeConfig,
  pdf: {
    icon: null,
    label: 'PDF',
    badgeBg: '#C62828',
    badgeText: '#FFFFFF',
  } satisfies MediaTypeConfig,
  pptx: {
    icon: null,
    label: 'PPT',
    badgeBg: '#C43E1C',
    badgeText: '#FFFFFF',
  } satisfies MediaTypeConfig,
  docx: {
    icon: null,
    label: 'DOC',
    badgeBg: '#185ABD',
    badgeText: '#FFFFFF',
  } satisfies MediaTypeConfig,
  fallback: {
    icon: FileTextIcon,
    label: 'File',
    badgeBg: 'rgba(0,0,0,0.6)',
    badgeText: '#D4B373',
    badgeBorder: 'rgba(197,160,89,0.40)',
  } satisfies MediaTypeConfig,
} as const

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

function resolveMediaTypeConfig(item: MediaLibraryRow): MediaTypeConfig {
  if (item.fileType === 'video' || item.fileType === 'audio') {
    return MEDIA_TYPE_CONFIG[item.fileType]
  }
  if (item.fileType === 'document') {
    const ext = item.fileUrl.split('?')[0].split('.').pop()?.toLowerCase()
    if (ext === 'pptx') return MEDIA_TYPE_CONFIG.pptx
    if (ext === 'docx') return MEDIA_TYPE_CONFIG.docx
    return MEDIA_TYPE_CONFIG.pdf
  }
  return MEDIA_TYPE_CONFIG.fallback
}

export function MediaCard({
  item,
  viewerRole,
  size = 'default',
}: MediaCardProps) {
  const videoId =
    item.fileType === 'video' || item.fileType === 'audio'
      ? getYoutubeVideoId(item.fileUrl)
      : null
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : item.thumbnailUrl

  const mediaType = resolveMediaTypeConfig(item)
  const BadgeIcon = mediaType.icon

  const widthClasses = {
    default: 'w-96',
    panel: 'w-80',
    mobile: 'w-full',
  }[size]

  return (
    <div className={`group relative shrink-0 max-sm:w-full ${widthClasses}`}>
      {/* Blurred thumbnail aura behind card */}
      {thumbnailUrl ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-45 blur-2xl transition-opacity duration-700 group-hover:opacity-70"
          style={{
            backgroundImage: `url(${thumbnailUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[#C5A059]/12 opacity-60 blur-2xl transition-opacity duration-700 group-hover:opacity-90" />
      )}

      <Link
        to="/library/$mediaId"
        params={{ mediaId: item.id }}
        className="relative flex aspect-3/2 w-full overflow-hidden border border-[#C5A059]/40 bg-[#0F0C07] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-[#C5A059]/70 group-hover:shadow-[0_0_40px_rgba(197,160,89,0.12)]"
      >
        {/* Background image */}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={item.title}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1A1716]">
            <FileTextIcon className="size-12 text-[#8E816D]" />
          </div>
        )}

        {/* Gradient: darken top + bottom, clear middle */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,2,0.72)_0%,transparent_35%,transparent_55%,rgba(5,4,2,0.92)_100%)]" />

        {/* Inset decorative gold hairline */}
        <div className="pointer-events-none absolute inset-[7px] z-10 border border-[#C5A059]/25 transition-colors duration-300 group-hover:border-[#C5A059]/45" />

        {/* Format badge — top-left corner */}
        <div
          className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2 py-1 shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          style={{
            backgroundColor: mediaType.badgeBg,
            color: mediaType.badgeText,
            border: mediaType.badgeBorder
              ? `1px solid ${mediaType.badgeBorder}`
              : 'none',
          }}
        >
          {BadgeIcon && (
            <BadgeIcon
              className="size-2.5 shrink-0"
              style={{
                fill:
                  mediaType.label === 'YouTube' ? mediaType.badgeText : 'none',
                color: mediaType.badgeText,
              }}
            />
          )}
          <span className="text-[0.58rem] font-semibold tracking-[0.18em] uppercase">
            {mediaType.label}
          </span>
        </div>

        {/* Top-right: Course number + draft badge */}
        <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1">
          {item.courseNumber != null && (
            <span className="border border-[#C5A059]/30 bg-black/50 px-2 py-0.5 text-[0.65rem] font-medium tracking-widest text-[#F8F4EC] uppercase backdrop-blur-sm">
              Course {item.courseNumber}
            </span>
          )}
          {viewerRole !== 'student' && !item.isPublished && (
            <div className="border border-[#9B7A41]/30 bg-black/60 px-1.5 py-0.5 text-[0.6rem] font-medium tracking-widest text-white uppercase">
              Draft
            </div>
          )}
        </div>

        {/* Bottom: gold divider, title, category badge, file type */}
        <div className="absolute right-0 bottom-0 left-0 z-20 p-4">
          <div className="h-px w-7 bg-[#C5A05988]" />
          <h3 className="mt-2 line-clamp-2 font-serif text-base leading-tight font-medium text-white">
            {item.title}
          </h3>
        </div>
      </Link>
    </div>
  )
}

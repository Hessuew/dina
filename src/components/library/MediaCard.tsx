import { Link } from '@tanstack/react-router'
import { FileTextIcon } from 'lucide-react'
import type { MediaLibraryRow } from '@/utils/library/library'
import type {
  MediaCardViewModel,
  MediaTypeConfig,
} from './domain/media-card.domain'
import { buildMediaCardViewModel } from './domain/media-card.domain'

type MediaCardProps = {
  item: MediaLibraryRow
  viewerRole: 'student' | 'teacher' | 'admin'
  size?: 'default' | 'panel' | 'mobile'
}

function MediaCardAura({ thumbnailUrl }: { thumbnailUrl: string | null }) {
  if (!thumbnailUrl) {
    return (
      <div className="pointer-events-none absolute inset-0 bg-[#C5A059]/12 opacity-60 blur-2xl transition-opacity duration-700 group-hover:opacity-90" />
    )
  }
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-45 blur-2xl transition-opacity duration-700 group-hover:opacity-70"
      style={{
        backgroundImage: `url(${thumbnailUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
  )
}

function MediaCardThumbnail({
  thumbnailUrl,
  title,
}: {
  thumbnailUrl: string | null
  title: string
}) {
  if (!thumbnailUrl) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#1A1716]">
        <FileTextIcon className="size-12 text-[#8E816D]" />
      </div>
    )
  }
  return (
    <img
      src={thumbnailUrl}
      alt={title}
      className="absolute inset-0 size-full object-cover"
    />
  )
}

function MediaCardBadge({
  mediaType,
  badgeBorderStyle,
  badgeIconFill,
}: {
  mediaType: MediaTypeConfig
  badgeBorderStyle: string
  badgeIconFill: string
}) {
  const BadgeIcon = mediaType.icon
  return (
    <div
      className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2 py-1 shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
      style={{
        backgroundColor: mediaType.badgeBg,
        color: mediaType.badgeText,
        border: badgeBorderStyle,
      }}
    >
      {BadgeIcon && (
        <BadgeIcon
          className="size-2.5 shrink-0"
          style={{
            fill: badgeIconFill,
            color: mediaType.badgeText,
          }}
        />
      )}
      <span className="text-[0.58rem] font-semibold tracking-[0.18em] uppercase">
        {mediaType.label}
      </span>
    </div>
  )
}

function MediaCardMeta({
  item,
  showCourseNumber,
  showDraftBadge,
}: {
  item: MediaLibraryRow
  showCourseNumber: boolean
  showDraftBadge: boolean
}) {
  return (
    <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1">
      {showCourseNumber && (
        <span className="border border-[#C5A059]/30 bg-black/50 px-2 py-0.5 text-[0.65rem] font-medium tracking-widest text-[#F8F4EC] uppercase backdrop-blur-sm">
          Course {item.courseNumber}
        </span>
      )}
      {showDraftBadge && (
        <div className="border border-[#9B7A41]/30 bg-black/60 px-1.5 py-0.5 text-[0.6rem] font-medium tracking-widest text-white uppercase">
          Draft
        </div>
      )}
    </div>
  )
}

function MediaCardBody({
  item,
  view,
}: {
  item: MediaLibraryRow
  view: MediaCardViewModel
}) {
  return (
    <Link
      to="/library/$mediaId"
      params={{ mediaId: item.id }}
      className="relative flex aspect-3/2 w-full overflow-hidden border border-[#C5A059]/40 bg-[#0F0C07] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-[#C5A059]/70 group-hover:shadow-[0_0_40px_rgba(197,160,89,0.12)]"
    >
      {/* Background image */}
      <MediaCardThumbnail thumbnailUrl={view.thumbnailUrl} title={item.title} />

      {/* Gradient: darken top + bottom, clear middle */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,2,0.72)_0%,transparent_35%,transparent_55%,rgba(5,4,2,0.92)_100%)]" />

      {/* Inset decorative gold hairline */}
      <div className="pointer-events-none absolute inset-[7px] z-10 border border-[#C5A059]/25 transition-colors duration-300 group-hover:border-[#C5A059]/45" />

      {/* Format badge — top-left corner */}
      <MediaCardBadge
        mediaType={view.mediaType}
        badgeBorderStyle={view.badgeBorderStyle}
        badgeIconFill={view.badgeIconFill}
      />

      {/* Top-right: Course number + draft badge */}
      <MediaCardMeta
        item={item}
        showCourseNumber={view.showCourseNumber}
        showDraftBadge={view.showDraftBadge}
      />

      {/* Bottom: gold divider, title, category badge, file type */}
      <div className="absolute right-0 bottom-0 left-0 z-20 p-4">
        <div className="h-px w-7 bg-[#C5A05988]" />
        <h3 className="mt-2 line-clamp-2 font-serif text-base leading-tight font-medium text-white">
          {item.title}
        </h3>
      </div>
    </Link>
  )
}

export function MediaCard({
  item,
  viewerRole,
  size = 'default',
}: MediaCardProps) {
  const view = buildMediaCardViewModel(item, viewerRole, size)

  return (
    <div className={`group relative shrink-0 max-sm:w-full ${view.widthClass}`}>
      {/* Blurred thumbnail aura behind card */}
      <MediaCardAura thumbnailUrl={view.thumbnailUrl} />
      <MediaCardBody item={item} view={view} />
    </div>
  )
}

import { Link } from '@tanstack/react-router'
import {
  BookOpenIcon,
  CrownIcon,
  FileIcon,
  FileTextIcon,
  HeartHandshakeIcon,
  HeartIcon,
  PlayIcon,
  ShieldIcon,
  SparklesIcon,
  StarIcon,
  SwordsIcon,
  TrendingUpIcon,
  UsersIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MediaLibraryRow } from '@/utils/library/library'

type MediaCardProps = {
  item: MediaLibraryRow
  viewerRole: 'student' | 'teacher' | 'admin'
}

type MediaTypeConfig = {
  icon: LucideIcon
  label: string
  circleBg: string
}

type CategoryConfig = {
  icon: LucideIcon
  text: string
  border: string
}

const MEDIA_TYPE_CONFIG = {
  video: {
    icon: PlayIcon,
    label: 'YouTube',
    circleBg: 'bg-[#FF0000]',
  } satisfies MediaTypeConfig,
  audio: {
    icon: PlayIcon,
    label: 'Audio',
    circleBg: 'bg-[#FF0000]',
  } satisfies MediaTypeConfig,
  pdf: {
    icon: FileTextIcon,
    label: 'PDF',
    circleBg: 'bg-[#DC2626]',
  } satisfies MediaTypeConfig,
  pptx: {
    icon: FileIcon,
    label: 'PPTX',
    circleBg: 'bg-[#D24726]',
  } satisfies MediaTypeConfig,
  docx: {
    icon: FileIcon,
    label: 'DOCX',
    circleBg: 'bg-[#2B579A]',
  } satisfies MediaTypeConfig,
  fallback: {
    icon: FileTextIcon,
    label: 'File',
    circleBg: 'bg-[#C5A059]/80',
  } satisfies MediaTypeConfig,
} as const

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  Wisdom: {
    icon: BookOpenIcon,
    text: 'text-[#D4B373]',
    border: 'border-[#C5A059]/40',
  },
  Healing: {
    icon: HeartIcon,
    text: 'text-[#2DD4BF]',
    border: 'border-[#2DD4BF]/30',
  },
  Miracles: {
    icon: SparklesIcon,
    text: 'text-[#C084FC]',
    border: 'border-[#A855F7]/30',
  },
  Kingdom: {
    icon: CrownIcon,
    text: 'text-[#60A5FA]',
    border: 'border-[#3B82F6]/30',
  },
  Faith: {
    icon: StarIcon,
    text: 'text-[#FB923C]',
    border: 'border-[#F97316]/30',
  },
  Marriage: {
    icon: HeartHandshakeIcon,
    text: 'text-[#FB7185]',
    border: 'border-[#F43F5E]/30',
  },
  Finance: {
    icon: TrendingUpIcon,
    text: 'text-[#34D399]',
    border: 'border-[#10B981]/30',
  },
  'Church Growth': {
    icon: UsersIcon,
    text: 'text-[#22D3EE]',
    border: 'border-[#06B6D4]/30',
  },
  "God's Generals Biography": {
    icon: ShieldIcon,
    text: 'text-[#FBBF24]',
    border: 'border-[#F59E0B]/30',
  },
  'Spiritual Warfare': {
    icon: SwordsIcon,
    text: 'text-[#818CF8]',
    border: 'border-[#6366F1]/30',
  },
}

const FALLBACK_CATEGORY: CategoryConfig = {
  icon: FileTextIcon,
  text: 'text-[#D4B373]',
  border: 'border-[#C5A059]/40',
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

export function MediaCard({ item, viewerRole }: MediaCardProps) {
  const videoId =
    item.fileType === 'video' || item.fileType === 'audio'
      ? getYoutubeVideoId(item.fileUrl)
      : null
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : item.thumbnailUrl

  const mediaType = resolveMediaTypeConfig(item)
  const MediaIcon = mediaType.icon

  const categoryConfig = CATEGORY_CONFIG[item.category] ?? FALLBACK_CATEGORY
  const CategoryIcon = categoryConfig.icon

  return (
    <Link
      to="/library/$mediaId"
      params={{ mediaId: item.id }}
      className="group relative flex aspect-3/2 w-80 shrink-0 overflow-hidden border border-white/10 bg-[#0F0F0F]"
    >
      {/* Background image */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={item.title}
          className="absolute inset-0 size-full object-cover transition-transform group-hover:scale-[1.02]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A]">
          <FileTextIcon className="size-12 text-[#8E816D]" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-black/20 to-black/80" />

      {/* Top-left: Colored media type badge */}
      <div className="absolute top-3 left-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.5)] ${mediaType.circleBg}`}
        >
          <MediaIcon className="size-4 text-white" />
        </div>
      </div>

      {/* Top-right: Course number + draft badge */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
        {item.courseNumber != null && (
          <span className="border border-white/20 bg-black/50 px-2 py-0.5 text-[0.65rem] font-medium tracking-widest text-[#F8F4EC] uppercase backdrop-blur-sm">
            Course {item.courseNumber}
          </span>
        )}
        {viewerRole !== 'student' && !item.isPublished && (
          <div className="border border-[#9B7A41]/30 bg-black/60 px-1.5 py-0.5 text-[0.6rem] font-medium tracking-widest text-white uppercase">
            Draft
          </div>
        )}
      </div>

      {/* Bottom: Title, category badge, file type */}
      <div className="absolute right-0 bottom-0 left-0 p-3">
        <h3 className="line-clamp-2 font-serif text-sm leading-tight font-medium text-white">
          {item.title}
        </h3>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 border bg-black/50 px-2 py-0.5 text-[0.65rem] font-medium tracking-widest uppercase ${categoryConfig.border} ${categoryConfig.text}`}
          >
            <CategoryIcon className="size-3" />
            {item.category}
          </span>
          <span className="text-[0.65rem] font-medium tracking-widest text-[#AFA28F] uppercase">
            {mediaType.label}
          </span>
        </div>
      </div>
    </Link>
  )
}

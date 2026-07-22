import { FileTextIcon, Music2Icon, PlayIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MediaLibraryRow } from '@/utils/library/library'
import { getYoutubeVideoId } from '@/utils/library/domain/youtube.domain'

export type MediaTypeConfig = {
  icon: LucideIcon | null
  label: string
  badgeBg: string
  badgeText: string
  badgeBorder?: string
}

export const MEDIA_TYPE_CONFIG = {
  video: {
    icon: PlayIcon,
    label: 'YouTube',
    badgeBg: '#FF0000',
    badgeText: '#FFFFFF',
  } satisfies MediaTypeConfig,
  video_file: {
    icon: PlayIcon,
    label: 'Video',
    badgeBg: '#1A1716',
    badgeText: '#E9D9B4',
    badgeBorder: 'rgba(197,160,89,0.40)',
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

export function resolveMediaTypeConfig(item: MediaLibraryRow): MediaTypeConfig {
  if (
    item.fileType === 'video' ||
    item.fileType === 'video_file' ||
    item.fileType === 'audio'
  ) {
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

export type MediaCardSize = 'default' | 'panel' | 'mobile'

export type MediaCardViewModel = {
  thumbnailUrl: string | null
  mediaType: MediaTypeConfig
  widthClass: string
  showCourseNumber: boolean
  showDraftBadge: boolean
  badgeBorderStyle: string
  badgeIconFill: string
}

const WIDTH_CLASSES: Record<MediaCardSize, string> = {
  default: 'w-96',
  panel: 'w-80',
  mobile: 'w-full',
}

function resolveThumbnailUrl(item: MediaLibraryRow): string | null {
  if (item.fileType === 'video_file') return item.thumbnailUrl
  const videoId =
    item.fileType === 'video' || item.fileType === 'audio'
      ? getYoutubeVideoId(item.fileUrl)
      : null
  return videoId
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : item.thumbnailUrl
}

export function buildMediaCardViewModel(
  item: MediaLibraryRow,
  viewerRole: 'student' | 'teacher' | 'admin',
  size: MediaCardSize,
): MediaCardViewModel {
  const mediaType = resolveMediaTypeConfig(item)
  return {
    thumbnailUrl: resolveThumbnailUrl(item),
    mediaType,
    widthClass: WIDTH_CLASSES[size],
    showCourseNumber: item.courseNumber != null,
    showDraftBadge: viewerRole !== 'student' && !item.isPublished,
    badgeBorderStyle: mediaType.badgeBorder
      ? `1px solid ${mediaType.badgeBorder}`
      : 'none',
    badgeIconFill: mediaType.label === 'YouTube' ? mediaType.badgeText : 'none',
  }
}

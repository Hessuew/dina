import { Link } from '@tanstack/react-router'
import { FileTextIcon } from 'lucide-react'
import type { MediaLibraryRow } from '@/utils/library/library'

type MediaCardProps = {
  item: MediaLibraryRow
  viewerRole: 'student' | 'teacher' | 'admin'
  theme?: 'light' | 'dark'
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

function getDocumentLabel(fileUrl: string): string {
  const ext = fileUrl.split('?')[0].split('.').pop()?.toLowerCase()
  if (ext === 'pptx') return 'PPTX'
  if (ext === 'docx') return 'DOCX'
  return 'PDF'
}

export function MediaCard({ item, viewerRole, theme = 'light' }: MediaCardProps) {
  const videoId =
    item.fileType === 'video' || item.fileType === 'audio'
      ? getYoutubeVideoId(item.fileUrl)
      : null
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : null

  const isDark = theme === 'dark'

  const titleColor = isDark ? 'text-[#F8F4EC]' : 'text-[#1C1815]'
  const badgeBorder = isDark ? 'border-[#C5A059]/30' : 'border-[#9B7A41]/30'
  const badgeText = isDark ? 'text-[#AFA28F]' : 'text-[#5E5549]'
  const thumbBorder = isDark ? 'border-[#C5A059]/20' : 'border-[#C5A059]/20'
  const thumbBg = isDark ? 'bg-[#0F0F0F]' : 'bg-[#1C1815]/8'
  const iconColor = isDark ? 'text-[#C5A059]/40' : 'text-[#9B7A41]/60'

  return (
    <Link
      to="/library/$mediaId"
      params={{ mediaId: item.id }}
      className="group flex w-44 shrink-0 flex-col gap-2"
    >
      <div className={`relative aspect-video overflow-hidden border ${thumbBorder} ${thumbBg}`}>
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={item.title}
            className="size-full object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className={`flex size-full items-center justify-center ${iconColor}`}>
            <FileTextIcon className="size-5" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/5 via-transparent to-black/20" />
        {viewerRole !== 'student' && !item.isPublished && (
          <div className="absolute top-2 right-2 border border-[#9B7A41]/30 bg-black/60 px-1.5 py-0.5 text-[0.6rem] font-medium tracking-widest text-white uppercase">
            Draft
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <p className={`line-clamp-2 text-xs leading-snug font-medium ${titleColor}`}>
          {item.title}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`border ${badgeBorder} px-1.5 py-0.5 text-[0.6rem] font-medium tracking-widest ${badgeText} uppercase`}>
            {item.fileType === 'document'
              ? getDocumentLabel(item.fileUrl)
              : item.fileType === 'audio'
                ? 'Audio'
                : 'Video'}
          </span>
          <span className={`border ${badgeBorder} px-1.5 py-0.5 text-[0.6rem] font-medium tracking-widest ${badgeText} uppercase`}>
            {item.category}
          </span>
        </div>
      </div>
    </Link>
  )
}

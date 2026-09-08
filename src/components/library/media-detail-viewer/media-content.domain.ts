import { getYoutubeVideoId } from '@/utils/library/domain/youtube.domain'

export function getFileExtension(url: string): string {
  const path = url.split('?')[0]
  const dotIndex = path.lastIndexOf('.')
  const ext = dotIndex === -1 ? path : path.slice(dotIndex + 1)
  return ext.toLowerCase()
}

type MediaContentInput = {
  fileType: string
  fileUrl: string
}

export type MediaContentKind =
  | 'youtube'
  | 'unembeddable-video'
  | 'uploaded-video'
  | 'pdf'
  | 'office'
  | 'none'

export type MediaContentViewModel = {
  kind: MediaContentKind
  videoId: string | null
}

export function buildMediaContentViewModel(
  media: MediaContentInput,
): MediaContentViewModel {
  if (media.fileType === 'video_file') {
    return { kind: 'uploaded-video', videoId: null }
  }
  if (media.fileType === 'video') {
    const videoId = getYoutubeVideoId(media.fileUrl)
    return { kind: videoId ? 'youtube' : 'unembeddable-video', videoId }
  }
  const ext = getFileExtension(media.fileUrl)
  if (ext === 'pdf') return { kind: 'pdf', videoId: null }
  if (ext === 'pptx' || ext === 'docx') return { kind: 'office', videoId: null }
  return { kind: 'none', videoId: null }
}

export const BLOB_REVOKE_DELAY_MS = 1000

export type MediaDownloadTab = {
  navigate: (url: string) => void
  close: () => void
}

export type MediaDownloadIo = {
  fetch: (url: string) => Promise<Response>
  createObjectURL: (blob: Blob) => string
  revokeObjectURL: (url: string) => void
  clickAnchor: (href: string, filename: string) => void
  openBlankTab: () => MediaDownloadTab | null
  schedule: (callback: () => void, delayMs: number) => void
}

export async function downloadFileOrOpenTab(
  href: string,
  filename: string,
  io: MediaDownloadIo,
): Promise<void> {
  const tab = io.openBlankTab()
  try {
    const response = await io.fetch(href)
    if (!response.ok) {
      tab?.navigate(href)
      return
    }
    const objectUrl = io.createObjectURL(await response.blob())
    tab?.close()
    io.clickAnchor(objectUrl, filename)
    io.schedule(() => io.revokeObjectURL(objectUrl), BLOB_REVOKE_DELAY_MS)
  } catch {
    tab?.navigate(href)
  }
}

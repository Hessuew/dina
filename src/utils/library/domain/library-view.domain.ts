import type { MediaLibraryRow } from '@/utils/library/library'
import type { Role } from '@/utils/authz/types'
import type { LibraryTopic } from '@/lib/library-topics'
import { getYoutubeVideoId } from '@/utils/library/domain/youtube.domain'
import { LIBRARY_TOPICS, buildShelves } from '@/lib/library-topics'

export function canCreateMedia(role: Role): boolean {
  return role === 'teacher' || role === 'admin'
}

export function canManageMediaRow(
  viewer: { id: string; role: Role },
  row: MediaLibraryRow,
): boolean {
  if (viewer.role === 'admin') return true
  if (viewer.role === 'teacher') return row.uploaderId === viewer.id
  return false
}

export function getLibraryEmptyStateDescription(canCreate: boolean): string {
  return canCreate
    ? 'Add the first library item to get started'
    : 'Check back later for new materials'
}

export function getYoutubeThumbnail(url: string): string | null {
  const id = getYoutubeVideoId(url)
  if (!id) return null
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}

export function getVisibleShelfTopics(media: Array<MediaLibraryRow>): {
  shelves: ReturnType<typeof buildShelves<MediaLibraryRow>>
  shelfTopics: Array<LibraryTopic>
} {
  const shelves = buildShelves(media)
  const shelfTopics = LIBRARY_TOPICS.filter((topic) => {
    const s = shelves.get(topic)
    return (s?.ebooks.length ?? 0) > 0 || (s?.audioVisual.length ?? 0) > 0
  })
  return { shelves, shelfTopics }
}

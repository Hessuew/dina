import type { MediaLibraryRow } from '@/utils/library/library'
import type { Role } from '@/utils/authz/types'
import type { LibraryTopic } from '@/lib/library-topics'
import { getYoutubeVideoId } from '@/utils/library/domain/youtube.domain'
import {
  LIBRARY_TOPICS,
  buildShelves,
  shelfHasContent,
} from '@/lib/library-topics'

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

export function canManageShelfItem(
  permissions: { canEdit: boolean; isCourseTeacher: boolean } | undefined,
  hasEditAction: boolean,
  hasDeleteAction: boolean,
): boolean {
  if (!permissions || !hasEditAction || !hasDeleteAction) return false
  return permissions.canEdit && permissions.isCourseTeacher
}

export function resolveShelfManageActions<T>(
  permissions: { canEdit: boolean; isCourseTeacher: boolean } | undefined,
  onEditMedia: ((item: T) => void) | undefined,
  onDeleteMedia: ((item: T) => void) | undefined,
): {
  canEdit: boolean
  isCourseTeacher: boolean
  onEditMedia: (item: T) => void
  onDeleteMedia: (item: T) => void
} | null {
  if (
    !canManageShelfItem(permissions, onEditMedia != null, onDeleteMedia != null)
  )
    return null
  if (!permissions || !onEditMedia || !onDeleteMedia) return null
  return { ...permissions, onEditMedia, onDeleteMedia }
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

export type LibraryThumbModel =
  | { kind: 'youtube'; thumbUrl: string | null }
  | { kind: 'image-or-icon'; thumbUrl: string | null; icon: 'video' | 'file' }

export function buildLibraryThumbModel(row: {
  fileType: MediaLibraryRow['fileType']
  fileUrl: string
  thumbnailUrl: string | null
}): LibraryThumbModel {
  if (row.fileType === 'video') {
    return { kind: 'youtube', thumbUrl: getYoutubeThumbnail(row.fileUrl) }
  }
  const icon = row.fileType === 'video_file' ? 'video' : 'file'
  return { kind: 'image-or-icon', thumbUrl: row.thumbnailUrl, icon }
}

const PINNED_FIRST_TOPIC: LibraryTopic = 'Lectures'

export function getVisibleShelfTopics(media: Array<MediaLibraryRow>): {
  shelves: ReturnType<typeof buildShelves<MediaLibraryRow>>
  shelfTopics: Array<LibraryTopic>
} {
  const shelves = buildShelves(media)
  const shelfTopics = LIBRARY_TOPICS.filter((topic) => {
    const s = shelves.get(topic)
    return s != null && shelfHasContent(s)
  })
  const pinnedIndex = shelfTopics.indexOf(PINNED_FIRST_TOPIC)
  if (pinnedIndex > 0) {
    shelfTopics.splice(pinnedIndex, 1)
    shelfTopics.unshift(PINNED_FIRST_TOPIC)
  }
  return { shelves, shelfTopics }
}

export function resolveMediaByIds(
  ids: Array<string>,
  media: Array<MediaLibraryRow>,
): Array<MediaLibraryRow> {
  const byId = new Map(media.map((row) => [row.id, row]))
  return ids.flatMap((id) => {
    const row = byId.get(id)
    return row ? [row] : []
  })
}

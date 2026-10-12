import { describe, expect, it } from 'vitest'
import type { MediaLibraryRow } from '@/utils/library/library'
import type { Role } from '@/utils/authz/types'
import {
  buildLibraryThumbModel,
  canCreateMedia,
  canManageMediaRow,
  canManageShelfItem,
  getLibraryEmptyStateDescription,
  getVisibleShelfTopics,
  getYoutubeThumbnail,
  resolveMediaByIds,
  resolveShelfManageActions,
} from '@/utils/library/domain/library-view.domain'

const makeRow = (
  overrides: Partial<MediaLibraryRow> = {},
): MediaLibraryRow => ({
  id: 'm1',
  uploaderId: 'u1',
  courseId: null,
  title: 'Title',
  category: 'Tawhid',
  description: null,
  fileUrl: 'https://example.com/file.pdf',
  fileType: 'document',
  fileSize: null,
  thumbnailUrl: null,
  isPublished: true,
  allowsDownload: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('canCreateMedia', () => {
  it.each<[Role, boolean]>([
    ['admin', true],
    ['teacher', true],
    ['student', false],
  ])('role %s -> %s', (role, expected) => {
    expect(canCreateMedia(role)).toBe(expected)
  })
})

describe('canManageMediaRow', () => {
  it('admin can manage any row', () => {
    const viewer = { id: 'admin1', role: 'admin' as Role }
    expect(canManageMediaRow(viewer, makeRow({ uploaderId: 'someone' }))).toBe(
      true,
    )
  })

  it('teacher can manage only their own uploads', () => {
    const viewer = { id: 't1', role: 'teacher' as Role }
    expect(canManageMediaRow(viewer, makeRow({ uploaderId: 't1' }))).toBe(true)
    expect(canManageMediaRow(viewer, makeRow({ uploaderId: 'other' }))).toBe(
      false,
    )
  })

  it('student cannot manage rows', () => {
    const viewer = { id: 's1', role: 'student' as Role }
    expect(canManageMediaRow(viewer, makeRow({ uploaderId: 's1' }))).toBe(false)
  })
})

describe('canManageShelfItem', () => {
  it('returns true when permissions allow edit and user is course teacher, and actions exist', () => {
    expect(
      canManageShelfItem({ canEdit: true, isCourseTeacher: true }, true, true),
    ).toBe(true)
  })

  it('returns false when permissions are missing or either edit or delete action is missing', () => {
    expect(canManageShelfItem(undefined, true, true)).toBe(false)
    expect(
      canManageShelfItem({ canEdit: true, isCourseTeacher: true }, false, true),
    ).toBe(false)
    expect(
      canManageShelfItem({ canEdit: true, isCourseTeacher: true }, true, false),
    ).toBe(false)
  })

  it('returns false when canEdit or isCourseTeacher is false', () => {
    expect(
      canManageShelfItem({ canEdit: false, isCourseTeacher: true }, true, true),
    ).toBe(false)
    expect(
      canManageShelfItem({ canEdit: true, isCourseTeacher: false }, true, true),
    ).toBe(false)
  })
})

describe('getLibraryEmptyStateDescription', () => {
  it('prompts creators to add the first item', () => {
    expect(getLibraryEmptyStateDescription(true)).toBe(
      'Add the first library item to get started',
    )
  })

  it('tells non-creators to check back later', () => {
    expect(getLibraryEmptyStateDescription(false)).toBe(
      'Check back later for new materials',
    )
  })
})

describe('getYoutubeThumbnail', () => {
  it('returns the hqdefault thumbnail URL for a valid youtube url', () => {
    expect(
      getYoutubeThumbnail('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    ).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
  })

  it('returns null when no video id can be parsed', () => {
    expect(getYoutubeThumbnail('https://example.com/not-a-video')).toBeNull()
  })
})

describe('buildLibraryThumbModel', () => {
  it('builds youtube model for video fileType', () => {
    expect(
      buildLibraryThumbModel({
        fileType: 'video',
        fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnailUrl: null,
      }),
    ).toEqual({
      kind: 'youtube',
      thumbUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    })
  })

  it('uses video icon for video_file without custom thumb', () => {
    expect(
      buildLibraryThumbModel({
        fileType: 'video_file',
        fileUrl: 'https://cdn/v.mp4',
        thumbnailUrl: null,
      }),
    ).toEqual({ kind: 'image-or-icon', thumbUrl: null, icon: 'video' })
  })

  it('uses file icon for documents', () => {
    expect(
      buildLibraryThumbModel({
        fileType: 'document',
        fileUrl: 'https://cdn/d.pdf',
        thumbnailUrl: 'https://cdn/t.png',
      }),
    ).toEqual({
      kind: 'image-or-icon',
      thumbUrl: 'https://cdn/t.png',
      icon: 'file',
    })
  })
})

describe('getVisibleShelfTopics', () => {
  it('returns only topics whose shelf has lectures, ebooks, or audioVisual content', () => {
    const media = [
      makeRow({
        id: 'a',
        category: 'Wisdom',
        fileType: 'document',
        allowsDownload: true,
      }),
      makeRow({ id: 'b', category: 'Wisdom', fileType: 'video' }),
      makeRow({ id: 'c', category: 'Healing', fileType: 'video' }),
    ]
    const { shelves, shelfTopics } = getVisibleShelfTopics(media)

    expect(shelfTopics).toContain('Wisdom')
    expect(shelfTopics).toContain('Healing')
    expect(shelves.get('Wisdom')?.lectures.length).toBeGreaterThan(0)
  })

  it('includes topics that only have lecture documents', () => {
    const media = [
      makeRow({
        id: 'a',
        category: 'Faith',
        fileType: 'document',
        allowsDownload: true,
      }),
    ]
    const { shelfTopics } = getVisibleShelfTopics(media)
    expect(shelfTopics).toEqual(['Faith'])
  })

  it('excludes topics with no content and non-topic categories', () => {
    const media = [
      makeRow({ id: 'a', category: 'Wisdom', fileType: 'video' }),
      makeRow({ id: 'b', category: 'NotATopic', fileType: 'document' }),
    ]
    const { shelfTopics } = getVisibleShelfTopics(media)

    expect(shelfTopics).toEqual(['Wisdom'])
  })

  it('returns no topics for empty media', () => {
    const { shelfTopics } = getVisibleShelfTopics([])
    expect(shelfTopics).toEqual([])
  })

  it('pins the Lectures topic shelf first', () => {
    const media = [
      makeRow({ id: 'a', category: 'Wisdom', fileType: 'video' }),
      makeRow({ id: 'b', category: 'Lectures', fileType: 'video' }),
      makeRow({ id: 'c', category: 'Faith', fileType: 'video' }),
    ]
    const { shelfTopics } = getVisibleShelfTopics(media)
    expect(shelfTopics[0]).toBe('Lectures')
    expect(shelfTopics).toEqual(['Lectures', 'Faith', 'Wisdom'])
  })
})

describe('resolveShelfManageActions', () => {
  const onEdit = () => {}
  const onDelete = () => {}
  const manager = { canEdit: true, isCourseTeacher: true }

  it('returns actions when permissions and both handlers exist', () => {
    const result = resolveShelfManageActions(manager, onEdit, onDelete)
    expect(result).toEqual({
      canEdit: true,
      isCourseTeacher: true,
      onEditMedia: onEdit,
      onDeleteMedia: onDelete,
    })
  })

  it('returns null without permissions or when not a course teacher', () => {
    expect(resolveShelfManageActions(undefined, onEdit, onDelete)).toBeNull()
    expect(
      resolveShelfManageActions(
        { canEdit: true, isCourseTeacher: false },
        onEdit,
        onDelete,
      ),
    ).toBeNull()
    expect(
      resolveShelfManageActions(
        { canEdit: false, isCourseTeacher: true },
        onEdit,
        onDelete,
      ),
    ).toBeNull()
  })

  it('returns null when either handler is missing', () => {
    expect(resolveShelfManageActions(manager, undefined, onDelete)).toBeNull()
    expect(resolveShelfManageActions(manager, onEdit, undefined)).toBeNull()
  })
})

describe('resolveMediaByIds', () => {
  it('resolves ids to rows in id order, dropping missing entries', () => {
    const media = [makeRow({ id: 'a' }), makeRow({ id: 'b' })]
    expect(
      resolveMediaByIds(['b', 'gone', 'a'], media).map((r) => r.id),
    ).toEqual(['b', 'a'])
    expect(resolveMediaByIds([], media)).toEqual([])
  })
})

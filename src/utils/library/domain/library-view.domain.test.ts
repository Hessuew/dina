import { describe, expect, it } from 'vitest'
import type { MediaLibraryRow } from '@/utils/library/library'
import type { Role } from '@/utils/authz/types'
import {
  canCreateMedia,
  canManageMediaRow,
  getLibraryEmptyStateDescription,
  getVisibleShelfTopics,
  getYoutubeThumbnail,
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

describe('getVisibleShelfTopics', () => {
  it('returns only topics whose shelf has ebooks or audioVisual content', () => {
    const media = [
      makeRow({ id: 'a', category: 'Wisdom', fileType: 'document' }),
      makeRow({ id: 'b', category: 'Wisdom', fileType: 'video' }),
      makeRow({ id: 'c', category: 'Healing', fileType: 'video' }),
    ]
    const { shelves, shelfTopics } = getVisibleShelfTopics(media)

    expect(shelfTopics).toContain('Wisdom')
    expect(shelfTopics).toContain('Healing')
    expect(shelves.get('Wisdom')?.ebooks.length).toBeGreaterThan(0)
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
})

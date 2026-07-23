import { FileTextIcon, Music2Icon, PlayIcon } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import {
  MEDIA_TYPE_CONFIG,
  buildMediaCardViewModel,
  resolveMediaTypeConfig,
} from './media-card.domain'
import type { MediaLibraryRow } from '@/utils/library/library'

function makeItem(overrides: Partial<MediaLibraryRow> = {}): MediaLibraryRow {
  return {
    id: 'm1',
    uploaderId: 'u1',
    courseId: null,
    title: 'Title',
    category: 'cat',
    description: null,
    fileUrl: 'https://example.com/file.pdf',
    fileType: 'document',
    fileSize: null,
    thumbnailUrl: null,
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('resolveMediaTypeConfig', () => {
  it('returns the video config for video files', () => {
    expect(resolveMediaTypeConfig(makeItem({ fileType: 'video' }))).toBe(
      MEDIA_TYPE_CONFIG.video,
    )
  })

  it('returns the video_file config for uploaded videos', () => {
    expect(resolveMediaTypeConfig(makeItem({ fileType: 'video_file' }))).toBe(
      MEDIA_TYPE_CONFIG.video_file,
    )
  })

  it('returns the audio config for audio files', () => {
    expect(resolveMediaTypeConfig(makeItem({ fileType: 'audio' }))).toBe(
      MEDIA_TYPE_CONFIG.audio,
    )
  })

  it('returns the pptx config for .pptx documents', () => {
    expect(
      resolveMediaTypeConfig(
        makeItem({ fileType: 'document', fileUrl: 'https://x/deck.pptx' }),
      ),
    ).toBe(MEDIA_TYPE_CONFIG.pptx)
  })

  it('returns the docx config for .docx documents', () => {
    expect(
      resolveMediaTypeConfig(
        makeItem({ fileType: 'document', fileUrl: 'https://x/doc.docx?v=2' }),
      ),
    ).toBe(MEDIA_TYPE_CONFIG.docx)
  })

  it('returns the pdf config for other documents', () => {
    expect(
      resolveMediaTypeConfig(
        makeItem({ fileType: 'document', fileUrl: 'https://x/report.pdf' }),
      ),
    ).toBe(MEDIA_TYPE_CONFIG.pdf)
  })

  it('returns the fallback config for non-media, non-document files', () => {
    expect(resolveMediaTypeConfig(makeItem({ fileType: 'image' }))).toBe(
      MEDIA_TYPE_CONFIG.fallback,
    )
    expect(resolveMediaTypeConfig(makeItem({ fileType: 'other' }))).toBe(
      MEDIA_TYPE_CONFIG.fallback,
    )
  })
})

describe('buildMediaCardViewModel', () => {
  it('builds a YouTube thumbnail URL when the video URL has a video id', () => {
    const vm = buildMediaCardViewModel(
      makeItem({
        fileType: 'video',
        fileUrl: 'https://www.youtube.com/watch?v=abc123',
      }),
      'student',
      'default',
    )
    expect(vm.thumbnailUrl).toBe(
      'https://img.youtube.com/vi/abc123/mqdefault.jpg',
    )
  })

  it('uses stored thumbnail for video_file (never YouTube id)', () => {
    const vm = buildMediaCardViewModel(
      makeItem({
        fileType: 'video_file',
        fileUrl: 'https://www.youtube.com/watch?v=abc123',
        thumbnailUrl: 'https://cdn/file-thumb.jpg',
      }),
      'student',
      'default',
    )
    expect(vm.thumbnailUrl).toBe('https://cdn/file-thumb.jpg')
    expect(vm.mediaType.label).toBe('Video')
  })

  it('falls back to the stored thumbnail when no video id is found', () => {
    const vm = buildMediaCardViewModel(
      makeItem({
        fileType: 'video',
        fileUrl: 'https://example.com/not-youtube',
        thumbnailUrl: 'https://cdn/thumb.jpg',
      }),
      'student',
      'default',
    )
    expect(vm.thumbnailUrl).toBe('https://cdn/thumb.jpg')
  })

  it('uses the stored thumbnail for non-media files', () => {
    const vm = buildMediaCardViewModel(
      makeItem({ fileType: 'document', thumbnailUrl: null }),
      'student',
      'default',
    )
    expect(vm.thumbnailUrl).toBeNull()
  })

  it('maps each size to its width class', () => {
    const item = makeItem()
    expect(buildMediaCardViewModel(item, 'student', 'default').widthClass).toBe(
      'w-96',
    )
    expect(buildMediaCardViewModel(item, 'student', 'panel').widthClass).toBe(
      'w-80',
    )
    expect(buildMediaCardViewModel(item, 'student', 'mobile').widthClass).toBe(
      'w-full',
    )
  })

  it('shows the course number only when present', () => {
    expect(
      buildMediaCardViewModel(
        makeItem({ courseNumber: 3 }),
        'student',
        'default',
      ).showCourseNumber,
    ).toBe(true)
    expect(
      buildMediaCardViewModel(
        makeItem({ courseNumber: undefined }),
        'student',
        'default',
      ).showCourseNumber,
    ).toBe(false)
  })

  it('shows the draft badge only for non-students viewing unpublished media', () => {
    expect(
      buildMediaCardViewModel(
        makeItem({ isPublished: false }),
        'teacher',
        'default',
      ).showDraftBadge,
    ).toBe(true)
    expect(
      buildMediaCardViewModel(
        makeItem({ isPublished: false }),
        'student',
        'default',
      ).showDraftBadge,
    ).toBe(false)
    expect(
      buildMediaCardViewModel(
        makeItem({ isPublished: true }),
        'teacher',
        'default',
      ).showDraftBadge,
    ).toBe(false)
  })

  it('derives the badge border style from the config', () => {
    const withBorder = buildMediaCardViewModel(
      makeItem({ fileType: 'audio' }),
      'student',
      'default',
    )
    expect(withBorder.badgeBorderStyle).toBe('1px solid rgba(255,255,255,0.18)')

    const withoutBorder = buildMediaCardViewModel(
      makeItem({ fileType: 'video' }),
      'student',
      'default',
    )
    expect(withoutBorder.badgeBorderStyle).toBe('none')
  })

  it('fills the badge icon only for YouTube media', () => {
    const youtube = buildMediaCardViewModel(
      makeItem({ fileType: 'video' }),
      'student',
      'default',
    )
    expect(youtube.mediaType.icon).toBe(PlayIcon)
    expect(youtube.badgeIconFill).toBe('#FFFFFF')

    const audio = buildMediaCardViewModel(
      makeItem({ fileType: 'audio' }),
      'student',
      'default',
    )
    expect(audio.mediaType.icon).toBe(Music2Icon)
    expect(audio.badgeIconFill).toBe('none')

    const file = buildMediaCardViewModel(
      makeItem({ fileType: 'other' }),
      'student',
      'default',
    )
    expect(file.mediaType.icon).toBe(FileTextIcon)
    expect(file.badgeIconFill).toBe('none')
  })
})

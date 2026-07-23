import { describe, expect, it } from 'vitest'
import {
  buildMediaContentViewModel,
  getFileExtension,
} from './media-content.domain'

describe('getFileExtension', () => {
  it('returns the lowercased extension', () => {
    expect(getFileExtension('https://x.com/file.PDF')).toBe('pdf')
  })

  it('ignores query strings', () => {
    expect(getFileExtension('https://x.com/file.pptx?token=abc')).toBe('pptx')
  })

  it('returns the segment after the last dot (domain dot when the path has none)', () => {
    expect(getFileExtension('https://x.com/file')).toBe('com/file')
  })

  it('returns empty string for an empty url', () => {
    expect(getFileExtension('')).toBe('')
  })
})

describe('buildMediaContentViewModel', () => {
  it('resolves a YouTube embed for a parseable video url', () => {
    const vm = buildMediaContentViewModel({
      fileType: 'video',
      fileUrl: 'https://www.youtube.com/watch?v=abc123',
    })
    expect(vm).toEqual({ kind: 'youtube', videoId: 'abc123' })
  })

  it('marks an unparseable video url as unembeddable', () => {
    const vm = buildMediaContentViewModel({
      fileType: 'video',
      fileUrl: 'https://example.com/not-a-video',
    })
    expect(vm).toEqual({ kind: 'unembeddable-video', videoId: null })
  })

  it('resolves uploaded video files to uploaded-video', () => {
    const vm = buildMediaContentViewModel({
      fileType: 'video_file',
      fileUrl:
        'https://x.supabase.co/storage/v1/object/public/media-library/u-1.mp4',
    })
    expect(vm).toEqual({ kind: 'uploaded-video', videoId: null })
  })

  it('classifies a pdf document', () => {
    const vm = buildMediaContentViewModel({
      fileType: 'document',
      fileUrl: 'https://x.com/notes.pdf',
    })
    expect(vm).toEqual({ kind: 'pdf', videoId: null })
  })

  it('classifies pptx and docx as office documents', () => {
    expect(
      buildMediaContentViewModel({
        fileType: 'document',
        fileUrl: 'https://x.com/deck.pptx',
      }),
    ).toEqual({ kind: 'office', videoId: null })
    expect(
      buildMediaContentViewModel({
        fileType: 'document',
        fileUrl: 'https://x.com/doc.docx',
      }),
    ).toEqual({ kind: 'office', videoId: null })
  })

  it('classifies an unknown document extension as none', () => {
    const vm = buildMediaContentViewModel({
      fileType: 'document',
      fileUrl: 'https://x.com/file.zip',
    })
    expect(vm).toEqual({ kind: 'none', videoId: null })
  })

  it('does not resolve a video id for non-video media (mutually exclusive kinds)', () => {
    const vm = buildMediaContentViewModel({
      fileType: 'document',
      fileUrl: 'https://www.youtube.com/watch?v=abc123',
    })
    expect(vm.kind).toBe('none')
    expect(vm.videoId).toBeNull()
  })
})

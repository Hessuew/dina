import { describe, expect, it, vi } from 'vitest'
import {
  BLOB_REVOKE_DELAY_MS,
  buildMediaContentViewModel,
  downloadFileOrOpenTab,
  getFileExtension,
} from './media-content.domain'
import type { MediaDownloadIo, MediaDownloadTab } from './media-content.domain'

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

function makeTab(overrides: Partial<MediaDownloadTab> = {}): MediaDownloadTab {
  return {
    navigate: vi.fn(),
    close: vi.fn(),
    ...overrides,
  }
}

function makeDownloadIo(
  overrides: Partial<MediaDownloadIo> & { tab?: MediaDownloadTab | null } = {},
): MediaDownloadIo {
  const { tab = makeTab(), ...ioOverrides } = overrides
  return {
    fetch: vi.fn(),
    createObjectURL: vi.fn(() => 'blob:saved'),
    revokeObjectURL: vi.fn(),
    clickAnchor: vi.fn(),
    openBlankTab: vi.fn(() => tab),
    schedule: vi.fn(),
    ...ioOverrides,
  }
}

describe('downloadFileOrOpenTab', () => {
  it('reserves a tab before fetch, then saves a blob and closes the tab', async () => {
    const blob = new Blob(['pdf'])
    const tab = makeTab()
    const io = makeDownloadIo({
      tab,
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(blob),
      }),
    })

    await downloadFileOrOpenTab('https://signed/doc.pdf', 'Notes.pdf', io)

    expect(io.openBlankTab).toHaveBeenCalled()
    expect(tab.close).toHaveBeenCalled()
    expect(tab.navigate).not.toHaveBeenCalled()
    expect(io.clickAnchor).toHaveBeenCalledWith('blob:saved', 'Notes.pdf')
    expect(io.revokeObjectURL).not.toHaveBeenCalled()
    expect(io.schedule).toHaveBeenCalledWith(
      expect.any(Function),
      BLOB_REVOKE_DELAY_MS,
    )
    const scheduled = vi.mocked(io.schedule).mock.calls[0][0]
    scheduled()
    expect(io.revokeObjectURL).toHaveBeenCalledWith('blob:saved')
  })

  it('navigates the reserved tab when fetch is not ok', async () => {
    const tab = makeTab()
    const io = makeDownloadIo({
      tab,
      fetch: vi.fn().mockResolvedValue({ ok: false }),
    })

    await downloadFileOrOpenTab('https://signed/doc.pdf', 'Notes.pdf', io)

    expect(tab.navigate).toHaveBeenCalledWith('https://signed/doc.pdf')
    expect(tab.close).not.toHaveBeenCalled()
    expect(io.clickAnchor).not.toHaveBeenCalled()
  })

  it('navigates the reserved tab when fetch throws', async () => {
    const tab = makeTab()
    const io = makeDownloadIo({
      tab,
      fetch: vi.fn().mockRejectedValue(new Error('cors')),
    })

    await downloadFileOrOpenTab('https://signed/doc.pdf', 'Notes.pdf', io)

    expect(tab.navigate).toHaveBeenCalledWith('https://signed/doc.pdf')
    expect(io.clickAnchor).not.toHaveBeenCalled()
  })

  it('still saves a blob when the reserved tab is blocked', async () => {
    const blob = new Blob(['pdf'])
    const io = makeDownloadIo({
      tab: null,
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(blob),
      }),
    })

    await downloadFileOrOpenTab('https://signed/doc.pdf', 'Notes.pdf', io)

    expect(io.clickAnchor).toHaveBeenCalledWith('blob:saved', 'Notes.pdf')
  })
})

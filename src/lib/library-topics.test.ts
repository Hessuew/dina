import { describe, expect, it } from 'vitest'
import {
  LIBRARY_TOPICS,
  buildShelves,
  isLibraryTopic,
  shelfHasContent,
} from './library-topics'

describe('isLibraryTopic', () => {
  it('returns true for every predefined topic', () => {
    for (const topic of LIBRARY_TOPICS) {
      expect(isLibraryTopic(topic)).toBe(true)
    }
  })

  it('returns false for unrecognized strings', () => {
    expect(isLibraryTopic('General')).toBe(false)
    expect(isLibraryTopic('')).toBe(false)
    expect(isLibraryTopic('wisdom')).toBe(false) // case-sensitive
  })
})

describe('buildShelves', () => {
  const media = [
    {
      id: '1',
      category: 'Wisdom',
      fileType: 'document',
      allowsDownload: false,
    },
    {
      id: '1b',
      category: 'Wisdom',
      fileType: 'document',
      allowsDownload: true,
    },
    { id: '2', category: 'Wisdom', fileType: 'video' },
    { id: '3', category: 'Wisdom', fileType: 'audio' },
    {
      id: '4',
      category: 'Healing',
      fileType: 'document',
      allowsDownload: false,
    },
    { id: '5', category: 'General', fileType: 'document' }, // not a valid topic
    { id: '6', category: 'Wisdom', fileType: 'image' }, // not ebook or AV
    { id: '7', category: 'Wisdom', fileType: 'video_file' },
  ] as const

  it('puts downloadable documents in lectures and others in ebooks', () => {
    const shelves = buildShelves(media)
    const wisdom = shelves.get('Wisdom')!
    expect(wisdom.lectures.map((i) => i.id)).toEqual(['1b'])
    expect(wisdom.ebooks.map((i) => i.id)).toEqual(['1'])
  })

  it('puts videos, video_file, and audio in audioVisual', () => {
    const shelves = buildShelves(media)
    const wisdom = shelves.get('Wisdom')!
    expect(wisdom.audioVisual.map((i) => i.id)).toEqual(['2', '3', '7'])
  })

  it('excludes items with fileType other than document/video/video_file/audio', () => {
    const shelves = buildShelves(media)
    const wisdom = shelves.get('Wisdom')!
    expect(wisdom.lectures).toHaveLength(1)
    expect(wisdom.ebooks).toHaveLength(1)
    expect(wisdom.audioVisual).toHaveLength(3)
  })

  it('excludes items whose category is not a valid topic', () => {
    const shelves = buildShelves(media)
    expect(shelves.has('General')).toBe(false)
  })

  it('groups items across different topics independently', () => {
    const shelves = buildShelves(media)
    const healing = shelves.get('Healing')!
    expect(healing.ebooks).toHaveLength(1)
    expect(healing.lectures).toHaveLength(0)
    expect(healing.audioVisual).toHaveLength(0)
  })

  it('treats missing allowsDownload as eBook', () => {
    const shelves = buildShelves([
      { id: 'x', category: 'Faith', fileType: 'document' },
    ])
    expect(shelves.get('Faith')?.ebooks.map((i) => i.id)).toEqual(['x'])
    expect(shelves.get('Faith')?.lectures).toHaveLength(0)
  })
})

describe('shelfHasContent', () => {
  it('is true when any bucket has items', () => {
    expect(
      shelfHasContent({ lectures: [{ id: 1 }], ebooks: [], audioVisual: [] }),
    ).toBe(true)
    expect(
      shelfHasContent({ lectures: [], ebooks: [{ id: 1 }], audioVisual: [] }),
    ).toBe(true)
    expect(
      shelfHasContent({ lectures: [], ebooks: [], audioVisual: [{ id: 1 }] }),
    ).toBe(true)
  })

  it('is false when every bucket is empty', () => {
    expect(shelfHasContent({ lectures: [], ebooks: [], audioVisual: [] })).toBe(
      false,
    )
  })
})

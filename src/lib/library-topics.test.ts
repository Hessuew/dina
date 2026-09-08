import { describe, expect, it } from 'vitest'
import {
  LIBRARY_TOPICS,
  buildShelves,
  canonicalizeLibraryTopic,
  isLibraryTopic,
  shelfHasContent,
} from './library-topics'

describe('LIBRARY_TOPICS', () => {
  it('is sorted alphabetically', () => {
    const sorted = [...LIBRARY_TOPICS].sort((a, b) => a.localeCompare(b))
    expect(LIBRARY_TOPICS).toEqual(sorted)
  })

  it('contains 21 topics including Lectures and folder topics', () => {
    expect(LIBRARY_TOPICS).toContain('Lectures')
    expect(LIBRARY_TOPICS).toContain("Biography of God's Generals")
    expect(LIBRARY_TOPICS).toContain('Demons and Deliverance')
    expect(LIBRARY_TOPICS).toContain('Evangelism & Gospel Missions')
    expect(LIBRARY_TOPICS).toContain('Gifts of the Spirit')
    expect(LIBRARY_TOPICS).toContain('Holy Spirit')
    expect(LIBRARY_TOPICS).toContain('Prayer')
    expect(LIBRARY_TOPICS).toContain('Prophetic Christian Literatures')
    expect(LIBRARY_TOPICS).toContain('Repentance from sin')
    expect(LIBRARY_TOPICS).toContain('Revival')
    expect(LIBRARY_TOPICS).toContain('Spiritual Growth')
    expect(LIBRARY_TOPICS).toContain('Triumphant church')
    expect(LIBRARY_TOPICS).toHaveLength(21)
  })
})

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

describe('canonicalizeLibraryTopic', () => {
  it('returns canonical topic unchanged', () => {
    expect(canonicalizeLibraryTopic('Wisdom')).toBe('Wisdom')
    expect(canonicalizeLibraryTopic("Biography of God's Generals")).toBe(
      "Biography of God's Generals",
    )
  })

  it("maps legacy God's Generals Biography to Biography of God's Generals", () => {
    expect(canonicalizeLibraryTopic("God's Generals Biography")).toBe(
      "Biography of God's Generals",
    )
  })

  it('returns null for unrecognized strings', () => {
    expect(canonicalizeLibraryTopic('Unknown Topic')).toBeNull()
    expect(canonicalizeLibraryTopic('')).toBeNull()
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

  it("groups legacy God's Generals Biography under Biography of God's Generals shelf", () => {
    const shelves = buildShelves([
      {
        id: 'legacy-1',
        category: "God's Generals Biography",
        fileType: 'document',
        allowsDownload: false,
      },
      {
        id: 'canonical-1',
        category: "Biography of God's Generals",
        fileType: 'document',
        allowsDownload: true,
      },
    ])
    const generalsShelf = shelves.get("Biography of God's Generals")!
    expect(generalsShelf).toBeDefined()
    expect(generalsShelf.ebooks.map((i) => i.id)).toEqual(['legacy-1'])
    expect(generalsShelf.lectures.map((i) => i.id)).toEqual(['canonical-1'])
    expect(shelves.has("God's Generals Biography")).toBe(false)
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

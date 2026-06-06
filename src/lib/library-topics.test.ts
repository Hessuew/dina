import { describe, expect, it } from 'vitest'
import { LIBRARY_TOPICS, buildShelves, isLibraryTopic } from './library-topics'

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
    { id: '1', category: 'Wisdom', fileType: 'document' },
    { id: '2', category: 'Wisdom', fileType: 'video' },
    { id: '3', category: 'Wisdom', fileType: 'audio' },
    { id: '4', category: 'Healing', fileType: 'document' },
    { id: '5', category: 'General', fileType: 'document' }, // not a valid topic
    { id: '6', category: 'Wisdom', fileType: 'image' }, // not ebook or AV
  ] as const

  it('puts documents in ebooks', () => {
    const shelves = buildShelves(media)
    const wisdom = shelves.get('Wisdom')!
    expect(wisdom.ebooks.map((i) => i.id)).toEqual(['1'])
  })

  it('puts videos and audio in audioVisual', () => {
    const shelves = buildShelves(media)
    const wisdom = shelves.get('Wisdom')!
    expect(wisdom.audioVisual.map((i) => i.id)).toEqual(['2', '3'])
  })

  it('excludes items with fileType other than document/video/audio', () => {
    const shelves = buildShelves(media)
    const wisdom = shelves.get('Wisdom')!
    expect(wisdom.ebooks).toHaveLength(1)
    expect(wisdom.audioVisual).toHaveLength(2)
  })

  it('excludes items whose category is not a valid topic', () => {
    const shelves = buildShelves(media)
    expect(shelves.has('General')).toBe(false)
  })

  it('groups items across different topics independently', () => {
    const shelves = buildShelves(media)
    const healing = shelves.get('Healing')!
    expect(healing.ebooks).toHaveLength(1)
    expect(healing.audioVisual).toHaveLength(0)
  })
})

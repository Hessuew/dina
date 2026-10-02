import { describe, expect, it } from 'vitest'
import {
  LIBRARY_RECENT_CAP,
  LIBRARY_STARS_CAP,
  emptyLibraryPrefs,
  isMediaStarred,
  libraryPrefsKey,
  parseLibraryPrefs,
  recordMediaView,
  serializeLibraryPrefs,
  setReadingPosition,
  toggleMediaStar,
} from './library-prefs.domain'

describe('libraryPrefsKey', () => {
  it('scopes prefs per user', () => {
    expect(libraryPrefsKey('u1')).toBe('dina:library:u1:prefs')
  })
})

describe('parseLibraryPrefs', () => {
  it('returns empty prefs for missing or invalid data', () => {
    expect(parseLibraryPrefs(null)).toEqual(emptyLibraryPrefs())
    expect(parseLibraryPrefs('not json')).toEqual(emptyLibraryPrefs())
    expect(parseLibraryPrefs('42')).toEqual(emptyLibraryPrefs())
    expect(parseLibraryPrefs('[1,2]')).toEqual(emptyLibraryPrefs())
  })

  it('round-trips serialized prefs', () => {
    const prefs = {
      stars: ['a', 'b'],
      recent: ['b', 'c'],
      positions: { b: 7 },
    }
    expect(parseLibraryPrefs(serializeLibraryPrefs(prefs))).toEqual(prefs)
  })

  it('drops malformed entries and dedupes ids', () => {
    const prefs = parseLibraryPrefs(
      JSON.stringify({
        stars: ['a', 5, 'a', '', 'b'],
        recent: ['x', 'x', null],
        positions: { a: 3, b: 0, c: 2.5, d: '4' },
      }),
    )
    expect(prefs.stars).toEqual(['a', 'b'])
    expect(prefs.recent).toEqual(['x'])
    expect(prefs.positions).toEqual({ a: 3 })
  })

  it('caps stored lists', () => {
    const many = Array.from({ length: 200 }, (_, i) => `m${i}`)
    const prefs = parseLibraryPrefs(
      JSON.stringify({ stars: many, recent: many }),
    )
    expect(prefs.stars).toHaveLength(LIBRARY_STARS_CAP)
    expect(prefs.recent).toHaveLength(LIBRARY_RECENT_CAP)
  })
})

describe('toggleMediaStar', () => {
  it('adds an unstarred id to the front', () => {
    const prefs = { stars: ['b'], recent: [], positions: {} }
    expect(toggleMediaStar(prefs, 'a').stars).toEqual(['a', 'b'])
  })

  it('removes a starred id', () => {
    const prefs = { stars: ['a', 'b'], recent: [], positions: {} }
    expect(toggleMediaStar(prefs, 'a').stars).toEqual(['b'])
    expect(isMediaStarred(toggleMediaStar(prefs, 'a'), 'a')).toBe(false)
  })
})

describe('recordMediaView', () => {
  it('prepends and dedupes the viewed id', () => {
    const prefs = { stars: [], recent: ['a', 'b'], positions: {} }
    expect(recordMediaView(prefs, 'b').recent).toEqual(['b', 'a'])
  })

  it('caps history at the recent cap', () => {
    const prefs = {
      stars: [],
      recent: Array.from({ length: LIBRARY_RECENT_CAP }, (_, i) => `m${i}`),
      positions: {},
    }
    const next = recordMediaView(prefs, 'new')
    expect(next.recent[0]).toBe('new')
    expect(next.recent).toHaveLength(LIBRARY_RECENT_CAP)
  })
})

describe('reading positions', () => {
  it('stores and reads back the last page', () => {
    const prefs = setReadingPosition(emptyLibraryPrefs(), 'a', 5)
    expect(prefs.positions.a).toBe(5)
  })

  it('drops the entry when back at page one', () => {
    const prefs = setReadingPosition(emptyLibraryPrefs(), 'a', 5)
    expect(setReadingPosition(prefs, 'a', 1).positions).toEqual({})
    expect(setReadingPosition(prefs, 'a', 0).positions).toEqual({})
  })

  it('ignores non-integer pages', () => {
    const prefs = setReadingPosition(emptyLibraryPrefs(), 'a', 5)
    expect(setReadingPosition(prefs, 'a', 2.5).positions).toEqual({ a: 5 })
  })
})

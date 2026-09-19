import { describe, expect, it } from 'vitest'
import { readUserContextCache } from './user-context-cache.domain'

describe('readUserContextCache', () => {
  it('misses when no entry exists', () => {
    expect(readUserContextCache(undefined, 1000, 60_000)).toEqual({
      hit: false,
    })
  })

  it('hits a fresh entry', () => {
    const entry = { user: { id: 'u1' }, fetchedAt: 1000 }
    expect(readUserContextCache(entry, 2000, 60_000)).toEqual({
      hit: true,
      user: { id: 'u1' },
    })
  })

  it('hits a fresh entry whose cached user is null', () => {
    const entry = { user: null, fetchedAt: 1000 }
    expect(readUserContextCache(entry, 2000, 60_000)).toEqual({
      hit: true,
      user: null,
    })
  })

  it('misses when the entry is stale', () => {
    const entry = { user: { id: 'u1' }, fetchedAt: 1000 }
    expect(readUserContextCache(entry, 1000 + 60_001, 60_000)).toEqual({
      hit: false,
    })
  })

  it('misses at the exact TTL boundary', () => {
    const entry = { user: { id: 'u1' }, fetchedAt: 1000 }
    expect(readUserContextCache(entry, 1000 + 60_000, 60_000)).toEqual({
      hit: false,
    })
  })
})

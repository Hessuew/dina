import { describe, expect, it } from 'vitest'
import {
  decideFocusFetch,
  decideFocusScroll,
  prependPostIfAbsent,
} from './focus-post.domain'

describe('decideFocusFetch', () => {
  const base = {
    focusPostId: 'p1',
    loadedChannel: 'general',
    selectedChannel: 'general',
    loadedPostIds: [] as ReadonlyArray<string>,
    lastFetchKey: null as string | null,
  }

  it('fetches when focused post is absent and channel has settled', () => {
    expect(decideFocusFetch(base)).toEqual({
      fetch: true,
      focusKey: 'p1:general',
      postId: 'p1',
    })
  })

  it('does not fetch when there is no focus target', () => {
    expect(decideFocusFetch({ ...base, focusPostId: undefined })).toEqual({
      fetch: false,
    })
  })

  it('does not fetch while the channel has not settled', () => {
    expect(
      decideFocusFetch({ ...base, loadedChannel: 'course-1' }),
    ).toEqual({ fetch: false })
  })

  it('does not fetch when the post is already loaded', () => {
    expect(
      decideFocusFetch({ ...base, loadedPostIds: ['other', 'p1'] }),
    ).toEqual({ fetch: false })
  })

  it('does not fetch when this exact fetch was already issued', () => {
    expect(
      decideFocusFetch({ ...base, lastFetchKey: 'p1:general' }),
    ).toEqual({ fetch: false })
  })

  it('keys the fetch by post id and selected channel', () => {
    expect(
      decideFocusFetch({
        ...base,
        focusPostId: 'p9',
        loadedChannel: 'course-2',
        selectedChannel: 'course-2',
      }),
    ).toEqual({ fetch: true, focusKey: 'p9:course-2', postId: 'p9' })
  })
})

describe('decideFocusScroll', () => {
  const base = {
    focusPostId: 'p1',
    loadedChannel: 'general',
    selectedChannel: 'general',
    lastScrollKey: null as string | null,
  }

  it('scrolls when channel has settled and scroll not yet done', () => {
    expect(decideFocusScroll(base)).toEqual({
      scroll: true,
      focusKey: 'p1:general',
      elementId: 'post-p1',
    })
  })

  it('does not scroll when there is no focus target', () => {
    expect(decideFocusScroll({ ...base, focusPostId: undefined })).toEqual({
      scroll: false,
    })
  })

  it('does not scroll while the channel has not settled', () => {
    expect(
      decideFocusScroll({ ...base, loadedChannel: 'course-1' }),
    ).toEqual({ scroll: false })
  })

  it('does not scroll when this exact scroll was already performed', () => {
    expect(
      decideFocusScroll({ ...base, lastScrollKey: 'p1:general' }),
    ).toEqual({ scroll: false })
  })
})

describe('prependPostIfAbsent', () => {
  it('prepends a post that is not yet present', () => {
    const posts = [{ id: 'a' }, { id: 'b' }]
    expect(prependPostIfAbsent(posts, { id: 'c' })).toEqual([
      { id: 'c' },
      { id: 'a' },
      { id: 'b' },
    ])
  })

  it('returns the same array reference when the post already exists', () => {
    const posts = [{ id: 'a' }, { id: 'b' }]
    expect(prependPostIfAbsent(posts, { id: 'a' })).toBe(posts)
  })
})

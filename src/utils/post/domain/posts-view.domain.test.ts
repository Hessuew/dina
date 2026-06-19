import { describe, expect, it } from 'vitest'
import {
  canModeratePosts,
  courseIdForChannel,
  nextChannelSearch,
  removePost,
  replacePost,
  resolveChannelView,
} from './posts-view.domain'

describe('courseIdForChannel', () => {
  it('maps the general channel to a null course id', () => {
    expect(courseIdForChannel('general')).toBeNull()
  })

  it('returns the channel id for any non-general channel', () => {
    expect(courseIdForChannel('course-1')).toBe('course-1')
  })
})

describe('resolveChannelView', () => {
  const channels = [
    { id: 'course-1', name: 'Algebra', courseId: 'course-1' },
    { id: 'course-2', name: 'Poetry', courseId: 'course-2' },
  ] as const

  it('defaults to the general channel when search has none', () => {
    expect(resolveChannelView({ searchChannel: undefined, channels })).toEqual({
      selectedChannel: 'general',
      selectedCourseId: null,
      channelLabel: 'General channel',
    })
  })

  it('resolves a named channel with its course id and label', () => {
    expect(resolveChannelView({ searchChannel: 'course-1', channels })).toEqual(
      {
        selectedChannel: 'course-1',
        selectedCourseId: 'course-1',
        channelLabel: 'Channel: Algebra',
      },
    )
  })

  it('uses an empty label when the channel is unknown', () => {
    expect(resolveChannelView({ searchChannel: 'missing', channels })).toEqual({
      selectedChannel: 'missing',
      selectedCourseId: 'missing',
      channelLabel: 'Channel: ',
    })
  })
})

describe('canModeratePosts', () => {
  it.each([
    ['teacher', true],
    ['admin', true],
    ['student', false],
  ] as const)('role %s -> %s', (role, expected) => {
    expect(canModeratePosts(role)).toBe(expected)
  })
})

describe('nextChannelSearch', () => {
  it('clears the channel when selecting general and drops focusPostId', () => {
    expect(
      nextChannelSearch({ channel: 'course-1', focusPostId: 'p1' }, 'general'),
    ).toEqual({ channel: undefined, focusPostId: undefined })
  })

  it('sets the channel when selecting a course and drops focusPostId', () => {
    expect(nextChannelSearch({ focusPostId: 'p1' }, 'course-2')).toEqual({
      channel: 'course-2',
      focusPostId: undefined,
    })
  })
})

describe('replacePost', () => {
  const posts = [
    { id: 'a', v: 1 },
    { id: 'b', v: 1 },
  ]

  it('replaces the post with the matching id', () => {
    expect(replacePost(posts, { id: 'b', v: 2 })).toEqual([
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
    ])
  })

  it('leaves the list unchanged when no id matches', () => {
    expect(replacePost(posts, { id: 'c', v: 9 })).toEqual(posts)
  })
})

describe('removePost', () => {
  it('removes the post with the matching id', () => {
    expect(removePost([{ id: 'a' }, { id: 'b' }], 'a')).toEqual([{ id: 'b' }])
  })
})

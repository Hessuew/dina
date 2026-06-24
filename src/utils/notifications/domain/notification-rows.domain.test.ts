import { describe, expect, it } from 'vitest'
import { buildNotificationRows } from './notification-rows.domain'
import type { CommentCreatedEvent, PostCreatedEvent } from '../types'

function makePostEvent(
  overrides: Partial<PostCreatedEvent> = {},
): PostCreatedEvent {
  return {
    type: 'post_created',
    actorId: 'actor-1',
    timestamp: new Date('2026-06-16T00:00:00Z'),
    postId: 'post-1',
    courseId: null,
    canModerate: false,
    ...overrides,
  }
}

function makeCommentEvent(
  overrides: Partial<CommentCreatedEvent> = {},
): CommentCreatedEvent {
  return {
    type: 'comment_created',
    actorId: 'actor-1',
    timestamp: new Date('2026-06-16T00:00:00Z'),
    postId: 'post-1',
    commentId: 'comment-1',
    postAuthorId: 'author-1',
    ...overrides,
  }
}

describe('buildNotificationRows', () => {
  it('maps each recipient to a post_created row with a null commentId', () => {
    const rows = buildNotificationRows(makePostEvent({ actorId: 'a' }), [
      'u1',
      'u2',
    ])
    expect(rows).toEqual([
      {
        userId: 'u1',
        actorId: 'a',
        event: 'post_created',
        postId: 'post-1',
        commentId: null,
      },
      {
        userId: 'u2',
        actorId: 'a',
        event: 'post_created',
        postId: 'post-1',
        commentId: null,
      },
    ])
  })

  it('maps each recipient to a comment_created row carrying the commentId', () => {
    const rows = buildNotificationRows(
      makeCommentEvent({ actorId: 'a', commentId: 'c9', postId: 'p9' }),
      ['u1'],
    )
    expect(rows).toEqual([
      {
        userId: 'u1',
        actorId: 'a',
        event: 'comment_created',
        postId: 'p9',
        commentId: 'c9',
      },
    ])
  })

  it('returns an empty array when there are no recipients', () => {
    expect(buildNotificationRows(makePostEvent(), [])).toEqual([])
  })

  it('returns an empty array for an unknown event type', () => {
    const unknown = {
      type: 'unknown',
      actorId: 'a',
    } as unknown as PostCreatedEvent
    expect(buildNotificationRows(unknown, ['u1'])).toEqual([])
  })
})

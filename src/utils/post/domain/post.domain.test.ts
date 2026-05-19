import { describe, expect, it } from 'vitest'
import {
  determineReactionAction,
  transformCommentWithAuthor,
  transformPostWithDetails,
} from '@/utils/post/domain/post.domain'

const makeAuthor = () => ({
  id: 'user-1',
  fullName: 'Test User',
  avatarUrl: null,
})

const makeReaction = (emoji = '👍') => ({
  id: 'r-1',
  emoji,
  userId: 'user-1',
})

describe('determineReactionAction', () => {
  it('returns added when there is no existing reaction', () => {
    expect(determineReactionAction(null, '👍')).toBe('added')
    expect(determineReactionAction(undefined, '👍')).toBe('added')
  })

  it('returns removed when the same emoji is reacted again', () => {
    expect(determineReactionAction({ emoji: '👍' }, '👍')).toBe('removed')
  })

  it('returns updated when a different emoji is used', () => {
    expect(determineReactionAction({ emoji: '👍' }, '❤️')).toBe('updated')
  })
})

describe('transformPostWithDetails', () => {
  const now = new Date('2025-01-01T00:00:00Z')
  const basePost = {
    id: 'post-1',
    course: null,
    content: 'Hello world',
    createdAt: now,
    updatedAt: now,
    author: makeAuthor(),
    reactions: [makeReaction()],
    comments: [
      {
        id: 'c-1',
        content: 'First',
        createdAt: now,
        updatedAt: now,
        author: makeAuthor(),
        reactions: [],
      },
      {
        id: 'c-2',
        content: 'Second',
        createdAt: now,
        updatedAt: now,
        author: makeAuthor(),
        reactions: [],
      },
    ],
  }

  it('maps post scalar fields correctly', () => {
    const result = transformPostWithDetails(basePost, 5)
    expect(result.id).toBe('post-1')
    expect(result.content).toBe('Hello world')
    expect(result.commentCount).toBe(5)
    expect(result.reactions).toHaveLength(1)
  })

  it('reverses comments so the most recent appears first', () => {
    const result = transformPostWithDetails(basePost, 2)
    expect(result.previewComments[0].id).toBe('c-2')
    expect(result.previewComments[1].id).toBe('c-1')
  })

  it('handles a post with no comments', () => {
    const result = transformPostWithDetails({ ...basePost, comments: [] }, 0)
    expect(result.previewComments).toHaveLength(0)
    expect(result.commentCount).toBe(0)
  })

  it('does not mutate the original comments array', () => {
    const originalOrder = basePost.comments.map((c) => c.id)
    transformPostWithDetails(basePost, 2)
    expect(basePost.comments.map((c) => c.id)).toEqual(originalOrder)
  })

  it('passes course through when present', () => {
    const withCourse = {
      ...basePost,
      course: { id: 'c-1', title: 'Math 101' },
    }
    const result = transformPostWithDetails(withCourse, 0)
    expect(result.course).toEqual({ id: 'c-1', title: 'Math 101' })
  })
})

describe('transformCommentWithAuthor', () => {
  it('passes all fields through unchanged', () => {
    const now = new Date('2025-01-01T00:00:00Z')
    const comment = {
      id: 'c-1',
      content: 'A comment',
      createdAt: now,
      updatedAt: now,
      author: makeAuthor(),
      reactions: [makeReaction()],
    }
    expect(transformCommentWithAuthor(comment)).toEqual(comment)
  })
})

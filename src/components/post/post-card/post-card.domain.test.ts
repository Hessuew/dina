import { describe, expect, it } from 'vitest'
import {
  appendToPreview,
  isEditedTimestamps,
  removeCommentById,
  replaceComment,
  toggleReactionInList,
} from './post-card.domain'
import type { CommentWithAuthor } from '@/utils/post/domain/post.domain'

const reaction = (id: string, userId: string, emoji: string) => ({
  id,
  userId,
  emoji,
})

const comment = (id: string, content = 'hi'): CommentWithAuthor => ({
  id,
  content,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  author: { id: 'a1', fullName: 'Alice', avatarUrl: null },
  reactions: [],
})

describe('toggleReactionInList', () => {
  it('removes the reaction when the same emoji is toggled again', () => {
    const list = [reaction('r1', 'u1', '👍'), reaction('r2', 'u2', '🔥')]
    expect(toggleReactionInList(list, 'u1', '👍', 'temp')).toEqual([
      reaction('r2', 'u2', '🔥'),
    ])
  })

  it('replaces the emoji when the user already reacted with another one', () => {
    const list = [reaction('r1', 'u1', '👍')]
    expect(toggleReactionInList(list, 'u1', '🔥', 'temp')).toEqual([
      reaction('r1', 'u1', '🔥'),
    ])
  })

  it('leaves other users’ reactions untouched when replacing an emoji', () => {
    const list = [reaction('r1', 'u1', '👍'), reaction('r2', 'u2', '🔥')]
    expect(toggleReactionInList(list, 'u1', '🔥', 'temp')).toEqual([
      reaction('r1', 'u1', '🔥'),
      reaction('r2', 'u2', '🔥'),
    ])
  })

  it('appends a temp reaction when the user has none', () => {
    const list = [reaction('r1', 'u2', '👍')]
    expect(toggleReactionInList(list, 'u1', '🔥', 'temp-1')).toEqual([
      reaction('r1', 'u2', '👍'),
      reaction('temp-1', 'u1', '🔥'),
    ])
  })
})

describe('appendToPreview', () => {
  it('keeps only the last two existing comments plus the new one', () => {
    const prev = [comment('c1'), comment('c2'), comment('c3')]
    expect(appendToPreview(prev, comment('c4')).map((c) => c.id)).toEqual([
      'c2',
      'c3',
      'c4',
    ])
  })

  it('appends to a short list without dropping', () => {
    expect(appendToPreview([comment('c1')], comment('c2')).map((c) => c.id)).toEqual(
      ['c1', 'c2'],
    )
  })
})

describe('isEditedTimestamps', () => {
  it('is false within a second of creation', () => {
    expect(
      isEditedTimestamps(
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-01-01T00:00:01Z'),
      ),
    ).toBe(false)
  })

  it('is true when updated more than a second later', () => {
    expect(
      isEditedTimestamps(
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-01-01T00:00:02Z'),
      ),
    ).toBe(true)
  })
})

describe('removeCommentById', () => {
  it('removes the matching comment', () => {
    expect(
      removeCommentById([comment('c1'), comment('c2')], 'c1').map((c) => c.id),
    ).toEqual(['c2'])
  })
})

describe('replaceComment', () => {
  it('replaces the comment with the same id and leaves others', () => {
    const updated = comment('c1', 'edited')
    const result = replaceComment([comment('c1'), comment('c2')], updated)
    expect(result[0].content).toBe('edited')
    expect(result[1].id).toBe('c2')
  })
})

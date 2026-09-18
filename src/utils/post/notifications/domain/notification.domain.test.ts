import { describe, expect, it } from 'vitest'
import {
  buildNotificationPostRows,
  buildPostExcerpt,
} from '@/utils/post/notifications/domain/notification.domain'

describe('buildNotificationPostRows', () => {
  it('composes course and author data while retaining posts without courses', () => {
    expect(
      buildNotificationPostRows(
        [
          {
            id: 'post-1',
            content: 'Course update',
            courseId: 'course-1',
            authorId: 'author-1',
          },
          {
            id: 'post-2',
            content: 'General update',
            courseId: null,
            authorId: 'author-1',
          },
          {
            id: 'post-3',
            content: 'Missing course',
            courseId: 'course-missing',
            authorId: 'author-1',
          },
        ],
        [{ id: 'course-1', title: 'Discipleship' }],
        [{ id: 'author-1', fullName: 'Alice Smith' }],
      ),
    ).toEqual([
      {
        id: 'post-1',
        content: 'Course update',
        courseId: 'course-1',
        courseTitle: 'Discipleship',
        authorName: 'Alice Smith',
      },
      {
        id: 'post-2',
        content: 'General update',
        courseId: null,
        courseTitle: null,
        authorName: 'Alice Smith',
      },
      {
        id: 'post-3',
        content: 'Missing course',
        courseId: 'course-missing',
        courseTitle: null,
        authorName: 'Alice Smith',
      },
    ])
  })

  it('drops posts whose author profile is missing', () => {
    expect(
      buildNotificationPostRows(
        [
          {
            id: 'post-1',
            content: 'Orphaned post',
            courseId: null,
            authorId: 'missing-author',
          },
        ],
        [],
        [],
      ),
    ).toEqual([])
  })
})

describe('buildPostExcerpt', () => {
  it('returns content unchanged when 72 chars or fewer', () => {
    const content = 'Hello world'
    expect(buildPostExcerpt(content)).toBe('Hello world')
  })

  it('returns content unchanged at exactly 72 chars', () => {
    const content = 'a'.repeat(72)
    expect(buildPostExcerpt(content)).toBe(content)
  })

  it('truncates and appends ellipsis when content exceeds 72 chars', () => {
    const content = 'a'.repeat(80)
    const result = buildPostExcerpt(content)
    expect(result).toBe(`${'a'.repeat(72)}…`)
  })

  it('normalizes multiple spaces to single space before measuring', () => {
    const content = 'word   word'
    expect(buildPostExcerpt(content)).toBe('word word')
  })

  it('normalizes newlines to spaces before measuring', () => {
    const content = 'line one\nline two'
    expect(buildPostExcerpt(content)).toBe('line one line two')
  })

  it('trims leading and trailing whitespace', () => {
    const content = '  trimmed  '
    expect(buildPostExcerpt(content)).toBe('trimmed')
  })

  it('truncates after normalization, not before', () => {
    const long = 'word  '.repeat(16)
    const result = buildPostExcerpt(long)
    expect(result.endsWith('…')).toBe(true)
    expect(result.replace(/…$/, '').length).toBe(72)
  })
})

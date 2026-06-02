import { describe, expect, it } from 'vitest'
import { buildPostExcerpt } from '@/utils/post/notifications/domain/notification.domain'

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

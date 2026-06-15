import { describe, expect, it } from 'vitest'
import { getYoutubeVideoId } from './youtube.domain'

describe('getYoutubeVideoId', () => {
  it('extracts the id from a youtu.be short link', () => {
    expect(getYoutubeVideoId('https://youtu.be/abc123')).toBe('abc123')
  })

  it('extracts the id from a youtube.com watch link', () => {
    expect(getYoutubeVideoId('https://www.youtube.com/watch?v=abc123')).toBe(
      'abc123',
    )
  })

  it('extracts the id from an /embed/ path', () => {
    expect(getYoutubeVideoId('https://www.youtube.com/embed/abc123')).toBe(
      'abc123',
    )
  })

  it('extracts the id from a /shorts/ path', () => {
    expect(getYoutubeVideoId('https://www.youtube.com/shorts/abc123')).toBe(
      'abc123',
    )
  })

  it('normalizes a scheme-less url to https before parsing', () => {
    expect(getYoutubeVideoId('youtu.be/abc123')).toBe('abc123')
  })

  it('returns null for a non-youtube host', () => {
    expect(getYoutubeVideoId('https://vimeo.com/abc123')).toBeNull()
  })

  it('returns null for a malformed url', () => {
    expect(getYoutubeVideoId('http://')).toBeNull()
  })

  it('returns null when the youtube path has no id segment', () => {
    expect(getYoutubeVideoId('https://www.youtube.com/embed/')).toBeNull()
  })

  it('returns null for a youtu.be url with no id', () => {
    expect(getYoutubeVideoId('https://youtu.be/')).toBeNull()
  })

  it('handles the bare youtube.com host (no www)', () => {
    expect(getYoutubeVideoId('https://youtube.com/watch?v=abc123')).toBe(
      'abc123',
    )
  })

  it('returns null for a /shorts/ path with no id', () => {
    expect(getYoutubeVideoId('https://www.youtube.com/shorts/')).toBeNull()
  })
})

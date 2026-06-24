import { describe, expect, it } from 'vitest'
import {
  parseYouTubeMessage,
  shouldBlockYouTubePlayback,
} from './youtube-embed.domain'

describe('parseYouTubeMessage', () => {
  it('parses a JSON string payload into an object', () => {
    expect(parseYouTubeMessage('{"event":"onError","info":150}')).toEqual({
      event: 'onError',
      info: 150,
    })
  })

  it('returns an already-object payload as-is', () => {
    const obj = { event: 'onReady' }
    expect(parseYouTubeMessage(obj)).toBe(obj)
  })

  it('returns null for invalid JSON strings', () => {
    expect(parseYouTubeMessage('not json')).toBeNull()
  })

  it('returns null for non-object payloads', () => {
    expect(parseYouTubeMessage('42')).toBeNull()
    expect(parseYouTubeMessage(null)).toBeNull()
    expect(parseYouTubeMessage(undefined)).toBeNull()
  })
})

describe('shouldBlockYouTubePlayback', () => {
  const errorPayload = JSON.stringify({ event: 'onError', info: 150 })

  it('blocks on an onError event with a restricted code from a YouTube origin', () => {
    for (const info of [100, 101, 150]) {
      const payload = JSON.stringify({ event: 'onError', info })
      expect(
        shouldBlockYouTubePlayback('https://www.youtube.com', payload),
      ).toBe(true)
    }
  })

  it('accepts the scheme-less youtube.com origin too', () => {
    expect(
      shouldBlockYouTubePlayback('https://youtube.com', errorPayload),
    ).toBe(true)
  })

  it('does not block when the origin is not a YouTube origin', () => {
    expect(shouldBlockYouTubePlayback('https://evil.com', errorPayload)).toBe(
      false,
    )
  })

  it('does not block when the payload cannot be parsed', () => {
    expect(
      shouldBlockYouTubePlayback('https://www.youtube.com', 'not json'),
    ).toBe(false)
  })

  it('does not block for a non-error event', () => {
    const payload = JSON.stringify({ event: 'onReady', info: 150 })
    expect(shouldBlockYouTubePlayback('https://www.youtube.com', payload)).toBe(
      false,
    )
  })

  it('does not block for an onError event with an unrelated code', () => {
    const payload = JSON.stringify({ event: 'onError', info: 5 })
    expect(shouldBlockYouTubePlayback('https://www.youtube.com', payload)).toBe(
      false,
    )
  })
})

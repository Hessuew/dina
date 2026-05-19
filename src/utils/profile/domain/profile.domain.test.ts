import { describe, expect, it } from 'vitest'
import { checkEmailChangeRateLimit } from './profile.domain'

const at = (isoString: string) => new Date(isoString)

describe('checkEmailChangeRateLimit', () => {
  it('returns null when lastRequestAt is null', () => {
    expect(checkEmailChangeRateLimit(null, at('2026-01-01T12:01:00Z'))).toBeNull()
  })

  it('returns null when 60 seconds have passed', () => {
    const last = at('2026-01-01T12:00:00Z')
    const now = at('2026-01-01T12:01:00Z')
    expect(checkEmailChangeRateLimit(last, now)).toBeNull()
  })

  it('returns null when more than 60 seconds have passed', () => {
    const last = at('2026-01-01T12:00:00Z')
    const now = at('2026-01-01T12:02:00Z')
    expect(checkEmailChangeRateLimit(last, now)).toBeNull()
  })

  it('returns wait seconds when within the 60-second window', () => {
    const last = at('2026-01-01T12:00:00Z')
    const now = at('2026-01-01T12:00:45Z') // 45 seconds later
    expect(checkEmailChangeRateLimit(last, now)).toBe(15)
  })

  it('returns 60 when the request is at the same instant', () => {
    const last = at('2026-01-01T12:00:00Z')
    const now = at('2026-01-01T12:00:00Z')
    expect(checkEmailChangeRateLimit(last, now)).toBe(60)
  })

  it('rounds up fractional seconds', () => {
    const last = at('2026-01-01T12:00:00.000Z')
    const now = at('2026-01-01T12:00:00.500Z') // 500ms later
    expect(checkEmailChangeRateLimit(last, now)).toBe(60)
  })

  it('returns 1 when just under 1 second remains', () => {
    const last = at('2026-01-01T12:00:00Z')
    const now = at('2026-01-01T12:00:59.001Z') // 59.001s later → 0.999s remaining
    expect(checkEmailChangeRateLimit(last, now)).toBe(1)
  })
})

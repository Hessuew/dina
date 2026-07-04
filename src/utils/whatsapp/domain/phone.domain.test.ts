import { describe, expect, it } from 'vitest'
import { normalizeToE164, toWaRecipient } from './phone.domain'

describe('normalizeToE164', () => {
  it('accepts a valid number with explicit country code', () => {
    expect(normalizeToE164('+358 40 1234567')).toEqual({
      ok: true,
      e164: '+358401234567',
    })
  })

  it('normalizes formatting characters away', () => {
    expect(normalizeToE164('+1 (415) 555-2671')).toEqual({
      ok: true,
      e164: '+14155552671',
    })
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeToE164('  +358401234567  ')).toEqual({
      ok: true,
      e164: '+358401234567',
    })
  })

  it('rejects a local number without country code (no default region)', () => {
    expect(normalizeToE164('0401234567')).toEqual({ ok: false })
  })

  it('rejects free-text garbage', () => {
    expect(normalizeToE164('WhatsApp me!')).toEqual({ ok: false })
  })

  it('rejects an empty string', () => {
    expect(normalizeToE164('')).toEqual({ ok: false })
  })

  it('rejects a plus-prefixed number that is too short to be valid', () => {
    expect(normalizeToE164('+358 40')).toEqual({ ok: false })
  })
})

describe('toWaRecipient', () => {
  it('strips the leading plus', () => {
    expect(toWaRecipient('+358401234567')).toBe('358401234567')
  })

  it('passes through digits already lacking a plus', () => {
    expect(toWaRecipient('358401234567')).toBe('358401234567')
  })
})

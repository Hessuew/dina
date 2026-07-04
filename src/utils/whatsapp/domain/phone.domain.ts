import { parsePhoneNumberFromString } from 'libphonenumber-js'

export type NormalizedPhone = { ok: true; e164: string } | { ok: false }

/**
 * Normalizes a free-text phone (enrollments.phone_whatsapp is unvalidated) to
 * E.164. No default region: numbers without an explicit +country-code are
 * rejected rather than guessed, so the caller skips them instead of sending
 * to a wrong number.
 */
export function normalizeToE164(raw: string): NormalizedPhone {
  const parsed = parsePhoneNumberFromString(raw.trim())
  if (!parsed || !parsed.isValid()) {
    return { ok: false }
  }
  return { ok: true, e164: parsed.number }
}

/** Cloud API `to` field: E.164 digits without the leading `+`. */
export function toWaRecipient(e164: string): string {
  return e164.startsWith('+') ? e164.slice(1) : e164
}

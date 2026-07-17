import { describe, expect, it } from 'vitest'
import {
  GROUP_OPTIONS,
  countInvalidContactPhones,
  formatContactsForExport,
  formatEmailsForExport,
  resolveEmailCountLabel,
} from './export-emails-dialog.domain'

const contacts = [
  {
    fullLegalName: 'Maria Santos',
    email: 'maria@test.dev',
    phoneWhatsApp: '+358 40 1234567',
  },
  {
    fullLegalName: 'John Smith',
    email: 'john@test.dev',
    phoneWhatsApp: '+1 (415) 555-2671',
  },
]

describe('GROUP_OPTIONS', () => {
  it('offers the four export cohorts in display order', () => {
    expect(GROUP_OPTIONS).toEqual([
      { value: 'all', label: 'All enrollments' },
      { value: 'approved', label: 'Approved' },
      { value: 'registered', label: 'Registered' },
      { value: 'not_registered', label: 'Not yet registered' },
    ])
  })
})

describe('formatEmailsForExport', () => {
  it('joins multiple emails with semicolon-space separator', () => {
    expect(formatEmailsForExport(['a@x.com', 'b@x.com'])).toBe(
      'a@x.com; b@x.com',
    )
  })

  it('returns a single email without separator', () => {
    expect(formatEmailsForExport(['a@x.com'])).toBe('a@x.com')
  })

  it('returns empty string for empty array', () => {
    expect(formatEmailsForExport([])).toBe('')
  })
})

describe('resolveEmailCountLabel', () => {
  it('pluralizes for count greater than one', () => {
    expect(resolveEmailCountLabel(3)).toBe(
      '3 emails — semicolon-separated for Outlook',
    )
  })

  it('singularizes for count of one', () => {
    expect(resolveEmailCountLabel(1)).toBe(
      '1 email — semicolon-separated for Outlook',
    )
  })

  it('pluralizes for zero', () => {
    expect(resolveEmailCountLabel(0)).toBe(
      '0 emails — semicolon-separated for Outlook',
    )
  })
})

describe('formatContactsForExport', () => {
  it('keeps unnamed email output semicolon-separated for Outlook', () => {
    expect(formatContactsForExport(contacts, 'email', false)).toBe(
      'maria@test.dev; john@test.dev',
    )
  })

  it('formats named email rows', () => {
    expect(formatContactsForExport(contacts, 'email', true)).toBe(
      'Maria Santos, maria@test.dev\nJohn Smith, john@test.dev',
    )
  })

  it('formats normalized phone rows', () => {
    expect(formatContactsForExport(contacts, 'phone', false)).toBe(
      '+358401234567\n+14155552671',
    )
  })

  it('formats named email and phone rows in a stable field order', () => {
    expect(formatContactsForExport(contacts, 'both', true)).toBe(
      'Maria Santos, maria@test.dev, +358401234567\nJohn Smith, john@test.dev, +14155552671',
    )
  })
})

describe('countInvalidContactPhones', () => {
  it('ignores phone validation for email-only output', () => {
    expect(
      countInvalidContactPhones(
        [{ ...contacts[0], phoneWhatsApp: '0401234567' }],
        'email',
      ),
    ).toBe(0)
  })

  it('counts invalid numbers for phone-based output', () => {
    expect(
      countInvalidContactPhones(
        [...contacts, { ...contacts[0], phoneWhatsApp: '0401234567' }],
        'both',
      ),
    ).toBe(1)
  })
})

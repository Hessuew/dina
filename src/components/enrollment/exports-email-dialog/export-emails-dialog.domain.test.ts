import { describe, expect, it } from 'vitest'
import {
  GROUP_OPTIONS,
  buildContactsCopyText,
  canCopyContactsExport,
  contactHasInvalidPhone,
  countInvalidContactPhones,
  countInvalidContactPhonesAlways,
  formatContactsForExport,
  formatEmailsForExport,
  pluralizeCount,
  removeInvalidPhoneContacts,
  resolveCopyLabel,
  resolveCopySuccessMessage,
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

describe('contactHasInvalidPhone', () => {
  it('flags numbers that cannot normalize to E.164', () => {
    expect(contactHasInvalidPhone('0401234567')).toBe(true)
    expect(contactHasInvalidPhone('+358401234567')).toBe(false)
  })
})

describe('countInvalidContactPhonesAlways', () => {
  it('counts invalid phones even for email-only context', () => {
    expect(
      countInvalidContactPhonesAlways([
        ...contacts,
        { ...contacts[0], phoneWhatsApp: '0401234567' },
      ]),
    ).toBe(1)
  })
})

describe('removeInvalidPhoneContacts', () => {
  it('keeps only contacts with valid phones', () => {
    const mixed = [
      contacts[0],
      { ...contacts[1], phoneWhatsApp: 'not-a-phone' },
    ]
    expect(removeInvalidPhoneContacts(mixed)).toEqual([contacts[0]])
  })
})

describe('canCopyContactsExport', () => {
  it('blocks empty or null sources', () => {
    expect(
      canCopyContactsExport({
        mode: 'cohort',
        copySourceLength: null,
        invalidPhoneCount: 0,
      }),
    ).toBe(false)
    expect(
      canCopyContactsExport({
        mode: 'cohort',
        copySourceLength: 0,
        invalidPhoneCount: 0,
      }),
    ).toBe(false)
  })

  it('blocks lookup when selected phones are invalid', () => {
    expect(
      canCopyContactsExport({
        mode: 'lookup',
        copySourceLength: 2,
        invalidPhoneCount: 1,
      }),
    ).toBe(false)
  })

  it('allows valid cohort and lookup copies', () => {
    expect(
      canCopyContactsExport({
        mode: 'cohort',
        copySourceLength: 2,
        invalidPhoneCount: 5,
      }),
    ).toBe(true)
    expect(
      canCopyContactsExport({
        mode: 'lookup',
        copySourceLength: 2,
        invalidPhoneCount: 0,
      }),
    ).toBe(true)
  })
})

describe('resolveCopyLabel', () => {
  it('labels cohort and email exports as emails', () => {
    expect(resolveCopyLabel('cohort', 'both')).toBe('Copy emails')
    expect(resolveCopyLabel('lookup', 'email')).toBe('Copy emails')
  })

  it('labels phone and both lookup exports', () => {
    expect(resolveCopyLabel('lookup', 'phone')).toBe('Copy phone numbers')
    expect(resolveCopyLabel('lookup', 'both')).toBe('Copy contacts')
  })
})

describe('resolveCopySuccessMessage', () => {
  it('distinguishes lookup from cohort toast copy', () => {
    expect(resolveCopySuccessMessage('lookup')).toBe(
      'Contacts copied to clipboard',
    )
    expect(resolveCopySuccessMessage('cohort')).toBe(
      'Emails copied to clipboard',
    )
  })
})

describe('buildContactsCopyText', () => {
  it('formats cohort as semicolon emails', () => {
    expect(
      buildContactsCopyText({
        mode: 'cohort',
        cohortEmails: ['a@x.com', 'b@x.com'],
        contacts: [],
        field: 'email',
        includeName: false,
      }),
    ).toBe('a@x.com; b@x.com')
  })

  it('formats lookup via contact export rules', () => {
    expect(
      buildContactsCopyText({
        mode: 'lookup',
        cohortEmails: [],
        contacts,
        field: 'phone',
        includeName: false,
      }),
    ).toBe('+358401234567\n+14155552671')
  })
})

describe('pluralizeCount', () => {
  it('pluralizes count labels', () => {
    expect(pluralizeCount(1, 'invalid phone')).toBe('1 invalid phone')
    expect(pluralizeCount(2, 'invalid phone')).toBe('2 invalid phones')
  })
})

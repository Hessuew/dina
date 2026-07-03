import { describe, expect, it } from 'vitest'
import {
  GROUP_OPTIONS,
  formatEmailsForExport,
  resolveEmailCountLabel,
} from './export-emails-dialog.domain'

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

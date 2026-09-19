export type EmailGroup = 'approved' | 'all' | 'registered' | 'not_registered'
export type ContactExportField = 'email' | 'phone' | 'both'
export type ContactExportMode = 'cohort' | 'lookup'

export type ContactExportRecord = {
  fullLegalName: string
  email: string
  phoneWhatsApp: string
}

export const GROUP_OPTIONS: Array<{ value: EmailGroup; label: string }> = [
  { value: 'all', label: 'All enrollments' },
  { value: 'approved', label: 'Approved' },
  { value: 'registered', label: 'Registered' },
  { value: 'not_registered', label: 'Not yet registered' },
]

/** Joins email array into a semicolon-separated string for Outlook. */
export function formatEmailsForExport(emails: Array<string>): string {
  return emails.join('; ')
}

/** Count label shown above the email textarea. */
export function resolveEmailCountLabel(count: number): string {
  return `${count} email${count === 1 ? '' : 's'} — semicolon-separated for Outlook`
}

export function resolveCopyLabel(
  mode: ContactExportMode,
  field: ContactExportField,
): string {
  if (mode === 'cohort' || field === 'email') return 'Copy emails'
  if (field === 'phone') return 'Copy phone numbers'
  return 'Copy contacts'
}

export function resolveCopySuccessMessage(mode: ContactExportMode): string {
  return mode === 'lookup'
    ? 'Contacts copied to clipboard'
    : 'Emails copied to clipboard'
}

export function pluralizeCount(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

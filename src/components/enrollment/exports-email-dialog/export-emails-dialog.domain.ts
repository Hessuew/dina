export type EmailGroup = 'approved' | 'all'

export const GROUP_OPTIONS: Array<{ value: EmailGroup; label: string }> = [
  { value: 'approved', label: 'Approved' },
  { value: 'all', label: 'All enrollments' },
]

/** Joins email array into a semicolon-separated string for Outlook. */
export function formatEmailsForExport(emails: Array<string>): string {
  return emails.join('; ')
}

/** Count label shown above the email textarea. */
export function resolveEmailCountLabel(count: number): string {
  return `${count} email${count === 1 ? '' : 's'} — semicolon-separated for Outlook`
}

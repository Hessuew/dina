import { normalizeToE164 } from '@/utils/whatsapp/domain/phone.domain'

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

export function contactHasInvalidPhone(phoneWhatsApp: string): boolean {
  return !normalizeToE164(phoneWhatsApp).ok
}

export function countInvalidContactPhones(
  contacts: Array<ContactExportRecord>,
  field: ContactExportField,
): number {
  if (field === 'email') return 0
  return contacts.filter((contact) =>
    contactHasInvalidPhone(contact.phoneWhatsApp),
  ).length
}

/** Count invalid phones regardless of export field (for UI flags). */
export function countInvalidContactPhonesAlways(
  contacts: Array<ContactExportRecord>,
): number {
  return contacts.filter((contact) =>
    contactHasInvalidPhone(contact.phoneWhatsApp),
  ).length
}

export function removeInvalidPhoneContacts<T extends ContactExportRecord>(
  contacts: Array<T>,
): Array<T> {
  return contacts.filter(
    (contact) => !contactHasInvalidPhone(contact.phoneWhatsApp),
  )
}

export function formatContactsForExport(
  contacts: Array<ContactExportRecord>,
  field: ContactExportField,
  includeName: boolean,
): string {
  if (field === 'email' && !includeName) {
    return formatEmailsForExport(contacts.map((contact) => contact.email))
  }

  return contacts
    .map((contact) => formatContactRow(contact, field, includeName))
    .join('\n')
}

function formatContactRow(
  contact: ContactExportRecord,
  field: ContactExportField,
  includeName: boolean,
): string {
  const fields = includeName ? [contact.fullLegalName] : []
  if (field === 'email' || field === 'both') fields.push(contact.email)
  if (field === 'phone' || field === 'both') {
    const phone = normalizeToE164(contact.phoneWhatsApp)
    if (phone.ok) fields.push(phone.e164)
  }
  return fields.join(', ')
}

export function canCopyContactsExport(input: {
  mode: ContactExportMode
  copySourceLength: number | null
  invalidPhoneCount: number
}): boolean {
  if (input.copySourceLength === null || input.copySourceLength === 0) {
    return false
  }
  if (input.mode === 'lookup' && input.invalidPhoneCount > 0) return false
  return true
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

export function buildContactsCopyText(input: {
  mode: ContactExportMode
  cohortEmails: Array<string>
  contacts: Array<ContactExportRecord>
  field: ContactExportField
  includeName: boolean
}): string {
  if (input.mode === 'lookup') {
    return formatContactsForExport(
      input.contacts,
      input.field,
      input.includeName,
    )
  }
  return formatEmailsForExport(input.cohortEmails)
}

export function pluralizeCount(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

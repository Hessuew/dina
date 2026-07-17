import { normalizeToE164 } from '@/utils/whatsapp/domain/phone.domain'

export type EmailGroup = 'approved' | 'all' | 'registered' | 'not_registered'
export type ContactExportField = 'email' | 'phone' | 'both'

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

export function countInvalidContactPhones(
  contacts: Array<ContactExportRecord>,
  field: ContactExportField,
): number {
  if (field === 'email') return 0
  return contacts.filter(
    (contact) => !normalizeToE164(contact.phoneWhatsApp).ok,
  ).length
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

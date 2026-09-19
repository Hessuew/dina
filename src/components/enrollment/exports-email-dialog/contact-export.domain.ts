import { formatEmailsForExport } from './export-emails-dialog.domain'
import type {
  ContactExportField,
  ContactExportMode,
  ContactExportRecord,
} from './export-emails-dialog.domain'
import { normalizeToE164 } from '@/utils/whatsapp/domain/phone.domain'

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

export function buildContactsCopyText(input: {
  mode: ContactExportMode
  cohortEmails: Array<string>
  contacts: Array<ContactExportRecord>
  field: ContactExportField
  includeName: boolean
}): string {
  if (input.mode === 'cohort') return formatEmailsForExport(input.cohortEmails)
  return formatContactsForExport(input.contacts, input.field, input.includeName)
}

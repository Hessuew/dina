import { useRef, useState } from 'react'
import { Check, Copy, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { useServerFn } from '@tanstack/react-start'
import {
  buildContactsCopyText,
  canCopyContactsExport,
  contactHasInvalidPhone,
  countInvalidContactPhones,
  countInvalidContactPhonesAlways,
  removeInvalidPhoneContacts,
} from './contact-export.domain'
import {
  pluralizeCount,
  resolveCopySuccessMessage,
} from './export-emails-dialog.domain'
import type {
  ContactExportField,
  ContactExportRecord,
} from './export-emails-dialog.domain'
import type { RefObject } from 'react'
import type {
  EnrollmentContactLookupGroup,
  EnrollmentContactLookupMatch,
} from '@/utils/enrolment/domain/email-lookup.domain'
import { normalizeToE164 } from '@/utils/whatsapp/domain/phone.domain'
import {
  addEnrollmentContactLookupSelection,
  mergeUniqueStrongEnrollmentContactMatches,
  removeEnrollmentContactLookupSelection,
} from '@/utils/enrolment/domain/email-lookup.domain'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { searchEnrollmentContactsByNames } from '@/utils/enrolment/enrollments'
import { toUserError } from '@/utils/errors'

type LookupPanelProps = { onClose: () => void }
type GenerationRef = RefObject<number>
type LookupMatch = EnrollmentContactLookupMatch & ContactExportRecord

function isLatestGeneration(
  generationRef: GenerationRef,
  generation: number,
): boolean {
  return generation === generationRef.current
}

function showLatestError(
  generationRef: GenerationRef,
  generation: number,
  error: unknown,
) {
  if (isLatestGeneration(generationRef, generation)) {
    toast.error(toUserError(error).message)
  }
}

function finishLatestLoading(
  generationRef: GenerationRef,
  generation: number,
  setIsLoading: (loading: boolean) => void,
) {
  if (isLatestGeneration(generationRef, generation)) setIsLoading(false)
}

function useNameContactLookup() {
  const [names, setNames] = useState('')
  const [groups, setGroups] = useState<Array<EnrollmentContactLookupGroup>>([])
  const [selected, setSelected] = useState<Array<LookupMatch>>([])
  const [isLoading, setIsLoading] = useState(false)
  const searchFn = useServerFn(searchEnrollmentContactsByNames)
  const generationRef = useRef(0)

  async function handleSearch() {
    const generation = ++generationRef.current
    setIsLoading(true)
    try {
      const result = await searchFn({ data: { names } })
      if (!isLatestGeneration(generationRef, generation)) return
      setGroups(result.groups)
      setSelected((previous) =>
        mergeUniqueStrongEnrollmentContactMatches(previous, result.groups),
      )
    } catch (error) {
      showLatestError(generationRef, generation, error)
    } finally {
      finishLatestLoading(generationRef, generation, setIsLoading)
    }
  }

  return {
    names,
    setNames,
    groups,
    selected,
    isLoading,
    handleSearch,
    selectMatch: (match: LookupMatch) =>
      setSelected((previous) =>
        addEnrollmentContactLookupSelection(previous, match),
      ),
    removeMatch: (id: string) =>
      setSelected((previous) =>
        removeEnrollmentContactLookupSelection(previous, id),
      ),
    removeInvalidPhones: () =>
      setSelected((previous) => removeInvalidPhoneContacts(previous)),
  }
}

function useContactExportOptions(selected: Array<LookupMatch>) {
  const [field, setField] = useState<ContactExportField>('email')
  const [includeName, setIncludeName] = useState(false)

  return {
    field,
    setField,
    includeName,
    setIncludeName,
    invalidPhoneCount: countInvalidContactPhones(selected, field),
    invalidPhoneTotal: countInvalidContactPhonesAlways(selected),
  }
}

type LookupState = ReturnType<typeof useNameContactLookup>
type ExportOptions = ReturnType<typeof useContactExportOptions>

function LookupPanelContent({
  lookup,
  options,
}: {
  lookup: LookupState
  options: ExportOptions
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.72fr)]">
      <div className="flex min-h-0 min-w-0 flex-col">
        <LookupSearchForm
          names={lookup.names}
          setNames={lookup.setNames}
          isLoading={lookup.isLoading}
          onSearch={() => void lookup.handleSearch()}
        />
        <LookupResults
          groups={lookup.groups}
          selected={lookup.selected}
          onSelect={lookup.selectMatch}
        />
      </div>
      <SelectedLookupEmails
        selected={lookup.selected}
        field={options.field}
        includeName={options.includeName}
        invalidPhoneCount={options.invalidPhoneCount}
        invalidPhoneTotal={options.invalidPhoneTotal}
        onFieldChange={options.setField}
        onIncludeNameChange={options.setIncludeName}
        onRemove={lookup.removeMatch}
        onRemoveInvalidPhones={lookup.removeInvalidPhones}
      />
    </div>
  )
}

function LookupSearchForm({
  names,
  setNames,
  isLoading,
  onSearch,
}: {
  names: string
  setNames: (names: string) => void
  isLoading: boolean
  onSearch: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={names}
        rows={4}
        onChange={(event) => setNames(event.target.value)}
        placeholder="Maria Santos, John Smith"
        className="rounded-none border-white/10 bg-white/5 text-[#F8F4EC] placeholder:text-[#8E816D] focus-visible:border-[#C5A059]/60 focus-visible:ring-[#C5A059]/20"
      />
      <Button
        type="button"
        theme="dark"
        disabled={isLoading || names.trim().length === 0}
        onClick={onSearch}
      >
        <Search className="size-3.5" />
        {isLoading ? 'Searching...' : 'Search names'}
      </Button>
    </div>
  )
}

function LookupResults({
  groups,
  selected,
  onSelect,
}: {
  groups: Array<EnrollmentContactLookupGroup>
  selected: Array<LookupMatch>
  onSelect: (match: LookupMatch) => void
}) {
  const selectedIds = new Set(selected.map((item) => item.enrollmentId))
  if (groups.length === 0) return null
  return (
    <div className="mt-5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
      {groups.map((group) => (
        <LookupResultGroup
          key={group.query}
          group={group}
          selectedIds={selectedIds}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function LookupResultGroup({
  group,
  selectedIds,
  onSelect,
}: {
  group: EnrollmentContactLookupGroup
  selectedIds: Set<string>
  onSelect: (match: LookupMatch) => void
}) {
  const rows = group.matches.length > 0 ? group.matches : group.suggestions
  return (
    <section className="border border-white/10 bg-white/4 p-3">
      <p className="mb-2 text-[0.72rem] font-medium tracking-[0.16em] text-[#9B7A41] uppercase">
        {group.query}
      </p>
      {rows.length === 0 ? (
        <p className="text-[0.78rem] text-[#8E816D]">No enrollment found</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((match) => (
            <LookupCandidateButton
              key={match.enrollmentId}
              match={match}
              selected={selectedIds.has(match.enrollmentId)}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function LookupCandidateButton({
  match,
  selected,
  onSelect,
}: {
  match: LookupMatch
  selected: boolean
  onSelect: (match: LookupMatch) => void
}) {
  return (
    <button
      type="button"
      disabled={selected}
      onClick={() => onSelect(match)}
      className="min-w-0 border border-white/10 bg-black/20 px-3 py-2 text-left transition hover:border-[#C5A059]/60 hover:bg-white/8 disabled:opacity-55"
    >
      <span className="block truncate text-[0.84rem] text-[#F8F4EC]">
        {match.fullLegalName}
      </span>
      <span className="mt-1 block truncate text-[0.75rem] text-[#8E816D]">
        {match.email} · {match.phoneWhatsApp}
      </span>
      <span className="mt-1 block text-[0.72rem] text-[#8E816D]">
        {formatStatus(match.status)}
      </span>
    </button>
  )
}

function SelectedLookupEmails({
  selected,
  field,
  includeName,
  invalidPhoneCount,
  invalidPhoneTotal,
  onFieldChange,
  onIncludeNameChange,
  onRemove,
  onRemoveInvalidPhones,
}: {
  selected: Array<LookupMatch>
  field: ContactExportField
  includeName: boolean
  invalidPhoneCount: number
  invalidPhoneTotal: number
  onFieldChange: (field: ContactExportField) => void
  onIncludeNameChange: (includeName: boolean) => void
  onRemove: (enrollmentId: string) => void
  onRemoveInvalidPhones: () => void
}) {
  return (
    <aside className="flex min-h-0 min-w-0 flex-col border border-white/10 bg-black/20 p-3">
      <ContactExportControls
        field={field}
        includeName={includeName}
        invalidPhoneCount={invalidPhoneCount}
        invalidPhoneTotal={invalidPhoneTotal}
        onFieldChange={onFieldChange}
        onIncludeNameChange={onIncludeNameChange}
        onRemoveInvalidPhones={onRemoveInvalidPhones}
      />
      <p className="mb-3 text-[0.72rem] font-medium tracking-[0.16em] text-[#9B7A41] uppercase">
        {selected.length} selected
      </p>
      {selected.length === 0 ? (
        <p className="text-[0.78rem] text-[#8E816D]">No contacts selected</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {selected.map((match) => (
            <SelectedLookupEmail
              key={match.enrollmentId}
              match={match}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </aside>
  )
}

function SelectedLookupEmail({
  match,
  onRemove,
}: {
  match: LookupMatch
  onRemove: (enrollmentId: string) => void
}) {
  const invalidPhone = contactHasInvalidPhone(match.phoneWhatsApp)
  return (
    <div
      className={
        invalidPhone
          ? 'border-destructive/40 flex min-w-0 items-start justify-between gap-2 border bg-white/5 px-3 py-2'
          : 'flex min-w-0 items-start justify-between gap-2 border border-white/10 bg-white/5 px-3 py-2'
      }
    >
      <div className="min-w-0">
        <p className="truncate text-[0.82rem] text-[#F8F4EC]">
          {match.fullLegalName}
        </p>
        <p className="truncate text-[0.74rem] text-[#8E816D]">{match.email}</p>
        <p
          className={
            invalidPhone
              ? 'text-destructive truncate text-[0.74rem]'
              : 'truncate text-[0.74rem] text-[#8E816D]'
          }
        >
          {formatContactPhone(match.phoneWhatsApp)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(match.enrollmentId)}
        className="shrink-0 text-[#8E816D] transition hover:text-[#F8F4EC]"
        aria-label={`Remove ${match.fullLegalName}`}
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

function ContactExportControls({
  field,
  includeName,
  invalidPhoneCount,
  invalidPhoneTotal,
  onFieldChange,
  onIncludeNameChange,
  onRemoveInvalidPhones,
}: {
  field: ContactExportField
  includeName: boolean
  invalidPhoneCount: number
  invalidPhoneTotal: number
  onFieldChange: (field: ContactExportField) => void
  onIncludeNameChange: (includeName: boolean) => void
  onRemoveInvalidPhones: () => void
}) {
  return (
    <fieldset className="mb-4 flex flex-wrap gap-x-3 gap-y-2 border-b border-white/10 pb-4">
      <legend className="sr-only">Contact details to copy</legend>
      {(['email', 'phone', 'both'] as const).map((value) => (
        <label
          key={value}
          className="flex items-center gap-1.5 text-[0.75rem] text-[#D6CCBE]"
        >
          <input
            type="radio"
            name="contact-export-field"
            value={value}
            checked={field === value}
            onChange={() => onFieldChange(value)}
            className="size-3.5 accent-[#C5A059]"
          />
          {value[0].toUpperCase() + value.slice(1)}
        </label>
      ))}
      <label className="flex items-center gap-2 text-[0.75rem] text-[#D6CCBE]">
        <input
          type="checkbox"
          checked={includeName}
          onChange={(event) => onIncludeNameChange(event.target.checked)}
          className="size-3.5 accent-[#C5A059]"
        />
        Include name
      </label>
      <InvalidPhoneNotice count={invalidPhoneCount} />
      <RemoveInvalidPhonesButton
        count={invalidPhoneTotal}
        onRemove={onRemoveInvalidPhones}
      />
    </fieldset>
  )
}

function InvalidPhoneNotice({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <p className="text-destructive w-full text-[0.74rem]" role="alert">
      Remove {pluralizeCount(count, 'invalid phone')} or choose Email.
    </p>
  )
}

function RemoveInvalidPhonesButton({
  count,
  onRemove,
}: {
  count: number
  onRemove: () => void
}) {
  if (count <= 0) return null
  return (
    <button
      type="button"
      onClick={onRemove}
      className="border-destructive/50 text-destructive hover:border-destructive hover:bg-destructive/10 w-full border px-2 py-1.5 text-left text-[0.74rem] transition"
    >
      Remove {pluralizeCount(count, 'invalid phone')}
    </button>
  )
}

function LookupFooter({
  canCopy,
  copied,
  isLoading,
  onCopy,
  onClose,
}: {
  canCopy: boolean
  copied: boolean
  isLoading: boolean
  onCopy: () => void
  onClose: () => void
}) {
  return (
    <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
      <Button type="button" variant="ghost" theme="dark" onClick={onClose}>
        Close
      </Button>
      <Button
        type="button"
        theme="dark"
        disabled={!canCopy || isLoading}
        onClick={onCopy}
      >
        {copied ? (
          <>
            <Check className="size-3.5" />
            Copied
          </>
        ) : (
          <>
            <Copy className="size-3.5" />
            Copy contacts
          </>
        )}
      </Button>
    </DialogFooter>
  )
}

async function copyLookupContacts(
  selected: Array<LookupMatch>,
  field: ContactExportField,
  includeName: boolean,
  invalidPhoneCount: number,
  setCopied: (copied: boolean) => void,
) {
  if (
    !canCopyContactsExport({
      mode: 'lookup',
      copySourceLength: selected.length,
      invalidPhoneCount,
    })
  ) {
    return
  }
  try {
    await navigator.clipboard.writeText(
      buildContactsCopyText({
        mode: 'lookup',
        cohortEmails: [],
        contacts: selected,
        field,
        includeName,
      }),
    )
    setCopied(true)
    toast.success(resolveCopySuccessMessage('lookup'))
    setTimeout(() => setCopied(false), 2000)
  } catch {
    toast.error('Could not copy to clipboard')
  }
}

export function LookupPanel({ onClose }: LookupPanelProps) {
  const lookup = useNameContactLookup()
  const options = useContactExportOptions(lookup.selected)
  const [copied, setCopied] = useState(false)
  const canCopy = canCopyContactsExport({
    mode: 'lookup',
    copySourceLength: lookup.selected.length,
    invalidPhoneCount: options.invalidPhoneCount,
  })

  return (
    <>
      <LookupPanelContent lookup={lookup} options={options} />
      <LookupFooter
        canCopy={canCopy}
        copied={copied}
        isLoading={lookup.isLoading}
        onCopy={() =>
          void copyLookupContacts(
            lookup.selected,
            options.field,
            options.includeName,
            options.invalidPhoneCount,
            setCopied,
          )
        }
        onClose={onClose}
      />
    </>
  )
}

function formatStatus(status: string): string {
  return status.replaceAll('_', ' ')
}

function formatContactPhone(phone: string): string {
  const normalized = normalizeToE164(phone)
  return normalized.ok ? normalized.e164 : `Invalid phone: ${phone}`
}

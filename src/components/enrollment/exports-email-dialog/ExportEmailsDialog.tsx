import { useRef, useState } from 'react'
import { Check, Copy, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { useServerFn } from '@tanstack/react-start'
import {
  GROUP_OPTIONS,
  buildContactsCopyText,
  canCopyContactsExport,
  contactHasInvalidPhone,
  countInvalidContactPhones,
  countInvalidContactPhonesAlways,
  formatEmailsForExport,
  pluralizeCount,
  removeInvalidPhoneContacts,
  resolveCopyLabel,
  resolveCopySuccessMessage,
  resolveEmailCountLabel,
} from './export-emails-dialog.domain'
import type { RefObject } from 'react'
import type {
  ContactExportField,
  ContactExportMode,
  EmailGroup,
} from './export-emails-dialog.domain'
import type {
  EnrollmentContactLookupGroup,
  EnrollmentContactLookupMatch,
} from '@/utils/enrolment/domain/email-lookup.domain'
import {
  addEnrollmentContactLookupSelection,
  mergeUniqueStrongEnrollmentContactMatches,
  removeEnrollmentContactLookupSelection,
} from '@/utils/enrolment/domain/email-lookup.domain'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  getEnrollmentEmails,
  searchEnrollmentContactsByNames,
} from '@/utils/enrolment/enrollments'
import { normalizeToE164 } from '@/utils/whatsapp/domain/phone.domain'
import { toUserError } from '@/utils/errors'

type ExportContactsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ExportMode = ContactExportMode
type CopyEmailSource =
  | Array<string>
  | Array<EnrollmentContactLookupMatch>
  | null
type GenerationRef = RefObject<number>

function isLatestGeneration(
  generationRef: GenerationRef,
  gen: number,
): boolean {
  return gen === generationRef.current
}

function showLatestError(
  generationRef: GenerationRef,
  gen: number,
  error: unknown,
) {
  if (isLatestGeneration(generationRef, gen)) {
    toast.error(toUserError(error).message)
  }
}

function finishLatestLoading(
  generationRef: GenerationRef,
  gen: number,
  setIsLoading: (loading: boolean) => void,
) {
  if (isLatestGeneration(generationRef, gen)) setIsLoading(false)
}

function useCohortEmailExport() {
  const [selectedGroup, setSelectedGroup] = useState<EmailGroup | null>(null)
  const [emails, setEmails] = useState<Array<string> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const getEmailsFn = useServerFn(getEnrollmentEmails)
  const generationRef = useRef(0)

  async function handleGroupSelect(group: EmailGroup) {
    const gen = ++generationRef.current
    setSelectedGroup(group)
    setEmails(null)
    setCopied(false)
    setIsLoading(true)
    try {
      const result = await getEmailsFn({ data: { group } })
      if (gen === generationRef.current) setEmails(result.emails)
    } catch (error) {
      showLatestError(generationRef, gen, error)
    } finally {
      finishLatestLoading(generationRef, gen, setIsLoading)
    }
  }

  function reset() {
    setSelectedGroup(null)
    setEmails(null)
    setCopied(false)
  }

  return {
    selectedGroup,
    emails,
    isLoading,
    copied,
    setCopied,
    handleGroupSelect,
    reset,
  }
}

function useNameContactLookup() {
  const [names, setNames] = useState('')
  const [groups, setGroups] = useState<Array<EnrollmentContactLookupGroup>>([])
  const [selected, setSelected] = useState<Array<EnrollmentContactLookupMatch>>(
    [],
  )
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const searchFn = useServerFn(searchEnrollmentContactsByNames)
  const generationRef = useRef(0)

  async function handleSearch() {
    const gen = ++generationRef.current
    setIsLoading(true)
    setCopied(false)
    try {
      const result = await searchFn({ data: { names } })
      if (!isLatestGeneration(generationRef, gen)) return
      setGroups(result.groups)
      setSelected((prev) =>
        mergeUniqueStrongEnrollmentContactMatches(prev, result.groups),
      )
    } catch (error) {
      showLatestError(generationRef, gen, error)
    } finally {
      finishLatestLoading(generationRef, gen, setIsLoading)
    }
  }

  function reset() {
    setNames('')
    setGroups([])
    setSelected([])
    setCopied(false)
  }

  return {
    names,
    setNames,
    groups,
    selected,
    isLoading,
    copied,
    setCopied,
    handleSearch,
    selectMatch: (match: EnrollmentContactLookupMatch) =>
      setSelected((prev) => addEnrollmentContactLookupSelection(prev, match)),
    removeMatch: (id: string) =>
      setSelected((prev) => removeEnrollmentContactLookupSelection(prev, id)),
    removeInvalidPhones: () =>
      setSelected((prev) => removeInvalidPhoneContacts(prev)),
    reset,
  }
}

function useContactExportOptions(
  selected: Array<EnrollmentContactLookupMatch>,
) {
  const [field, setField] = useState<ContactExportField>('email')
  const [includeName, setIncludeName] = useState(false)
  const invalidPhoneCount = countInvalidContactPhones(selected, field)

  function reset() {
    setField('email')
    setIncludeName(false)
  }

  return {
    field,
    setField,
    includeName,
    setIncludeName,
    invalidPhoneCount,
    reset,
  }
}

type ModeTabsProps = {
  mode: ExportMode
  onModeChange: (mode: ExportMode) => void
}

function ModeTabs({ mode, onModeChange }: ModeTabsProps) {
  return (
    <div className="mb-5 flex gap-2">
      <Button
        type="button"
        theme="dark"
        variant={mode === 'cohort' ? 'default' : 'outline'}
        onClick={() => onModeChange('cohort')}
      >
        Cohorts
      </Button>
      <Button
        type="button"
        theme="dark"
        variant={mode === 'lookup' ? 'default' : 'outline'}
        onClick={() => onModeChange('lookup')}
      >
        Name lookup
      </Button>
    </div>
  )
}

type GroupSelectorProps = {
  selectedGroup: EmailGroup | null
  isLoading: boolean
  onSelect: (group: EmailGroup) => void
}

function GroupSelector({
  selectedGroup,
  isLoading,
  onSelect,
}: GroupSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {GROUP_OPTIONS.map(({ value, label }) => (
        <Button
          key={value}
          type="button"
          theme="dark"
          variant={selectedGroup === value ? 'default' : 'outline'}
          disabled={isLoading}
          onClick={() => onSelect(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  )
}

function EmailListPreview({ emails }: { emails: Array<string> }) {
  return (
    <div className="mt-4 flex flex-col gap-2">
      <p className="text-[0.72rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase">
        {resolveEmailCountLabel(emails.length)}
      </p>
      <textarea
        readOnly
        value={formatEmailsForExport(emails)}
        rows={5}
        className="w-full resize-none rounded-none border border-white/10 bg-white/5 px-3 py-2 text-[0.82rem] text-[#D6CCBE] focus:outline-none"
        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
      />
    </div>
  )
}

type CohortPanelProps = ReturnType<typeof useCohortEmailExport>

function CohortPanel({
  selectedGroup,
  emails,
  isLoading,
  handleGroupSelect,
}: CohortPanelProps) {
  return (
    <>
      <p className="mb-4 text-[0.78rem] text-[#8E816D]">
        Choose a group to export their email addresses.
      </p>
      <GroupSelector
        selectedGroup={selectedGroup}
        isLoading={isLoading}
        onSelect={(g) => void handleGroupSelect(g)}
      />
      {isLoading && (
        <p className="mt-4 text-[0.78rem] text-[#8E816D]">Loading...</p>
      )}
      {emails && !isLoading && <EmailListPreview emails={emails} />}
    </>
  )
}

type LookupPanelProps = ReturnType<typeof useNameContactLookup> &
  ReturnType<typeof useContactExportOptions>

function LookupPanel({
  names,
  setNames,
  groups,
  selected,
  isLoading,
  handleSearch,
  selectMatch,
  removeMatch,
  removeInvalidPhones,
  field,
  setField,
  includeName,
  setIncludeName,
}: LookupPanelProps) {
  return (
    <div className="grid min-h-0 flex-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.72fr)]">
      <div className="flex min-h-0 min-w-0 flex-col">
        <LookupSearchForm
          names={names}
          setNames={setNames}
          isLoading={isLoading}
          onSearch={() => void handleSearch()}
        />
        <LookupResults
          groups={groups}
          selected={selected}
          onSelect={selectMatch}
        />
      </div>
      <SelectedLookupEmails
        selected={selected}
        field={field}
        includeName={includeName}
        onFieldChange={setField}
        onIncludeNameChange={setIncludeName}
        onRemove={removeMatch}
        onRemoveInvalidPhones={removeInvalidPhones}
      />
    </div>
  )
}

type LookupSearchFormProps = {
  names: string
  setNames: (names: string) => void
  isLoading: boolean
  onSearch: () => void
}

function LookupSearchForm({
  names,
  setNames,
  isLoading,
  onSearch,
}: LookupSearchFormProps) {
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

type LookupResultsProps = {
  groups: Array<EnrollmentContactLookupGroup>
  selected: Array<EnrollmentContactLookupMatch>
  onSelect: (match: EnrollmentContactLookupMatch) => void
}

function LookupResults({ groups, selected, onSelect }: LookupResultsProps) {
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

type LookupResultGroupProps = {
  group: EnrollmentContactLookupGroup
  selectedIds: Set<string>
  onSelect: (match: EnrollmentContactLookupMatch) => void
}

function LookupResultGroup({
  group,
  selectedIds,
  onSelect,
}: LookupResultGroupProps) {
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

type LookupCandidateButtonProps = {
  match: EnrollmentContactLookupMatch
  selected: boolean
  onSelect: (match: EnrollmentContactLookupMatch) => void
}

function LookupCandidateButton({
  match,
  selected,
  onSelect,
}: LookupCandidateButtonProps) {
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

type SelectedLookupEmailsProps = {
  selected: Array<EnrollmentContactLookupMatch>
  field: ContactExportField
  includeName: boolean
  onFieldChange: (field: ContactExportField) => void
  onIncludeNameChange: (includeName: boolean) => void
  onRemove: (enrollmentId: string) => void
  onRemoveInvalidPhones: () => void
}

function SelectedLookupEmails({
  selected,
  field,
  includeName,
  onFieldChange,
  onIncludeNameChange,
  onRemove,
  onRemoveInvalidPhones,
}: SelectedLookupEmailsProps) {
  const invalidPhoneCount = countInvalidContactPhones(selected, field)
  const invalidPhoneTotal = countInvalidContactPhonesAlways(selected)
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

type SelectedLookupEmailProps = {
  match: EnrollmentContactLookupMatch
  onRemove: (enrollmentId: string) => void
}

function SelectedLookupEmail({ match, onRemove }: SelectedLookupEmailProps) {
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

type ContactExportControlsProps = {
  field: ContactExportField
  includeName: boolean
  invalidPhoneCount: number
  invalidPhoneTotal: number
  onFieldChange: (field: ContactExportField) => void
  onIncludeNameChange: (includeName: boolean) => void
  onRemoveInvalidPhones: () => void
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

function ContactExportControls({
  field,
  includeName,
  invalidPhoneCount,
  invalidPhoneTotal,
  onFieldChange,
  onIncludeNameChange,
  onRemoveInvalidPhones,
}: ContactExportControlsProps) {
  return (
    <fieldset className="mb-4 flex flex-wrap gap-x-3 gap-y-2 border-b border-white/10 pb-4">
      <legend className="sr-only">Contact details to copy</legend>
      <ContactExportRadio
        field={field}
        value="email"
        label="Email"
        onChange={onFieldChange}
      />
      <ContactExportRadio
        field={field}
        value="phone"
        label="Phone"
        onChange={onFieldChange}
      />
      <ContactExportRadio
        field={field}
        value="both"
        label="Both"
        onChange={onFieldChange}
      />
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

type ContactExportRadioProps = {
  field: ContactExportField
  value: ContactExportField
  label: string
  onChange: (field: ContactExportField) => void
}

function ContactExportRadio({
  field,
  value,
  label,
  onChange,
}: ContactExportRadioProps) {
  return (
    <label className="flex items-center gap-1.5 text-[0.75rem] text-[#D6CCBE]">
      <input
        type="radio"
        name="contact-export-field"
        value={value}
        checked={field === value}
        onChange={() => onChange(value)}
        className="size-3.5 accent-[#C5A059]"
      />
      {label}
    </label>
  )
}

type ExportEmailsFooterProps = {
  canCopy: boolean
  isLoading: boolean
  copied: boolean
  copyLabel: string
  onCopy: () => void
  onClose: () => void
}

function ExportEmailsFooter({
  canCopy,
  isLoading,
  copied,
  copyLabel,
  onCopy,
  onClose,
}: ExportEmailsFooterProps) {
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
            {copyLabel}
          </>
        )}
      </Button>
    </DialogFooter>
  )
}

async function copyExportToClipboard(input: {
  mode: ExportMode
  copySourceLength: number | null
  invalidPhoneCount: number
  cohortEmails: Array<string>
  contacts: Array<EnrollmentContactLookupMatch>
  field: ContactExportField
  includeName: boolean
  markCopied: () => void
}): Promise<void> {
  if (
    !canCopyContactsExport({
      mode: input.mode,
      copySourceLength: input.copySourceLength,
      invalidPhoneCount: input.invalidPhoneCount,
    })
  ) {
    return
  }
  try {
    const copyText = buildContactsCopyText({
      mode: input.mode,
      cohortEmails: input.cohortEmails,
      contacts: input.contacts,
      field: input.field,
      includeName: input.includeName,
    })
    await navigator.clipboard.writeText(copyText)
    input.markCopied()
    toast.success(resolveCopySuccessMessage(input.mode))
  } catch {
    toast.error('Could not copy to clipboard')
  }
}

function useExportContactsDialogController(
  onOpenChange: (open: boolean) => void,
) {
  const [mode, setMode] = useState<ExportMode>('cohort')
  const cohort = useCohortEmailExport()
  const lookup = useNameContactLookup()
  const contactOptions = useContactExportOptions(lookup.selected)
  const copyEmails: CopyEmailSource =
    mode === 'lookup' ? lookup.selected : cohort.emails

  async function handleCopy() {
    await copyExportToClipboard({
      mode,
      copySourceLength: copyEmails?.length ?? null,
      invalidPhoneCount: contactOptions.invalidPhoneCount,
      cohortEmails: cohort.emails ?? [],
      contacts: lookup.selected,
      field: contactOptions.field,
      includeName: contactOptions.includeName,
      markCopied: () => {
        if (mode === 'lookup') lookup.setCopied(true)
        else cohort.setCopied(true)
        setTimeout(() => {
          lookup.setCopied(false)
          cohort.setCopied(false)
        }, 2000)
      },
    })
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      cohort.reset()
      lookup.reset()
      contactOptions.reset()
      setMode('cohort')
    }
    onOpenChange(next)
  }

  return {
    mode,
    setMode,
    cohort,
    lookup,
    contactOptions,
    copyEmails,
    invalidPhoneCount: contactOptions.invalidPhoneCount,
    copied: mode === 'lookup' ? lookup.copied : cohort.copied,
    isLoading: mode === 'lookup' ? lookup.isLoading : cohort.isLoading,
    handleCopy,
    handleOpenChange,
  }
}

function ExportDialogBody({
  mode,
  setMode,
  cohort,
  lookup,
  contactOptions,
}: {
  mode: ExportMode
  setMode: (mode: ExportMode) => void
  cohort: ReturnType<typeof useCohortEmailExport>
  lookup: ReturnType<typeof useNameContactLookup>
  contactOptions: ReturnType<typeof useContactExportOptions>
}) {
  return (
    <DialogBody className="flex min-h-0 flex-col pt-4 md:overflow-hidden">
      <ModeTabs mode={mode} onModeChange={setMode} />
      {mode === 'lookup' ? (
        <LookupPanel {...lookup} {...contactOptions} />
      ) : (
        <CohortPanel {...cohort} />
      )}
    </DialogBody>
  )
}

export function ExportContactsDialog({
  open,
  onOpenChange,
}: ExportContactsDialogProps) {
  const c = useExportContactsDialogController(onOpenChange)

  return (
    <Dialog open={open} onOpenChange={c.handleOpenChange}>
      <DialogContent
        className="h-[calc(100svh-2rem)] rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] sm:h-[min(44rem,calc(100svh-2rem))] sm:max-w-3xl"
        style={{ backgroundColor: '#111110' }}
        showCloseButton={false}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />
        <div className="relative flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl tracking-[-0.01em]">
              Export contacts
            </DialogTitle>
          </DialogHeader>
          <ExportDialogBody
            mode={c.mode}
            setMode={c.setMode}
            cohort={c.cohort}
            lookup={c.lookup}
            contactOptions={c.contactOptions}
          />
          <ExportEmailsFooter
            canCopy={canCopyContactsExport({
              mode: c.mode,
              copySourceLength: c.copyEmails?.length ?? null,
              invalidPhoneCount: c.invalidPhoneCount,
            })}
            isLoading={c.isLoading}
            copied={c.copied}
            copyLabel={resolveCopyLabel(c.mode, c.contactOptions.field)}
            onCopy={() => void c.handleCopy()}
            onClose={() => c.handleOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function formatStatus(status: string): string {
  return status.replaceAll('_', ' ')
}

function formatContactPhone(phone: string): string {
  const normalized = normalizeToE164(phone)
  return normalized.ok ? normalized.e164 : `Invalid phone: ${phone}`
}

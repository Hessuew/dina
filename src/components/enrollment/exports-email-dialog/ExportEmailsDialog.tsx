import { useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { useServerFn } from '@tanstack/react-start'
import {
  GROUP_OPTIONS,
  formatEmailsForExport,
  resolveEmailCountLabel,
} from './export-emails-dialog.domain'
import type { EmailGroup } from './export-emails-dialog.domain'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getEnrollmentEmails } from '@/utils/enrolment/enrollments'
import { toUserError } from '@/utils/errors'

type ExportEmailsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// --- hook ---

function useExportEmailsDialog(onOpenChange: (open: boolean) => void) {
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
      if (gen === generationRef.current) toast.error(toUserError(error).message)
    } finally {
      if (gen === generationRef.current) setIsLoading(false)
    }
  }

  async function handleCopy() {
    if (!emails) return
    try {
      await navigator.clipboard.writeText(formatEmailsForExport(emails))
      setCopied(true)
      toast.success('Emails copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelectedGroup(null)
      setEmails(null)
      setCopied(false)
    }
    onOpenChange(next)
  }

  return {
    selectedGroup,
    emails,
    isLoading,
    copied,
    handleGroupSelect,
    handleCopy,
    handleOpenChange,
  }
}

// --- sub-components ---

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
    <div className="flex gap-2">
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

type EmailListPreviewProps = { emails: Array<string> }

function EmailListPreview({ emails }: EmailListPreviewProps) {
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

type ExportEmailsFooterProps = {
  emails: Array<string> | null
  isLoading: boolean
  copied: boolean
  onCopy: () => void
  onClose: () => void
}

function ExportEmailsFooter({
  emails,
  isLoading,
  copied,
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
        disabled={!emails || isLoading}
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
            Copy emails
          </>
        )}
      </Button>
    </DialogFooter>
  )
}

// --- shell ---

export function ExportEmailsDialog({
  open,
  onOpenChange,
}: ExportEmailsDialogProps) {
  const {
    selectedGroup,
    emails,
    isLoading,
    copied,
    handleGroupSelect,
    handleCopy,
    handleOpenChange,
  } = useExportEmailsDialog(onOpenChange)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] sm:max-w-lg"
        style={{ backgroundColor: '#111110' }}
        showCloseButton={false}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />
        <div className="relative">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl tracking-[-0.01em]">
              Export emails
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="pt-4">
            <p className="mb-4 text-[0.78rem] text-[#8E816D]">
              Choose a group to export their email addresses.
            </p>
            <GroupSelector
              selectedGroup={selectedGroup}
              isLoading={isLoading}
              onSelect={(g) => void handleGroupSelect(g)}
            />
            {isLoading && (
              <p className="mt-4 text-[0.78rem] text-[#8E816D]">Loading…</p>
            )}
            {emails && !isLoading && <EmailListPreview emails={emails} />}
          </DialogBody>
          <ExportEmailsFooter
            emails={emails}
            isLoading={isLoading}
            copied={copied}
            onCopy={() => void handleCopy()}
            onClose={() => handleOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

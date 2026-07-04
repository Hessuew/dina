import { useEffect, useRef, useState } from 'react'
import { MailIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useServerFn } from '@tanstack/react-start'
import {
  EMAIL_CAMPAIGN_OPTIONS,
  campaignToRelease,
  resolveCanSend,
  resolvePreviewFailure,
  resolveResultLabel,
  resolveStatusLines,
} from './email-campaign-dialog.domain'
import type { EmailCampaignType } from '@/utils/email/domain/campaigns.domain'
import type {
  EmailCampaignPreview,
  EmailCampaignSendSummary,
} from '@/utils/email/service/email-campaign.service'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getEmailCampaignLocks,
  previewEmailCampaign,
  releaseEmailCampaign,
  sendEmailCampaign,
} from '@/utils/email/email-campaign'
import { toUserError } from '@/utils/errors'

type EmailCampaignDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function settle<T>(
  promise: Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  return promise.then(
    (value) => ({ ok: true as const, value }),
    (error) => ({ ok: false as const, error }),
  )
}

function useEmailCampaignPreview() {
  const [selectedCampaign, setSelectedCampaign] =
    useState<EmailCampaignType | null>(null)
  const [preview, setPreview] = useState<EmailCampaignPreview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lockedCampaigns, setLockedCampaigns] = useState<
    Set<EmailCampaignType>
  >(() => new Set())
  const previewFn = useServerFn(previewEmailCampaign)
  const locksFn = useServerFn(getEmailCampaignLocks)
  const releaseFn = useServerFn(releaseEmailCampaign)
  const generationRef = useRef(0)

  async function initLocks() {
    const result = await settle(locksFn())
    if (result.ok) setLockedCampaigns(new Set(result.value))
  }

  function handlePreviewFailure(campaign: EmailCampaignType, error: unknown) {
    const failure = resolvePreviewFailure(error)
    if (failure.kind === 'locked') {
      setLockedCampaigns((prev) => new Set(prev).add(campaign))
      setSelectedCampaign(null)
    } else {
      toast.error(failure.message)
    }
  }

  async function select(campaign: EmailCampaignType) {
    const gen = ++generationRef.current
    const toRelease = campaignToRelease(selectedCampaign, campaign)
    if (toRelease) void releaseFn({ data: { campaign: toRelease } })
    setSelectedCampaign(campaign)
    setPreview(null)
    setIsLoading(true)
    const result = await settle(previewFn({ data: { campaign } }))
    if (gen !== generationRef.current) return
    setIsLoading(false)
    if (result.ok) setPreview(result.value)
    else handlePreviewFailure(campaign, result.error)
  }

  function reset() {
    if (selectedCampaign !== null) {
      void releaseFn({ data: { campaign: selectedCampaign } })
    }
    setSelectedCampaign(null)
    setPreview(null)
    setLockedCampaigns(new Set())
  }

  return {
    selectedCampaign,
    preview,
    isLoading,
    lockedCampaigns,
    initLocks,
    select,
    reset,
  }
}

function useEmailCampaignSend(selectedCampaign: EmailCampaignType | null) {
  const [summary, setSummary] = useState<EmailCampaignSendSummary | null>(null)
  const [isSending, setIsSending] = useState(false)
  const sendFn = useServerFn(sendEmailCampaign)

  async function handleSend() {
    if (!selectedCampaign) return
    setIsSending(true)
    const result = await settle(
      sendFn({ data: { campaign: selectedCampaign } }),
    )
    setIsSending(false)
    if (result.ok) {
      setSummary(result.value)
      toast.success(resolveResultLabel(result.value))
    } else {
      toast.error(toUserError(result.error).message)
    }
  }

  return {
    summary,
    isSending,
    handleSend,
    resetSummary: () => setSummary(null),
  }
}

function useEmailCampaignDialog(
  open: boolean,
  onOpenChange: (open: boolean) => void,
) {
  const previewState = useEmailCampaignPreview()
  const sendState = useEmailCampaignSend(previewState.selectedCampaign)

  useEffect(() => {
    if (open) void previewState.initLocks()
  }, [open])

  function handleCampaignSelect(campaign: EmailCampaignType) {
    sendState.resetSummary()
    void previewState.select(campaign)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      previewState.reset()
      sendState.resetSummary()
    }
    onOpenChange(next)
  }

  return { previewState, sendState, handleCampaignSelect, handleOpenChange }
}

type CampaignSelectorProps = {
  selectedCampaign: EmailCampaignType | null
  disabled: boolean
  lockedCampaigns: ReadonlySet<EmailCampaignType>
  onSelect: (campaign: EmailCampaignType) => void
}

function CampaignSelector(props: CampaignSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      {EMAIL_CAMPAIGN_OPTIONS.map(({ value, label, description }) => {
        const isLocked = props.lockedCampaigns.has(value)
        return (
          <Button
            key={value}
            type="button"
            theme="dark"
            variant={props.selectedCampaign === value ? 'default' : 'outline'}
            disabled={props.disabled || isLocked}
            className="h-auto flex-col items-start gap-0.5 py-2"
            onClick={() => props.onSelect(value)}
          >
            <span>{label}</span>
            <span className="text-[0.72rem] font-normal opacity-70">
              {isLocked ? 'In use · try again shortly' : description}
            </span>
          </Button>
        )
      })}
    </div>
  )
}

type CampaignStatusSectionProps = Parameters<typeof resolveStatusLines>[0]

function CampaignStatusSection(props: CampaignStatusSectionProps) {
  const lines = resolveStatusLines(props)
  return (
    <div className="mt-4 flex flex-col gap-1">
      {lines.map((line) => (
        <p
          key={line.text}
          className={
            line.tone === 'strong'
              ? 'text-[0.82rem] text-[#D6CCBE]'
              : 'text-[0.72rem] text-[#8E816D]'
          }
        >
          {line.text}
        </p>
      ))}
    </div>
  )
}

function EmailCampaignFooter(props: {
  canSend: boolean
  isSending: boolean
  onSend: () => void
  onClose: () => void
}) {
  return (
    <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
      <Button
        type="button"
        variant="ghost"
        theme="dark"
        onClick={props.onClose}
      >
        Close
      </Button>
      <Button
        type="button"
        theme="dark"
        disabled={!props.canSend}
        onClick={props.onSend}
      >
        <MailIcon className="size-3.5" />
        {props.isSending ? 'Sending...' : 'Send invitation emails'}
      </Button>
    </DialogFooter>
  )
}

export function EmailCampaignDialog({
  open,
  onOpenChange,
}: EmailCampaignDialogProps) {
  const { previewState, sendState, handleCampaignSelect, handleOpenChange } =
    useEmailCampaignDialog(open, onOpenChange)
  const { preview, isLoading } = previewState
  const { summary, isSending } = sendState
  const canSend = resolveCanSend({ preview, summary, isLoading, isSending })

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
            <DialogTitle className="font-serif text-xl">
              Send invitation emails
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="pt-4">
            <p className="mb-4 text-[0.78rem] text-[#8E816D]">
              Choose a campaign, review the recipient count, then confirm.
            </p>
            <CampaignSelector
              selectedCampaign={previewState.selectedCampaign}
              disabled={isLoading || isSending}
              lockedCampaigns={previewState.lockedCampaigns}
              onSelect={handleCampaignSelect}
            />
            <CampaignStatusSection
              preview={preview}
              summary={summary}
              isLoading={isLoading}
            />
          </DialogBody>
          <EmailCampaignFooter
            canSend={canSend}
            isSending={isSending}
            onSend={() => void sendState.handleSend()}
            onClose={() => handleOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

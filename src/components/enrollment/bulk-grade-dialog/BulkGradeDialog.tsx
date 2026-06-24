import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useServerFn } from '@tanstack/react-start'
import {
  formatPreviewSummary,
  parseFormInputs,
} from './bulk-grade-dialog.domain'
import type { BulkGradePreview } from '@/utils/enrolment/domain/bulk-grade.domain'
import { BULK_GRADE_SUM_MAX } from '@/utils/enrolment/domain/bulk-grade.domain'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { bulkGradeEnrollments } from '@/utils/enrolment/enrollments'
import { toUserError } from '@/utils/errors'

type BulkGradeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

// --- hook ---

function useBulkGradeDialog(
  onOpenChange: (open: boolean) => void,
  onSuccess: () => void,
) {
  const [approveMin, setApproveMin] = useState('')
  const [waitlistMin, setWaitlistMin] = useState('')
  const [preview, setPreview] = useState<BulkGradePreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bulkGradeFn = useServerFn(bulkGradeEnrollments)

  const parsed = parseFormInputs(approveMin, waitlistMin)

  async function fetchPreview(appMin: string, waitMin: string) {
    const result = parseFormInputs(appMin, waitMin)
    if (!result.valid) {
      setPreview(null)
      setPreviewError(null)
      return
    }
    setIsPreviewLoading(true)
    setPreviewError(null)
    try {
      const data = await bulkGradeFn({
        data: { ...result.thresholds, dryRun: true },
      })
      setPreview(data)
    } catch (error) {
      setPreview(null)
      setPreviewError(toUserError(error).message)
    } finally {
      setIsPreviewLoading(false)
    }
  }

  function schedulePreview(appMin: string, waitMin: string) {
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current)
    previewDebounceRef.current = setTimeout(
      () => void fetchPreview(appMin, waitMin),
      400,
    )
  }

  function handleApproveMinChange(value: string) {
    setApproveMin(value)
    schedulePreview(value, waitlistMin)
  }

  function handleWaitlistMinChange(value: string) {
    setWaitlistMin(value)
    schedulePreview(approveMin, value)
  }

  async function handleSubmit() {
    if (!parsed.valid) return
    setIsSubmitting(true)
    try {
      const result = await bulkGradeFn({
        data: { ...parsed.thresholds, dryRun: false },
      })
      toast.success(
        `Graded ${result.total} enrollment${result.total === 1 ? '' : 's'}: ${formatPreviewSummary(result)}`,
      )
      handleClose()
      onSuccess()
    } catch (error) {
      toast.error(toUserError(error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleClose() {
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current)
    setApproveMin('')
    setWaitlistMin('')
    setPreview(null)
    setPreviewError(null)
    onOpenChange(false)
  }

  return {
    approveMin,
    waitlistMin,
    parsed,
    preview,
    previewError,
    isPreviewLoading,
    isSubmitting,
    handleApproveMinChange,
    handleWaitlistMinChange,
    handleSubmit,
    handleClose,
  }
}

// --- sub-components ---

type ThresholdFieldProps = {
  id: string
  label: string
  hint: string
  value: string
  error: string | null
  onChange: (v: string) => void
}

function ThresholdField({
  id,
  label,
  hint,
  value,
  error,
  onChange,
}: ThresholdFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-[0.72rem] font-medium tracking-[0.14em] text-[#9B7A41] uppercase"
      >
        {label}
      </label>
      <Input
        id={id}
        theme="dark"
        type="number"
        min={0}
        max={BULK_GRADE_SUM_MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24"
        aria-invalid={!!error}
      />
      {error ? (
        <p className="text-[0.72rem] text-red-400">{error}</p>
      ) : (
        <p className="text-[0.72rem] text-[#8E816D]">{hint}</p>
      )}
    </div>
  )
}

type PreviewPanelProps = {
  preview: BulkGradePreview | null
  error: string | null
  isLoading: boolean
}

function PreviewPanel({ preview, error, isLoading }: PreviewPanelProps) {
  if (isLoading) {
    return <p className="text-[0.78rem] text-[#8E816D]">Computing preview…</p>
  }
  if (error) {
    return <p className="text-[0.78rem] text-red-400">{error}</p>
  }
  if (!preview) return null
  return (
    <div className="rounded-none border border-white/10 bg-white/3 px-4 py-3">
      <p className="mb-1 text-[0.72rem] font-medium tracking-[0.14em] text-[#9B7A41] uppercase">
        Preview — {preview.total} awaiting approval
      </p>
      <p className="text-[0.82rem] text-[#D6CCBE]">
        {formatPreviewSummary(preview)}
      </p>
    </div>
  )
}

type BulkGradeFooterProps = {
  canSubmit: boolean
  isSubmitting: boolean
  onSubmit: () => void
  onClose: () => void
}

function BulkGradeFooter({
  canSubmit,
  isSubmitting,
  onSubmit,
  onClose,
}: BulkGradeFooterProps) {
  return (
    <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
      <Button type="button" variant="ghost" theme="dark" onClick={onClose}>
        Cancel
      </Button>
      <Button
        type="button"
        theme="dark"
        disabled={!canSubmit || isSubmitting}
        onClick={onSubmit}
      >
        {isSubmitting ? 'Applying…' : 'Apply grades'}
      </Button>
    </DialogFooter>
  )
}

// --- shell ---

export function BulkGradeDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkGradeDialogProps) {
  const {
    approveMin,
    waitlistMin,
    parsed,
    preview,
    previewError,
    isPreviewLoading,
    isSubmitting,
    handleApproveMinChange,
    handleWaitlistMinChange,
    handleSubmit,
    handleClose,
  } = useBulkGradeDialog(onOpenChange, onSuccess)

  const errors = parsed.valid
    ? { approveMin: null, waitlistMin: null }
    : parsed.errors

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose()
      }}
    >
      <DialogContent
        className="rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] sm:max-w-lg"
        style={{ backgroundColor: '#111110' }}
        showCloseButton={false}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />
        <div className="relative">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl tracking-[-0.01em]">
              Bulk grade enrollments
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="pt-4">
            <p className="mb-5 text-[0.78rem] text-[#8E816D]">
              Set score thresholds to approve or reject all{' '}
              <strong className="text-[#AFA28F]">awaiting approval</strong>{' '}
              enrollments at once. Score range is 0–{BULK_GRADE_SUM_MAX}.{' '}
              <strong className="text-[#C5A059]">
                Special case enrollments are automatically approved regardless
                of score.
              </strong>
            </p>
            <div className="mb-5 flex gap-6">
              <ThresholdField
                id="bulk-grade-approve-min"
                label="Approve if score ≥"
                hint="Required"
                value={approveMin}
                error={errors.approveMin}
                onChange={handleApproveMinChange}
              />
              <ThresholdField
                id="bulk-grade-waitlist-min"
                label="Waitlist if score ≥"
                hint="Optional — leave blank to skip waitlist band"
                value={waitlistMin}
                error={errors.waitlistMin}
                onChange={handleWaitlistMinChange}
              />
            </div>
            <PreviewPanel
              preview={preview}
              error={previewError}
              isLoading={isPreviewLoading}
            />
          </DialogBody>
          <BulkGradeFooter
            canSubmit={parsed.valid}
            isSubmitting={isSubmitting}
            onSubmit={() => void handleSubmit()}
            onClose={handleClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

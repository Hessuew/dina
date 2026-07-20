import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { parseDatetimeLocalValue, toDatetimeLocalValue } from '@/utils/datetime'
import { computeUpcomingOccurrences } from '@/utils/discipleship/domain/discipleship-schedule.domain'
import { FormDialog } from '@/components/ui/form-dialog/FormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type ScheduleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  initialAnchor: string | null
  isSaving: boolean
  onSave: (anchorAt: Date) => void
}

function OccurrencePreview({ value }: { value: string }) {
  const date = parseDatetimeLocalValue(value)
  if (!date) return null
  const occurrences = computeUpcomingOccurrences(date, new Date(), 3)
  return (
    <div className="mt-4 flex flex-col gap-1">
      <p className="text-[0.68rem] font-medium tracking-[0.2em] text-[#9B7A41] uppercase">
        Next meetings (every 4 weeks)
      </p>
      {occurrences.map((d) => (
        <p key={d.toISOString()} className="text-[0.82rem] text-[#D6CCBE]">
          {format(d, 'EEE, MMM d, yyyy · HH:mm')}
        </p>
      ))}
    </div>
  )
}

export function ScheduleDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  initialAnchor,
  isSaving,
  onSave,
}: ScheduleDialogProps) {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (open) setValue(toDatetimeLocalValue(initialAnchor))
  }, [open, initialAnchor])

  const parsed = parseDatetimeLocalValue(value)

  const footer = (
    <>
      <Button
        variant="outline"
        theme="dark"
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </Button>
      <Button
        theme="dark"
        disabled={!parsed || isSaving}
        onClick={() => parsed && onSave(parsed)}
      >
        {isSaving ? 'Saving…' : 'Save time'}
      </Button>
    </>
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      mode="edit"
      title={title}
      subtitle={subtitle}
      maxWidth="md"
      footer={footer}
    >
      <Input
        theme="dark"
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <OccurrencePreview value={value} />
    </FormDialog>
  )
}

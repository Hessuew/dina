import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useMutation } from '@/hooks/useMutation'
import { submitExamAttempt } from '@/utils/exam'

type SubmitExamButtonProps = {
  attemptId: string
  onSubmitted: () => void
}

export function SubmitExamButton({
  attemptId,
  onSubmitted,
}: SubmitExamButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const submitMutation = useMutation({
    fn: submitExamAttempt,
    onSuccess: () => {
      toast.success('Exam submitted')
      onSubmitted()
    },
  })

  return (
    <div className="flex justify-end">
      <Button
        disabled={submitMutation.isPending}
        onClick={() => setConfirmOpen(true)}
      >
        {submitMutation.isPending ? 'Submitting…' : 'Submit exam'}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Submit exam"
        description="Submitting finalizes your exam. You cannot return to it or change your answers afterwards. Are you sure you are ready?"
        confirmLabel="Submit exam"
        pendingLabel="Submitting…"
        isPending={submitMutation.isPending}
        onConfirm={async () => {
          const result = await submitMutation.mutate({ data: { attemptId } })
          if (result) setConfirmOpen(false)
        }}
      />
    </div>
  )
}

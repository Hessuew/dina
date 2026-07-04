import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
        onClick={() => {
          if (
            window.confirm(
              'Submit your exam? You cannot change your answers afterwards.',
            )
          ) {
            void submitMutation.mutate({ data: { attemptId } })
          }
        }}
      >
        {submitMutation.isPending ? 'Submitting…' : 'Submit exam'}
      </Button>
    </div>
  )
}

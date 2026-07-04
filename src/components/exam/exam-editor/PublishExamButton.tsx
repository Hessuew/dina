import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useMutation } from '@/hooks/useMutation'
import { publishExam } from '@/utils/exam'

export function PublishExamButton({ examId }: { examId: string }) {
  const router = useRouter()
  const publishMutation = useMutation({
    fn: publishExam,
    onSuccess: async () => {
      toast.success('Exam published — questions are now frozen')
      await router.invalidate()
    },
  })

  return (
    <Button
      size="sm"
      disabled={publishMutation.isPending}
      onClick={() => {
        if (
          window.confirm(
            'Publish this exam? Questions can no longer be edited afterwards.',
          )
        ) {
          void publishMutation.mutate({ data: { examId } })
        }
      }}
    >
      {publishMutation.isPending ? 'Publishing…' : 'Publish exam'}
    </Button>
  )
}

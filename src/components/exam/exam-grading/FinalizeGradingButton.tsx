import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useMutation } from '@/hooks/useMutation'
import { finalizeExamGrading } from '@/utils/exam'

export function FinalizeGradingButton({ attemptId }: { attemptId: string }) {
  const router = useRouter()
  const finalizeMutation = useMutation({
    fn: finalizeExamGrading,
    onSuccess: async () => {
      toast.success('Grading finalized — the student can now see their score')
      await router.invalidate()
    },
  })

  return (
    <Button
      size="sm"
      disabled={finalizeMutation.isPending}
      onClick={() => void finalizeMutation.mutate({ data: { attemptId } })}
    >
      {finalizeMutation.isPending ? 'Finalizing…' : 'Finalize grading'}
    </Button>
  )
}

import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { useMutation } from '@/hooks/useMutation'
import { deleteExam } from '@/utils/exam'

export function DeleteExamButton({ examId }: { examId: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const deleteMutation = useMutation({
    fn: deleteExam,
    onSuccess: () => {
      toast.success('Exam deleted')
      router.navigate({ to: '/exams' })
    },
  })

  return (
    <>
      <Button
        size="sm"
        variant="destructive"
        disabled={deleteMutation.isPending}
        onClick={() => setOpen(true)}
      >
        Delete
      </Button>
      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        entityName="Exam"
        onConfirm={() => deleteMutation.mutate({ data: { examId } })}
        isDeleting={deleteMutation.isPending}
      />
    </>
  )
}

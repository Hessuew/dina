import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useMutation } from '@/hooks/useMutation'
import { updateExam } from '@/utils/exam'
import { toDatetimeLocalValue } from '@/components/view/exams-view/exams-view.domain'

export type MetaExam = {
  id: string
  title: string
  durationMinutes: number
  opensAt: Date
  closesAt: Date
}

export function ExamMetaForm({ exam }: { exam: MetaExam }) {
  const router = useRouter()
  const [title, setTitle] = useState(exam.title)
  const [durationMinutes, setDurationMinutes] = useState(exam.durationMinutes)
  const [opensAt, setOpensAt] = useState(toDatetimeLocalValue(exam.opensAt))
  const [closesAt, setClosesAt] = useState(toDatetimeLocalValue(exam.closesAt))

  const updateMutation = useMutation({
    fn: updateExam,
    onSuccess: async () => {
      toast.success('Exam updated')
      await router.invalidate()
    },
  })

  return (
    <form
      className="flex flex-wrap items-end gap-3 border border-[#1A1A1A]/10 bg-white/70 p-5"
      onSubmit={(event) => {
        event.preventDefault()
        void updateMutation.mutate({
          data: {
            examId: exam.id,
            title,
            durationMinutes,
            opensAt: new Date(opensAt).toISOString(),
            closesAt: new Date(closesAt).toISOString(),
          },
        })
      }}
    >
      <MetaField label="Title">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          className="w-56"
        />
      </MetaField>
      <MetaField label="Duration (min)">
        <Input
          type="number"
          min={1}
          value={durationMinutes}
          onChange={(event) => setDurationMinutes(Number(event.target.value))}
          className="w-28"
        />
      </MetaField>
      <MetaWindowFields
        opensAt={opensAt}
        closesAt={closesAt}
        onOpensAtChange={setOpensAt}
        onClosesAtChange={setClosesAt}
      />
      <Button type="submit" variant="outline" disabled={updateMutation.isPending}>
        {updateMutation.isPending ? 'Saving…' : 'Save details'}
      </Button>
    </form>
  )
}

function MetaWindowFields({
  opensAt,
  closesAt,
  onOpensAtChange,
  onClosesAtChange,
}: {
  opensAt: string
  closesAt: string
  onOpensAtChange: (value: string) => void
  onClosesAtChange: (value: string) => void
}) {
  return (
    <>
      <MetaField label="Opens">
        <Input
          type="datetime-local"
          value={opensAt}
          onChange={(event) => onOpensAtChange(event.target.value)}
        />
      </MetaField>
      <MetaField label="Closes">
        <Input
          type="datetime-local"
          value={closesAt}
          onChange={(event) => onClosesAtChange(event.target.value)}
        />
      </MetaField>
    </>
  )
}

function MetaField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="space-y-1">
      <span className="block text-[0.68rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
        {label}
      </span>
      {children}
    </label>
  )
}

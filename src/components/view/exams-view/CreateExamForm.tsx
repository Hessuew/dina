import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useMutation } from '@/hooks/useMutation'
import { createExam } from '@/utils/exam'
import { toDatetimeLocalValue } from '@/components/view/exams-view/exams-view.domain'

function defaultWindow() {
  const opens = new Date(Date.now() + 24 * 60 * 60_000)
  const closes = new Date(opens.getTime() + 2 * 60 * 60_000)
  return { opens, closes }
}

export function CreateExamForm() {
  const navigate = useNavigate()
  const initial = defaultWindow()
  const [title, setTitle] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [opensAt, setOpensAt] = useState(toDatetimeLocalValue(initial.opens))
  const [closesAt, setClosesAt] = useState(toDatetimeLocalValue(initial.closes))

  const createMutation = useMutation({
    fn: createExam,
    onSuccess: async ({ data }) => {
      toast.success('Exam created')
      await navigate({ to: '/exams/$examId', params: { examId: data.id } })
    },
  })

  return (
    <form
      className="flex flex-wrap items-end gap-3 border border-[#1A1A1A]/10 bg-white/70 p-5"
      onSubmit={(event) => {
        event.preventDefault()
        void createMutation.mutate({
          data: {
            title,
            durationMinutes,
            opensAt: new Date(opensAt).toISOString(),
            closesAt: new Date(closesAt).toISOString(),
          },
        })
      }}
    >
      <CreateExamField label="Title">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="New exam title"
          required
          className="w-56"
        />
      </CreateExamField>
      <CreateExamField label="Duration (min)">
        <Input
          type="number"
          min={1}
          value={durationMinutes}
          onChange={(event) => setDurationMinutes(Number(event.target.value))}
          className="w-28"
        />
      </CreateExamField>
      <CreateExamWindowFields
        opensAt={opensAt}
        closesAt={closesAt}
        onOpensAtChange={setOpensAt}
        onClosesAtChange={setClosesAt}
      />
      <Button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Creating…' : 'Create exam'}
      </Button>
    </form>
  )
}

function CreateExamWindowFields({
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
      <CreateExamField label="Opens">
        <Input
          type="datetime-local"
          value={opensAt}
          onChange={(event) => onOpensAtChange(event.target.value)}
          required
        />
      </CreateExamField>
      <CreateExamField label="Closes">
        <Input
          type="datetime-local"
          value={closesAt}
          onChange={(event) => onClosesAtChange(event.target.value)}
          required
        />
      </CreateExamField>
    </>
  )
}

function CreateExamField({
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

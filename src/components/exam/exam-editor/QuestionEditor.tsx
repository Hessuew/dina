import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { OptionDraft } from '@/components/exam/exam-editor/McOptionsEditor'
import type {
  ExamQuestionType,
  ExamStatus,
} from '@/utils/exam/domain/exam-lifecycle.domain'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useMutation } from '@/hooks/useMutation'
import { deleteExamQuestion, upsertExamQuestion } from '@/utils/exam'
import { McOptionsEditor } from '@/components/exam/exam-editor/McOptionsEditor'
import {
  buildUpsertQuestionInput,
  initialQuestionEditorState,
  questionSaveButtonLabel,
  questionSavedMessage,
} from '@/components/exam/exam-editor/question-editor.domain'

export type EditorExam = {
  id: string
  title: string
  durationMinutes: number
  opensAt: Date
  closesAt: Date
  status: ExamStatus
}

export type EditorQuestion = {
  id: string
  type: ExamQuestionType
  prompt: string
  points: number
}

export type EditorOption = {
  id: string
  questionId: string
  label: string
  orderIndex: number
  isCorrect: boolean
}

type QuestionEditorProps = {
  examId: string
  question: EditorQuestion | null
  options: Array<EditorOption>
  orderIndex: number
  readOnly: boolean
}

export function QuestionEditor({
  examId,
  question,
  options,
  orderIndex,
  readOnly,
}: QuestionEditorProps) {
  const initial = initialQuestionEditorState(question, options, readOnly)
  const [type, setType] = useState(initial.type)
  const [prompt, setPrompt] = useState(initial.prompt)
  const [points, setPoints] = useState(initial.points)
  const [optionDrafts, setOptionDrafts] = useState<Array<OptionDraft>>(
    initial.optionDrafts,
  )
  const { save, saving } = useQuestionSave({
    examId,
    questionId: initial.questionId,
    type,
    prompt,
    orderIndex,
    points,
    optionDrafts,
  })

  return (
    <div className="space-y-4 border border-[#1A1A1A]/10 bg-white/70 p-5">
      <QuestionEditorHeader
        orderIndex={orderIndex}
        isNew={initial.isNew}
        type={type}
        onTypeChange={setType}
        readOnly={initial.typeLocked}
      />
      <Textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="Question prompt"
        disabled={readOnly}
      />
      {type === 'multiple_choice' && (
        <McOptionsEditor
          options={optionDrafts}
          onChange={setOptionDrafts}
          readOnly={readOnly}
        />
      )}
      {!readOnly && (
        <QuestionEditorFooter
          examId={examId}
          questionId={initial.questionId}
          points={points}
          onPointsChange={setPoints}
          onSave={save}
          saving={saving}
        />
      )}
    </div>
  )
}

function useQuestionSave(draft: {
  examId: string
  questionId: string | null
  type: ExamQuestionType
  prompt: string
  orderIndex: number
  points: number
  optionDrafts: Array<OptionDraft>
}) {
  const router = useRouter()
  const saveMutation = useMutation({
    fn: upsertExamQuestion,
    onSuccess: async () => {
      toast.success(questionSavedMessage(draft.questionId !== null))
      await router.invalidate()
    },
  })
  const save = () =>
    saveMutation.mutate({ data: buildUpsertQuestionInput(draft) })
  return { save, saving: saveMutation.isPending }
}

function QuestionEditorFooter({
  examId,
  questionId,
  points,
  onPointsChange,
  onSave,
  saving,
}: {
  examId: string
  questionId: string | null
  points: number
  onPointsChange: (points: number) => void
  onSave: () => void
  saving: boolean
}) {
  const router = useRouter()
  const deleteMutation = useMutation({
    fn: deleteExamQuestion,
    onSuccess: async () => {
      toast.success('Question deleted')
      await router.invalidate()
    },
  })
  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-2 text-xs text-[#8E816D]">
        Points
        <Input
          type="number"
          min={1}
          value={points}
          onChange={(event) => onPointsChange(Number(event.target.value))}
          className="w-20"
        />
      </label>
      <Button size="sm" onClick={onSave} disabled={saving}>
        {questionSaveButtonLabel(questionId !== null)}
      </Button>
      {questionId !== null && (
        <Button
          size="sm"
          variant="ghost"
          disabled={deleteMutation.isPending}
          onClick={() =>
            deleteMutation.mutate({ data: { examId, questionId } })
          }
        >
          Delete
        </Button>
      )}
    </div>
  )
}

function QuestionEditorHeader({
  orderIndex,
  isNew,
  type,
  onTypeChange,
  readOnly,
}: {
  orderIndex: number
  isNew: boolean
  type: ExamQuestionType
  onTypeChange: (type: ExamQuestionType) => void
  readOnly: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-[0.72rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
        {isNew ? 'New question' : `Question ${orderIndex + 1}`}
      </p>
      {readOnly ? (
        <span className="text-xs text-[#8E816D]">
          {type === 'multiple_choice' ? 'Multiple choice' : 'Open-ended'}
        </span>
      ) : (
        <select
          value={type}
          onChange={(event) =>
            onTypeChange(event.target.value as ExamQuestionType)
          }
          className="border border-[#1A1A1A]/12 bg-white/70 px-2 py-1 text-xs text-[#4E463D]"
        >
          <option value="multiple_choice">Multiple choice</option>
          <option value="open_ended">Open-ended</option>
        </select>
      )}
    </div>
  )
}

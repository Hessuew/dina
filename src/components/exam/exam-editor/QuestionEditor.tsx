import type {
  ExamQuestionType,
  ExamStatus,
} from '@/utils/exam/domain/exam-lifecycle.domain'
import type { OptionDraft } from '@/components/exam/exam-editor/McOptionsEditor'
import type { QuestionEditorDraft } from '@/components/exam/exam-editor/question-editor.domain'
import { questionEditorMode } from '@/components/exam/exam-editor/question-editor.domain'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { McOptionsEditor } from '@/components/exam/exam-editor/McOptionsEditor'

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
  question: QuestionEditorDraft
  orderIndex: number
  readOnly: boolean
  onChange: (question: QuestionEditorDraft) => void
  onDelete: () => void
}

export function QuestionEditor({
  question,
  orderIndex,
  readOnly,
  onChange,
  onDelete,
}: QuestionEditorProps) {
  const { isNew, typeLocked } = questionEditorMode(
    question.questionId,
    readOnly,
  )
  const update = (changes: Partial<QuestionEditorDraft>) =>
    onChange({ ...question, ...changes })

  return (
    <div className="space-y-4 border border-[#1A1A1A]/10 bg-white/70 p-5">
      <QuestionEditorHeader
        orderIndex={orderIndex}
        isNew={isNew}
        type={question.type}
        onTypeChange={(type) => update({ type })}
        readOnly={typeLocked}
      />
      <Textarea
        value={question.prompt}
        onChange={(event) => update({ prompt: event.target.value })}
        placeholder="Question prompt"
        disabled={readOnly}
      />
      <QuestionEditorOptions
        question={question}
        orderIndex={orderIndex}
        readOnly={readOnly}
        onChange={(optionDrafts) => update({ optionDrafts })}
      />
      <QuestionEditorFooter
        questionId={question.questionId}
        points={question.points}
        readOnly={readOnly}
        onPointsChange={(points) => update({ points })}
        onDelete={onDelete}
      />
    </div>
  )
}

function QuestionEditorOptions({
  question,
  orderIndex,
  readOnly,
  onChange,
}: {
  question: QuestionEditorDraft
  orderIndex: number
  readOnly: boolean
  onChange: (options: Array<OptionDraft>) => void
}) {
  if (question.type !== 'multiple_choice') return null
  return (
    <McOptionsEditor
      options={question.optionDrafts}
      optionGroupName={`correct-option-${question.questionId ?? `new-${orderIndex}`}`}
      onChange={onChange}
      readOnly={readOnly}
    />
  )
}

function QuestionEditorFooter({
  questionId,
  points,
  readOnly,
  onPointsChange,
  onDelete,
}: {
  questionId: string | null
  points: number
  readOnly: boolean
  onPointsChange: (points: number) => void
  onDelete: () => void
}) {
  if (readOnly) return null
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
      <Button size="sm" variant="ghost" type="button" onClick={onDelete}>
        {questionId === null ? 'Remove' : 'Delete'}
      </Button>
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

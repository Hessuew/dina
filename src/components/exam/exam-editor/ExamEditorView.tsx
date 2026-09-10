import { PlusIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type {
  EditorExam,
  EditorOption,
  EditorQuestion,
} from '@/components/exam/exam-editor/QuestionEditor'
import type { QuestionEditorDraft } from '@/components/exam/exam-editor/question-editor.domain'
import { useExamEditor } from '@/components/exam/exam-editor/useExamEditor'
import { QuestionEditor } from '@/components/exam/exam-editor/QuestionEditor'
import { ExamMetaForm } from '@/components/exam/exam-editor/ExamMetaForm'
import { PublishExamButton } from '@/components/exam/exam-editor/PublishExamButton'
import { StatusChip } from '@/components/ui/status-chip'
import { Button } from '@/components/ui/button'

type ExamEditorViewProps = {
  exam: EditorExam
  questions: Array<EditorQuestion>
  options: Array<EditorOption>
  attemptCount: number
  canEdit?: boolean
}

export function ExamEditorView({
  exam,
  questions,
  options,
  attemptCount,
  canEdit = exam.status === 'draft',
}: ExamEditorViewProps) {
  const isDraft = exam.status === 'draft'
  const editor = useExamEditor({ exam, questions, options })
  return (
    <div className="space-y-8">
      <ExamEditorHeader
        exam={exam}
        isDraft={isDraft}
        attemptCount={attemptCount}
        canEdit={canEdit}
        onSave={editor.save}
        saving={editor.saving}
      />
      {canEdit && (
        <ExamMetaForm draft={editor.meta} onChange={editor.setMeta} />
      )}
      <ExamQuestionsSection
        canEdit={canEdit}
        questions={editor.questionDrafts}
        newQuestions={editor.newQuestions}
        onAddQuestion={editor.addQuestion}
        onChangeQuestion={editor.updateQuestion}
        onDeleteQuestion={editor.deleteQuestion}
        onChangeNewQuestion={editor.updateNewQuestion}
        onDeleteNewQuestion={editor.deleteNewQuestion}
      />
    </div>
  )
}

function ExamQuestionsSection({
  canEdit,
  questions,
  newQuestions,
  onAddQuestion,
  onChangeQuestion,
  onDeleteQuestion,
  onChangeNewQuestion,
  onDeleteNewQuestion,
}: {
  canEdit: boolean
  questions: Array<QuestionEditorDraft>
  newQuestions: Array<QuestionEditorDraft>
  onAddQuestion: () => void
  onChangeQuestion: (index: number, draft: QuestionEditorDraft) => void
  onDeleteQuestion: (index: number) => void
  onChangeNewQuestion: (index: number, draft: QuestionEditorDraft) => void
  onDeleteNewQuestion: (index: number) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[0.72rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
          Questions
        </p>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={onAddQuestion}>
            <PlusIcon />
            Add question
          </Button>
        )}
      </div>
      {questions.map((question, index) => (
        <QuestionEditor
          key={question.questionId}
          question={question}
          orderIndex={index}
          readOnly={!canEdit}
          onChange={(draft) => onChangeQuestion(index, draft)}
          onDelete={() => onDeleteQuestion(index)}
        />
      ))}
      {canEdit &&
        newQuestions.map((question, index) => (
          <QuestionEditor
            key={`new-question-${index}`}
            question={question}
            orderIndex={questions.length + index}
            readOnly={false}
            onChange={(draft) => onChangeNewQuestion(index, draft)}
            onDelete={() => onDeleteNewQuestion(index)}
          />
        ))}
    </div>
  )
}

function ExamEditorHeader({
  exam,
  isDraft,
  attemptCount,
  canEdit,
  onSave,
  saving,
}: {
  exam: EditorExam
  isDraft: boolean
  attemptCount: number
  canEdit: boolean
  onSave: () => void
  saving: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <StatusChip variant={exam.status} size="md" />
        <ExamDraftNotice isDraft={isDraft} />
      </div>
      <ExamEditorActions
        exam={exam}
        isDraft={isDraft}
        attemptCount={attemptCount}
        canEdit={canEdit}
        onSave={onSave}
        saving={saving}
      />
    </div>
  )
}

function ExamDraftNotice({ isDraft }: { isDraft: boolean }) {
  if (!isDraft) return null
  return (
    <span className="text-xs text-[#8E816D]">
      Not visible to students until published
    </span>
  )
}

function ExamEditorActions({
  exam,
  isDraft,
  attemptCount,
  canEdit,
  onSave,
  saving,
}: {
  exam: EditorExam
  isDraft: boolean
  attemptCount: number
  canEdit: boolean
  onSave: () => void
  saving: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <SaveChangesButton canEdit={canEdit} onSave={onSave} saving={saving} />
      <PublishedExamAction
        exam={exam}
        isDraft={isDraft}
        attemptCount={attemptCount}
      />
    </div>
  )
}

function SaveChangesButton({
  canEdit,
  onSave,
  saving,
}: {
  canEdit: boolean
  onSave: () => void
  saving: boolean
}) {
  if (!canEdit) return null
  return (
    <Button size="sm" variant="outline" disabled={saving} onClick={onSave}>
      {saving ? 'Saving…' : 'Save changes'}
    </Button>
  )
}

function PublishedExamAction({
  exam,
  isDraft,
  attemptCount,
}: {
  exam: EditorExam
  isDraft: boolean
  attemptCount: number
}) {
  if (isDraft) return <PublishExamButton examId={exam.id} />
  return (
    <Button
      variant="outline"
      size="sm"
      render={<Link to="/exams/$examId/grading" params={{ examId: exam.id }} />}
    >
      Grade attempts ({attemptCount})
    </Button>
  )
}

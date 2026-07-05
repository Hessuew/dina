import { Link } from '@tanstack/react-router'
import type {
  EditorExam,
  EditorOption,
  EditorQuestion,
} from '@/components/exam/exam-editor/QuestionEditor'
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
}

export function ExamEditorView({
  exam,
  questions,
  options,
  attemptCount,
}: ExamEditorViewProps) {
  const isDraft = exam.status === 'draft'
  return (
    <div className="space-y-8">
      <ExamEditorHeader
        exam={exam}
        isDraft={isDraft}
        attemptCount={attemptCount}
      />
      {isDraft && <ExamMetaForm exam={exam} />}
      <div className="space-y-4">
        {questions.map((question, index) => (
          <QuestionEditor
            key={question.id}
            examId={exam.id}
            question={question}
            options={options.filter((o) => o.questionId === question.id)}
            orderIndex={index}
            readOnly={!isDraft}
          />
        ))}
        {isDraft && (
          <QuestionEditor
            key={`new-${questions.length}`}
            examId={exam.id}
            question={null}
            options={[]}
            orderIndex={questions.length}
            readOnly={false}
          />
        )}
      </div>
    </div>
  )
}

function ExamEditorHeader({
  exam,
  isDraft,
  attemptCount,
}: {
  exam: EditorExam
  isDraft: boolean
  attemptCount: number
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <StatusChip variant={exam.status} size="md" />
        {isDraft && (
          <span className="text-xs text-[#8E816D]">
            Not visible to students until published
          </span>
        )}
      </div>
      {isDraft ? (
        <PublishExamButton examId={exam.id} />
      ) : (
        <Button
          variant="outline"
          size="sm"
          render={
            <Link to="/exams/$examId/grading" params={{ examId: exam.id }} />
          }
        >
          Grade attempts ({attemptCount})
        </Button>
      )}
    </div>
  )
}

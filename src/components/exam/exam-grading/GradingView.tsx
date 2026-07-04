import type {
  ExamAttemptStatus,
  ExamQuestionType,
} from '@/utils/exam/domain/exam-lifecycle.domain'
import { GradedMcAnswerRow } from '@/components/exam/exam-grading/GradedMcAnswerRow'
import { OpenAnswerGradeRow } from '@/components/exam/exam-grading/OpenAnswerGradeRow'
import { FinalizeGradingButton } from '@/components/exam/exam-grading/FinalizeGradingButton'
import { ATTEMPT_STATUS_CHIP } from '@/components/exam/exam-grading/GradingAttemptsList'
import { StatusChip } from '@/components/ui/status-chip'

export type GradingQuestion = {
  id: string
  type: ExamQuestionType
  prompt: string
  points: number
}

export type GradingOption = {
  id: string
  questionId: string
  label: string
  isCorrect: boolean
}

export type GradingAnswer = {
  id: string
  questionId: string
  selectedOptionId: string | null
  textAnswer: string | null
  isCorrect: boolean | null
  awardedPoints: number | null
}

type GradingViewProps = {
  attempt: { id: string; status: ExamAttemptStatus; totalScore: number | null }
  questions: Array<GradingQuestion>
  options: Array<GradingOption>
  answers: Array<GradingAnswer>
}

export function GradingView({
  attempt,
  questions,
  options,
  answers,
}: GradingViewProps) {
  const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]))
  const maxScore = questions.reduce((sum, q) => sum + q.points, 0)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <StatusChip variant={ATTEMPT_STATUS_CHIP[attempt.status]} size="md" />
          {attempt.status === 'graded' && (
            <span className="text-sm text-[#1C1815]">
              {attempt.totalScore} / {maxScore}
            </span>
          )}
        </div>
        {attempt.status === 'submitted' && (
          <FinalizeGradingButton attemptId={attempt.id} />
        )}
      </div>
      {questions.map((question, index) => {
        const answer = answerByQuestion.get(question.id)
        return question.type === 'multiple_choice' ? (
          <GradedMcAnswerRow
            key={question.id}
            index={index}
            question={question}
            options={options.filter((o) => o.questionId === question.id)}
            answer={answer}
          />
        ) : (
          <OpenAnswerGradeRow
            key={question.id}
            index={index}
            question={question}
            answer={answer}
            readOnly={attempt.status === 'graded'}
          />
        )
      })}
    </div>
  )
}

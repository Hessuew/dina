import type {
  TakingAnswer,
  TakingAttempt,
  TakingOption,
  TakingQuestion,
} from '@/components/exam/exam-taking/ExamTakingView'
import { Button } from '@/components/ui/button'
import { submittedPanelView } from '@/components/exam/exam-taking/submitted-panel.domain'
import { StudentExamReview } from '@/components/exam/exam-taking/StudentExamReview'

type ExamSubmittedPanelProps = {
  attempt: TakingAttempt
  maxScore: number
  timedOut: boolean
  onRefresh: () => void
  questions: Array<TakingQuestion>
  options: Array<TakingOption>
  answers: Array<TakingAnswer>
}

export function ExamSubmittedPanel({
  attempt,
  maxScore,
  timedOut,
  onRefresh,
  questions,
  options,
  answers,
}: ExamSubmittedPanelProps) {
  const view = submittedPanelView(attempt, maxScore)
  return (
    <div className="space-y-4 border border-[#1A1A1A]/10 bg-white/70 p-8 text-center">
      <h2 className="font-serif text-2xl text-[#1C1815]">{view.heading}</h2>
      {view.scoreText !== null ? (
        <p className="text-lg text-[#1C1815]">
          Score: <span className="font-semibold">{view.scoreText}</span>
        </p>
      ) : (
        <p className="text-sm text-[#8E816D]">
          Your answers are safely stored. Results will be visible here once
          grading is complete.
        </p>
      )}
      {timedOut && (
        <Button variant="outline" size="sm" onClick={onRefresh}>
          Refresh
        </Button>
      )}
      {attempt.status === 'graded' && (
        <StudentExamReview
          questions={questions}
          options={options}
          answers={answers}
        />
      )}
    </div>
  )
}

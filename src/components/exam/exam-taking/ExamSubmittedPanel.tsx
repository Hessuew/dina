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

function ScoreLine({ scoreText }: { scoreText: string | null }) {
  if (scoreText === null) {
    return (
      <p className="text-sm text-[#8E816D]">
        Your answers are safely stored. Results will be visible here once
        grading is complete.
      </p>
    )
  }
  return (
    <p className="text-lg text-[#1C1815]">
      Score: <span className="font-semibold">{scoreText}</span>
    </p>
  )
}

function FeedbackCard({ feedback }: { feedback: string | null }) {
  if (feedback === null) return null
  return (
    <div className="border border-[#1A1A1A]/10 bg-[#FAF8F4] p-4 text-left">
      <p className="text-[0.68rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
        Feedback
      </p>
      <p className="mt-2 text-sm whitespace-pre-wrap text-[#1C1815]">
        {feedback}
      </p>
    </div>
  )
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
      <ScoreLine scoreText={view.scoreText} />
      <FeedbackCard feedback={view.feedback} />
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

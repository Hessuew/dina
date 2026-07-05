import type { TakingAttempt } from '@/components/exam/exam-taking/ExamTakingView'
import { Button } from '@/components/ui/button'
import { submittedPanelView } from '@/components/exam/exam-taking/submitted-panel.domain'

type ExamSubmittedPanelProps = {
  attempt: TakingAttempt
  maxScore: number
  timedOut: boolean
  onRefresh: () => void
}

export function ExamSubmittedPanel({
  attempt,
  maxScore,
  timedOut,
  onRefresh,
}: ExamSubmittedPanelProps) {
  const view = submittedPanelView(attempt, maxScore)
  return (
    <div className="space-y-4 border border-[#1A1A1A]/10 bg-white/70 p-8 text-center">
      <h2 className="font-serif text-2xl text-[#1C1815]">{view.heading}</h2>
      {timedOut && (
        <p className="text-sm text-[#8E816D]">
          Time ran out — your saved answers were submitted automatically.
        </p>
      )}
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
    </div>
  )
}

import { useState } from 'react'
import type { ExamAttemptStatus } from '@/utils/exam/domain/exam-lifecycle.domain'
import { Textarea } from '@/components/ui/textarea'
import { FinalizeGradingButton } from '@/components/exam/exam-grading/FinalizeGradingButton'

type FinalizeGradingPanelProps = {
  attemptId: string
  status: ExamAttemptStatus
  feedback: string | null
}

function GradedFeedbackCard({ feedback }: { feedback: string | null }) {
  if (!feedback) return null
  return (
    <div className="border border-[#1A1A1A]/10 bg-white/70 p-5">
      <p className="text-[0.68rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
        Feedback
      </p>
      <p className="mt-2 text-sm whitespace-pre-wrap text-[#1C1815]">
        {feedback}
      </p>
    </div>
  )
}

function FeedbackDraftForm({ attemptId }: { attemptId: string }) {
  const [draft, setDraft] = useState('')

  return (
    <div className="space-y-3 border border-[#1A1A1A]/10 bg-white/70 p-5">
      <label
        htmlFor="attempt-feedback"
        className="block text-[0.68rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase"
      >
        Overall feedback (optional)
      </label>
      <Textarea
        id="attempt-feedback"
        rows={4}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Share feedback for the student..."
        className="rounded-none border-[#1A1A1A]/10 bg-white text-[#1C1815] placeholder:text-[#8E816D]"
      />
      <div className="flex justify-end">
        <FinalizeGradingButton attemptId={attemptId} feedback={draft} />
      </div>
    </div>
  )
}

export function FinalizeGradingPanel({
  attemptId,
  status,
  feedback,
}: FinalizeGradingPanelProps) {
  if (status === 'graded') return <GradedFeedbackCard feedback={feedback} />
  if (status !== 'submitted') return null
  return <FeedbackDraftForm attemptId={attemptId} />
}

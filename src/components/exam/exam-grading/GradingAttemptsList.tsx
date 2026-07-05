import { Link } from '@tanstack/react-router'
import type { StatusChipVariant } from '@/components/ui/status-chip'
import type { ExamAttemptStatus } from '@/utils/exam/domain/exam-lifecycle.domain'
import { StatusChip } from '@/components/ui/status-chip'

export const ATTEMPT_STATUS_CHIP: Record<ExamAttemptStatus, StatusChipVariant> =
  {
    in_progress: 'not-submitted',
    submitted: 'submitted',
    graded: 'graded',
  }

export type GradingAttemptListItem = {
  id: string
  examId: string
  studentId: string
  status: ExamAttemptStatus
  submittedAt: Date | null
  totalScore: number | null
}

export function GradingAttemptsList({
  attempts,
}: {
  attempts: Array<GradingAttemptListItem>
}) {
  if (attempts.length === 0) {
    return (
      <p className="py-16 text-center font-serif text-lg text-[#AFA28F]">
        No attempts yet
      </p>
    )
  }
  return (
    <div className="space-y-3">
      {attempts.map((attempt) => (
        <Link
          key={attempt.id}
          to="/exams/$examId/grading/$attemptId"
          params={{ examId: attempt.examId, attemptId: attempt.id }}
          className="flex items-center justify-between gap-4 border border-[#1A1A1A]/10 bg-white/70 px-5 py-4 transition-colors hover:border-[#C5A059]/40"
        >
          <div>
            <p className="text-sm text-[#1C1815]">Student {attempt.studentId}</p>
            <p className="mt-1 text-xs text-[#8E816D]">
              {attempt.submittedAt
                ? `Submitted ${attempt.submittedAt.toLocaleString('en-GB')}`
                : 'In progress'}
              {attempt.totalScore !== null && ` · ${attempt.totalScore} pts`}
            </p>
          </div>
          <StatusChip variant={ATTEMPT_STATUS_CHIP[attempt.status]} />
        </Link>
      ))}
    </div>
  )
}

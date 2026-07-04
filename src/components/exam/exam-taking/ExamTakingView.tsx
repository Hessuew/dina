import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import type {
  ExamAttemptStatus,
  ExamQuestionType,
} from '@/utils/exam/domain/exam-lifecycle.domain'
import { useAnswerAutosave } from '@/hooks/useAnswerAutosave'
import { useExamCountdown } from '@/hooks/useExamCountdown'
import { ExamCountdown } from '@/components/exam/exam-taking/ExamCountdown'
import { QuestionRunner } from '@/components/exam/exam-taking/QuestionRunner'
import { SubmitExamButton } from '@/components/exam/exam-taking/SubmitExamButton'
import { ExamSubmittedPanel } from '@/components/exam/exam-taking/ExamSubmittedPanel'

export type TakingQuestion = {
  id: string
  type: ExamQuestionType
  prompt: string
  points: number
}

export type TakingOption = {
  id: string
  questionId: string
  label: string
}

export type TakingAttempt = {
  id: string
  status: ExamAttemptStatus
  deadlineAt: Date
  autoScore: number | null
  manualScore: number | null
  totalScore: number | null
}

export type TakingAnswer = {
  questionId: string
  selectedOptionId: string | null
  textAnswer: string | null
}

type ExamTakingViewProps = {
  attempt: TakingAttempt
  questions: Array<TakingQuestion>
  options: Array<TakingOption>
  answers: Array<TakingAnswer>
  serverNow: Date
}

export function ExamTakingView({
  attempt,
  questions,
  options,
  answers,
  serverNow,
}: ExamTakingViewProps) {
  const router = useRouter()
  const [expired, setExpired] = useState(false)
  const countdown = useExamCountdown(attempt.deadlineAt, serverNow)
  const autosave = useAnswerAutosave(attempt.id, () => setExpired(true))

  useEffect(() => {
    if (countdown.isExpired) setExpired(true)
  }, [countdown.isExpired])

  if (attempt.status !== 'in_progress' || expired) {
    return (
      <ExamSubmittedPanel
        attempt={attempt}
        maxScore={questions.reduce((sum, q) => sum + q.points, 0)}
        timedOut={expired}
        onRefresh={() => void router.invalidate()}
      />
    )
  }

  return (
    <div className="space-y-8">
      <ExamCountdown remainingMs={countdown.remainingMs} />
      <QuestionRunner
        questions={questions}
        options={options}
        initialAnswers={answers}
        queueSave={autosave.queueSave}
        saveStates={autosave.saveStates}
      />
      <SubmitExamButton
        attemptId={attempt.id}
        onSubmitted={() => void router.invalidate()}
      />
    </div>
  )
}

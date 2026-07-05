import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import type {
  GradingAnswer,
  GradingQuestion,
} from '@/components/exam/exam-grading/GradingView'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useMutation } from '@/hooks/useMutation'
import { gradeExamOpenAnswer } from '@/utils/exam'
import {
  gradableOpenAnswer,
  initialAwardedPoints,
  openAnswerPointsLabel,
  openAnswerText,
} from '@/components/exam/exam-grading/grading-rows.domain'

type OpenAnswerGradeRowProps = {
  index: number
  question: GradingQuestion
  answer: GradingAnswer | undefined
  readOnly: boolean
}

export function OpenAnswerGradeRow({
  index,
  question,
  answer,
  readOnly,
}: OpenAnswerGradeRowProps) {
  const text = openAnswerText(answer)
  const gradable = gradableOpenAnswer(readOnly, answer)
  return (
    <div className="space-y-3 border border-[#1A1A1A]/10 bg-white/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-serif text-lg text-[#1C1815]">
          {index + 1}. {question.prompt}
        </p>
        <span className="shrink-0 text-xs text-[#8E816D]">
          {openAnswerPointsLabel(answer, question.points)}
        </span>
      </div>
      {text !== null ? (
        <p className="border border-[#1A1A1A]/8 bg-[#FAF8F4] p-4 text-sm whitespace-pre-wrap text-[#1C1815]">
          {text}
        </p>
      ) : (
        <p className="text-xs text-[#8E816D]">Not answered</p>
      )}
      {gradable !== null && (
        <GradePointsControls
          answerId={gradable.id}
          maxPoints={question.points}
          initialPoints={initialAwardedPoints(gradable)}
        />
      )}
    </div>
  )
}

function GradePointsControls({
  answerId,
  maxPoints,
  initialPoints,
}: {
  answerId: string
  maxPoints: number
  initialPoints: number
}) {
  const router = useRouter()
  const [points, setPoints] = useState(initialPoints)
  const gradeMutation = useMutation({
    fn: gradeExamOpenAnswer,
    onSuccess: async () => {
      toast.success('Answer graded')
      await router.invalidate()
    },
  })
  return (
    <div className="flex items-center gap-3">
      <Input
        type="number"
        min={0}
        max={maxPoints}
        value={points}
        onChange={(event) => setPoints(Number(event.target.value))}
        className="w-24"
      />
      <Button
        size="sm"
        variant="outline"
        disabled={gradeMutation.isPending}
        onClick={() =>
          gradeMutation.mutate({ data: { answerId, awardedPoints: points } })
        }
      >
        {gradeMutation.isPending ? 'Saving…' : 'Save points'}
      </Button>
    </div>
  )
}

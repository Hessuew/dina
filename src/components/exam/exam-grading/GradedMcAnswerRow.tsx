import type {
  GradingAnswer,
  GradingOption,
  GradingQuestion,
} from '@/components/exam/exam-grading/GradingView'
import type { McOptionTone } from '@/components/exam/exam-grading/grading-rows.domain'
import {
  awardedPointsLabel,
  mcOptionSuffix,
  mcOptionTone,
} from '@/components/exam/exam-grading/grading-rows.domain'

const TONE_CLASSES: Record<McOptionTone, string> = {
  correct: 'bg-emerald-50 text-emerald-800',
  selected: 'bg-red-50 text-red-700',
  default: 'text-[#4E463D]',
}

type GradedMcAnswerRowProps = {
  index: number
  question: GradingQuestion
  options: Array<GradingOption>
  answer: GradingAnswer | undefined
}

export function GradedMcAnswerRow({
  index,
  question,
  options,
  answer,
}: GradedMcAnswerRowProps) {
  return (
    <div className="space-y-3 border border-[#1A1A1A]/10 bg-white/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-serif text-lg text-[#1C1815]">
          {index + 1}. {question.prompt}
        </p>
        <span className="shrink-0 text-xs text-[#8E816D]">
          {awardedPointsLabel(answer?.awardedPoints, question.points, '0')}
        </span>
      </div>
      <ul className="space-y-1">
        {options.map((option) => {
          const isSelected = answer?.selectedOptionId === option.id
          return (
            <li
              key={option.id}
              className={`px-3 py-2 text-sm ${TONE_CLASSES[mcOptionTone(option.isCorrect, isSelected)]}`}
            >
              {option.label}
              {mcOptionSuffix(option.isCorrect, isSelected)}
            </li>
          )
        })}
      </ul>
      {!answer && <p className="text-xs text-[#8E816D]">Not answered</p>}
    </div>
  )
}

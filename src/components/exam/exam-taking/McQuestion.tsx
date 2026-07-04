import type { TakingOption } from '@/components/exam/exam-taking/ExamTakingView'

type McQuestionProps = {
  questionId: string
  options: Array<TakingOption>
  selectedOptionId: string | undefined
  onSelect: (optionId: string) => void
}

export function McQuestion({
  questionId,
  options,
  selectedOptionId,
  onSelect,
}: McQuestionProps) {
  return (
    <div className="space-y-2" role="radiogroup">
      {options.map((option) => (
        <label
          key={option.id}
          className={`flex cursor-pointer items-center gap-3 border px-4 py-3 transition-colors ${
            selectedOptionId === option.id
              ? 'border-[#C5A059] bg-[#C5A059]/10'
              : 'border-[#1A1A1A]/10 hover:border-[#C5A059]/40'
          }`}
        >
          <input
            type="radio"
            name={`question-${questionId}`}
            checked={selectedOptionId === option.id}
            onChange={() => onSelect(option.id)}
          />
          <span className="text-sm text-[#1C1815]">{option.label}</span>
        </label>
      ))}
    </div>
  )
}

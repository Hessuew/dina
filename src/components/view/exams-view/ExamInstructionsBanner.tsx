import { STANDARD_EXAM_INSTRUCTIONS } from './exam-instructions.domain'

export function ExamInstructionsBanner() {
  return (
    <div className="border border-[#1A1A1A]/10 bg-white/70 p-6">
      <div className="flex items-center gap-2">
        <div className="h-px w-6 bg-[#C5A059]/60" />
        <h2 className="font-serif text-lg text-[#1C1815]">
          Exam Instructions & Guidelines
        </h2>
      </div>
      <p className="mt-2 text-xs text-[#8E816D]">
        Please review these standard academy rules before starting any timed
        exam.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STANDARD_EXAM_INSTRUCTIONS.map((instruction) => (
          <div
            key={instruction.id}
            className="border-l-2 border-[#C5A059]/40 bg-[#F8F4EC]/40 p-3"
          >
            <p className="text-xs font-semibold text-[#1C1815]">
              {instruction.title}
            </p>
            <p className="mt-1 text-[0.78rem] leading-relaxed text-[#5C5346]">
              {instruction.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

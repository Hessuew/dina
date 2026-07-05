import { formatRemaining } from '@/utils/exam/domain/exam-timing.domain'

const LOW_TIME_MS = 5 * 60_000

export function ExamCountdown({ remainingMs }: { remainingMs: number }) {
  const low = remainingMs <= LOW_TIME_MS
  return (
    <div
      className={`sticky top-0 z-10 flex items-center justify-between border px-5 py-3 ${
        low
          ? 'border-red-300 bg-red-50 text-red-700'
          : 'border-[#1A1A1A]/10 bg-white/90 text-[#1C1815]'
      }`}
    >
      <span className="text-[0.72rem] font-medium tracking-[0.22em] uppercase">
        Time remaining
      </span>
      <span className="font-mono text-xl tabular-nums" aria-live="polite">
        {formatRemaining(remainingMs)}
      </span>
    </div>
  )
}

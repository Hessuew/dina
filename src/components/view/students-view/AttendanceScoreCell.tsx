import { useState } from 'react'
import { Check, X } from 'lucide-react'
import type { CourseAttendanceScore } from '@/types/student'
import { formatAttendanceScore } from '@/utils/attendance/domain/attendance-score.domain'

export function AttendanceScoreCell({
  scores,
}: {
  scores: Array<CourseAttendanceScore>
}) {
  if (scores.length === 0) {
    return <span className="text-[#8E816D]">—</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {scores.map((score) => (
        <CourseScoreChip key={score.courseId} score={score} />
      ))}
    </div>
  )
}

function CourseScoreChip({ score }: { score: CourseAttendanceScore }) {
  const [open, setOpen] = useState(false)
  const label = formatAttendanceScore(score.present, score.totalLessons)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="border border-[#C5A059]/35 bg-[#1C1A17] px-2 py-1 text-left text-[0.72rem] text-[#E9D9B4] hover:border-[#C5A059]/70"
      >
        <span className="font-medium text-[#F8F4EC]">{score.courseTitle}</span>{' '}
        <span className="text-[#C5A059]">{label}</span>
      </button>
      {open && <LessonPopover score={score} onClose={() => setOpen(false)} />}
    </div>
  )
}

function LessonPopover({
  score,
  onClose,
}: {
  score: CourseAttendanceScore
  onClose: () => void
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Close attendance detail"
        className="fixed inset-0 z-40 cursor-default bg-transparent"
        onClick={onClose}
      />
      <div className="absolute top-full left-0 z-50 mt-1 min-w-[220px] border border-[#C5A059]/40 bg-[#1A1716] p-3 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
        <p className="mb-2 text-[0.62rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
          {score.courseTitle}
        </p>
        {score.lessons.length === 0 ? (
          <p className="text-sm text-[#8E816D]">No lessons</p>
        ) : (
          <ul className="space-y-1.5">
            {score.lessons.map((lesson) => (
              <li
                key={lesson.lessonId}
                className="flex items-center gap-2 text-sm text-[#CFC6B7]"
              >
                {lesson.present ? (
                  <Check
                    className="size-3.5 shrink-0 text-[#C5A059]"
                    aria-label="Present"
                  />
                ) : (
                  <X
                    className="size-3.5 shrink-0 text-[#8E816D]"
                    aria-label="Absent"
                  />
                )}
                <span className="truncate">{lesson.lessonTitle}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

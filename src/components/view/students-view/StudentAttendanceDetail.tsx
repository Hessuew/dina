import { useCallback, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'
import type { CourseAttendanceScore } from '@/types/student'
import {
  formatAttendanceScore,
  setLessonPresentOnScores,
} from '@/utils/attendance/domain/attendance-score.domain'
import { setStudentPresent } from '@/utils/attendance'
import { cn } from '@/lib/utils'

export function StudentAttendanceDetail({
  studentId,
  initialScores,
}: {
  studentId: string
  initialScores: Array<CourseAttendanceScore>
}) {
  const [scores, setScores] = useState(initialScores)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const busyRef = useRef<string | null>(null)
  const scoresRef = useRef(scores)
  scoresRef.current = scores

  const onToggle = useCallback(
    async (courseId: string, lessonId: string, nextPresent: boolean) => {
      const key = `${courseId}:${lessonId}`
      if (busyRef.current === key) return
      const previous = scoresRef.current
      busyRef.current = key
      setBusyKey(key)
      setScores(
        setLessonPresentOnScores(previous, courseId, lessonId, nextPresent),
      )
      try {
        await setStudentPresent({
          data: { studentId, courseId, lessonId, present: nextPresent },
        })
      } catch (error) {
        setScores(previous)
        toast.error(
          error instanceof Error
            ? error.message
            : 'Could not update attendance',
        )
      } finally {
        busyRef.current = null
        setBusyKey(null)
      }
    },
    [studentId],
  )

  if (scores.length === 0) return null

  return (
    <div className="mb-8 space-y-4">
      <div className="h-px w-8 bg-[#C5A059]/40" />
      <h3 className="text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
        Attendance
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        {scores.map((score) => (
          <CourseAttendanceCard
            key={score.courseId}
            score={score}
            busyKey={busyKey}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  )
}

function CourseAttendanceCard({
  score,
  busyKey,
  onToggle,
}: {
  score: CourseAttendanceScore
  busyKey: string | null
  onToggle: (
    courseId: string,
    lessonId: string,
    nextPresent: boolean,
  ) => Promise<void>
}) {
  return (
    <div className="border border-white/10 bg-[#151515]/88 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-serif text-lg text-[#F8F4EC]">{score.courseTitle}</p>
        <span className="border border-[#C5A059]/35 px-2 py-0.5 text-[0.72rem] text-[#D4B373]">
          {formatAttendanceScore(score.present, score.totalLessons)}
        </span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {score.lessons.map((lesson) => (
          <LessonAttendanceRow
            key={lesson.lessonId}
            courseId={score.courseId}
            lessonId={lesson.lessonId}
            lessonTitle={lesson.lessonTitle}
            present={lesson.present}
            canManage={score.canManageAttendance === true}
            busy={busyKey === `${score.courseId}:${lesson.lessonId}`}
            onToggle={onToggle}
          />
        ))}
      </ul>
    </div>
  )
}

type LessonAttendanceRowProps = {
  courseId: string
  lessonId: string
  lessonTitle: string
  present: boolean
  canManage: boolean
  busy: boolean
  onToggle: (
    courseId: string,
    lessonId: string,
    nextPresent: boolean,
  ) => Promise<void>
}

function LessonAttendanceRow({
  courseId,
  lessonId,
  lessonTitle,
  present,
  canManage,
  busy,
  onToggle,
}: LessonAttendanceRowProps) {
  const icon = present ? (
    <Check className="size-3.5 text-[#C5A059]" aria-hidden />
  ) : (
    <X className="size-3.5 text-[#8E816D]" aria-hidden />
  )

  if (!canManage) {
    return (
      <li className="flex items-center gap-2 text-sm text-[#CFC6B7]">
        {icon}
        <span>{lessonTitle}</span>
      </li>
    )
  }

  const label = present ? 'Mark not present' : 'Mark present'
  return (
    <li>
      <button
        type="button"
        disabled={busy}
        aria-label={`${label}: ${lessonTitle}`}
        aria-pressed={present}
        onClick={() => void onToggle(courseId, lessonId, !present)}
        className={cn(
          'flex w-full items-center gap-2 border border-transparent px-1 py-1 text-left text-sm text-[#CFC6B7]',
          'hover:-translate-y-0.5 hover:border-[#C5A059]/50 hover:bg-[#1C1A17]',
          'disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-transparent',
        )}
      >
        {icon}
        <span>{lessonTitle}</span>
      </button>
    </li>
  )
}

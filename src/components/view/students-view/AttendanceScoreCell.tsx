import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'
import type { RefObject } from 'react'
import type { CourseAttendanceScore } from '@/types/student'
import { formatAttendanceScore } from '@/utils/attendance/domain/attendance-score.domain'

const POPOVER_MIN_WIDTH = 220
const POPOVER_MAX_HEIGHT = 280
const GAP = 4

type PopoverCoords = {
  top: number
  left: number
  maxHeight: number
  openUp: boolean
}

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
  const triggerRef = useRef<HTMLButtonElement>(null)
  const label = formatAttendanceScore(score.present, score.totalLessons)

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="border border-[#C5A059]/35 bg-[#1C1A17] px-2 py-1 text-left text-[0.72rem] text-[#E9D9B4] hover:border-[#C5A059]/70"
      >
        <span className="font-medium text-[#F8F4EC]">{score.courseTitle}</span>{' '}
        <span className="text-[#C5A059]">{label}</span>
      </button>
      {open && (
        <LessonPopover
          score={score}
          triggerRef={triggerRef}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

function placePopover(trigger: HTMLElement): PopoverCoords {
  const rect = trigger.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom - GAP
  const spaceAbove = rect.top - GAP
  const openUp =
    spaceBelow < Math.min(POPOVER_MAX_HEIGHT, 160) && spaceAbove > spaceBelow
  const maxHeight = Math.max(
    120,
    Math.min(POPOVER_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow),
  )
  const left = Math.min(
    Math.max(GAP, rect.left),
    window.innerWidth - POPOVER_MIN_WIDTH - GAP,
  )
  return {
    top: openUp ? rect.top - GAP : rect.bottom + GAP,
    left,
    maxHeight,
    openUp,
  }
}

function LessonAttendanceList({
  lessons,
}: {
  lessons: CourseAttendanceScore['lessons']
}) {
  if (lessons.length === 0) {
    return <p className="text-sm text-[#8E816D]">No lessons</p>
  }

  return (
    <ul className="space-y-1.5">
      {lessons.map((lesson) => (
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
  )
}

function LessonPopover({
  score,
  triggerRef,
  onClose,
}: {
  score: CourseAttendanceScore
  triggerRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
}) {
  const [coords, setCoords] = useState<PopoverCoords | null>(null)

  useLayoutEffect(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    setCoords(placePopover(trigger))
  }, [triggerRef])

  useEffect(() => {
    const reposition = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      setCoords(placePopover(trigger))
    }
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [triggerRef])

  if (!coords || typeof document === 'undefined') return null

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close attendance detail"
        className="fixed inset-0 z-40 cursor-default bg-transparent"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label={`${score.courseTitle} attendance`}
        className="fixed z-50 min-w-55 overflow-y-auto border border-[#C5A059]/40 bg-[#1A1716] p-3 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]"
        style={{
          top: coords.openUp ? undefined : coords.top,
          bottom: coords.openUp ? window.innerHeight - coords.top : undefined,
          left: coords.left,
          maxHeight: coords.maxHeight,
        }}
      >
        <p className="mb-2 text-[0.62rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
          {score.courseTitle}
        </p>
        <LessonAttendanceList lessons={score.lessons} />
      </div>
    </>,
    document.body,
  )
}

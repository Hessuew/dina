import { useCourseAttendance } from './useCourseAttendance'
import type {
  AttendancePanelSlots,
  LessonOption,
  OpenSessionView,
} from '@/utils/attendance/domain/course-attendance-ui.domain'
import {
  buildAttendancePanelSlots,
  startButtonLabel,
} from '@/utils/attendance/domain/course-attendance-ui.domain'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Props = {
  courseId: string
  canManage: boolean
  role: 'student' | 'teacher' | 'admin'
}

type AttendanceControls = ReturnType<typeof useCourseAttendance>

export function CourseAttendancePanel({ courseId, canManage, role }: Props) {
  const ctl = useCourseAttendance(courseId)
  const slots = buildAttendancePanelSlots({
    state: ctl.state,
    canManage,
    role,
  })
  if (!slots) return null
  return <AttendanceSlotsView slots={slots} ctl={ctl} />
}

function AttendanceSlotsView({
  slots,
  ctl,
}: {
  slots: AttendancePanelSlots
  ctl: AttendanceControls
}) {
  return (
    <div className="space-y-4">
      <TeacherSlot slots={slots} ctl={ctl} />
      <StudentSlot slots={slots} ctl={ctl} />
    </div>
  )
}

function TeacherSlot({
  slots,
  ctl,
}: {
  slots: AttendancePanelSlots
  ctl: AttendanceControls
}) {
  if (slots.openTeacherSession) {
    return (
      <OpenTeacherBody
        openSession={slots.openTeacherSession}
        busy={ctl.busy}
        onClose={ctl.close}
      />
    )
  }
  if (!slots.showIdleTeacher) return null
  return (
    <IdleTeacherBody
      lessons={slots.lessons}
      selectedLessonId={ctl.selectedLessonId}
      onSelectLesson={ctl.setSelectedLessonId}
      busy={ctl.busy}
      onStart={ctl.start}
    />
  )
}

function StudentSlot({
  slots,
  ctl,
}: {
  slots: AttendancePanelSlots
  ctl: AttendanceControls
}) {
  if (!slots.studentSlot) return null
  return (
    <StudentAttendanceCard
      mode={slots.studentSlot.mode}
      openSession={slots.studentSlot.session}
      busy={ctl.busy}
      onPresent={ctl.present}
    />
  )
}

function IdleTeacherBody({
  lessons,
  selectedLessonId,
  onSelectLesson,
  busy,
  onStart,
}: {
  lessons: Array<LessonOption>
  selectedLessonId: string
  onSelectLesson: (id: string) => void
  busy: boolean
  onStart: () => void
}) {
  const selected = lessons.find((l) => l.lessonId === selectedLessonId)

  return (
    <div className="border border-[#C5A059]/40 bg-[#1C1A17] p-5 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.8)]">
      <p className="text-[0.65rem] font-medium tracking-[0.22em] text-[#C5A059] uppercase">
        Attendance
      </p>
      <div className="mt-3 space-y-3">
        <p className="text-sm text-[#CFC6B7]">
          Choose a lesson and open a 10-minute check-in window for students.
        </p>
        <Select
          value={selectedLessonId}
          onValueChange={(v) => onSelectLesson(v ?? '')}
        >
          <SelectTrigger className="w-full rounded-none border-[#C5A059]/35 bg-[#141210] text-[#F8F4EC]">
            <SelectValue placeholder="Select lesson" />
          </SelectTrigger>
          <SelectContent>
            {lessons.map((lesson) => (
              <SelectItem key={lesson.lessonId} value={lesson.lessonId}>
                {lesson.lessonTitle}
                {lesson.hasSession ? ' · has session' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          disabled={busy || !selectedLessonId || lessons.length === 0}
          onClick={onStart}
          className="w-full rounded-none bg-[#C5A059] text-[#141210] hover:bg-[#D4B373]"
        >
          {startButtonLabel(selected?.hasSession)}
        </Button>
      </div>
    </div>
  )
}

function OpenTeacherBody({
  openSession,
  busy,
  onClose,
}: {
  openSession: OpenSessionView
  busy: boolean
  onClose: () => void
}) {
  return (
    <div className="border border-[#C5A059]/40 bg-[#1C1A17] p-5 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.8)]">
      <p className="text-[0.65rem] font-medium tracking-[0.22em] text-[#C5A059] uppercase">
        Attendance
      </p>
      <div className="mt-3 space-y-3">
        <p className="font-serif text-2xl tracking-tight text-[#F8F4EC]">
          {openSession.remainingLabel ?? '—'}
        </p>
        <p className="text-sm text-[#CFC6B7]">
          Open for{' '}
          <span className="text-[#E9D9B4]">
            {openSession.lessonTitle ?? 'lesson'}
          </span>
          . Students can mark present until the timer ends.
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onClose}
          className="w-full rounded-none border-[#C5A059]/50 text-[#E9D9B4]"
        >
          End attendance
        </Button>
      </div>
    </div>
  )
}

function StudentAttendanceCard({
  mode,
  openSession,
  busy,
  onPresent,
}: {
  mode: 'open' | 'done'
  openSession: OpenSessionView
  busy: boolean
  onPresent: () => void
}) {
  if (mode === 'done') {
    return (
      <div className="border border-[#C5A059]/50 bg-[#1A1716] p-6 sm:p-8">
        <p className="text-[0.7rem] font-medium tracking-[0.22em] text-[#C5A059] uppercase">
          Attendance
        </p>
        <p className="mt-2 font-serif text-2xl text-[#F8F4EC] sm:text-3xl">
          You're marked present
        </p>
        <p className="mt-2 text-sm text-[#CFC6B7]">
          {openSession.lessonTitle ?? 'This lesson'} ·{' '}
          {openSession.remainingLabel} left
        </p>
      </div>
    )
  }

  return (
    <div className="border-2 border-[#C5A059] bg-[#2A2118] p-6 shadow-[0_30px_80px_-40px_rgba(197,160,89,0.55)] sm:p-8">
      <p className="text-[0.7rem] font-medium tracking-[0.22em] text-[#C5A059] uppercase">
        Live attendance
      </p>
      <p className="mt-2 font-serif text-3xl tracking-tight text-[#F8F4EC] sm:text-4xl">
        Mark yourself present
      </p>
      <p className="mt-2 text-sm text-[#E9D9B4]">
        {openSession.lessonTitle ?? 'Lesson'} · {openSession.remainingLabel}{' '}
        remaining
      </p>
      <Button
        type="button"
        disabled={busy}
        onClick={onPresent}
        className="mt-5 h-14 w-full rounded-none bg-[#C5A059] text-base font-semibold tracking-wide text-[#141210] hover:bg-[#D4B373] sm:h-16 sm:text-lg"
      >
        I'm here
      </Button>
    </div>
  )
}

import { useCourseAttendance } from './useCourseAttendance'
import type {
  AttendancePanelSlots,
  LessonOption,
  OpenSessionView,
} from '@/utils/attendance/domain/course-attendance-ui.domain'
import {
  buildAttendancePanelSlots,
  lessonPickerLabel,
  startButtonLabel,
} from '@/utils/attendance/domain/course-attendance-ui.domain'
import { formatRemaining } from '@/utils/attendance/domain/attendance-window.domain'
import { useServerCountdown } from '@/hooks/useServerCountdown'
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
  return (
    <AttendanceSlotsView
      slots={slots}
      ctl={ctl}
      serverNow={ctl.state?.serverNow ?? new Date()}
    />
  )
}

function AttendanceSlotsView({
  slots,
  ctl,
  serverNow,
}: {
  slots: AttendancePanelSlots
  ctl: AttendanceControls
  serverNow: Date | string
}) {
  return (
    <div className="space-y-4">
      <TeacherSlot slots={slots} ctl={ctl} serverNow={serverNow} />
      <StudentSlot slots={slots} ctl={ctl} serverNow={serverNow} />
    </div>
  )
}

function useLiveRemaining(
  closesAt: Date | string | null | undefined,
  serverNow: Date | string,
  fallbackLabel: string | null,
) {
  const deadline = closesAt ?? new Date(0)
  const countdown = useServerCountdown(deadline, serverNow)
  const label =
    closesAt && !countdown.isExpired
      ? formatRemaining(countdown.remainingMs)
      : (fallbackLabel ?? '0:00')
  return { label, isExpired: !closesAt || countdown.isExpired }
}

function TeacherSlot({
  slots,
  ctl,
  serverNow,
}: {
  slots: AttendancePanelSlots
  ctl: AttendanceControls
  serverNow: Date | string
}) {
  const open = slots.openTeacherSession
  const live = useLiveRemaining(
    open?.closesAt,
    serverNow,
    open?.remainingLabel ?? null,
  )
  const locallyExpired = open !== null && live.isExpired

  if (open && !live.isExpired) {
    return (
      <OpenTeacherBody
        label={live.label}
        lessonTitle={open.lessonTitle}
        busy={ctl.busy}
        onClose={ctl.close}
      />
    )
  }
  // Local expiry still has open in poll payload — show idle until poll clears.
  if (!slots.showIdleTeacher && !locallyExpired) return null
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
  serverNow,
}: {
  slots: AttendancePanelSlots
  ctl: AttendanceControls
  serverNow: Date | string
}) {
  if (!slots.studentSlot) return null
  return (
    <StudentAttendanceCard
      mode={slots.studentSlot.mode}
      openSession={slots.studentSlot.session}
      serverNow={serverNow}
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
            <SelectValue placeholder="Select lesson">
              {lessonPickerLabel(lessons, selectedLessonId)}
            </SelectValue>
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
          theme="dark"
          disabled={busy || !selectedLessonId || lessons.length === 0}
          onClick={onStart}
          className="w-full"
        >
          {startButtonLabel(selected?.hasSession)}
        </Button>
      </div>
    </div>
  )
}

function OpenTeacherBody({
  label,
  lessonTitle,
  busy,
  onClose,
}: {
  label: string
  lessonTitle: string | null
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
          {label}
        </p>
        <p className="text-sm text-[#CFC6B7]">
          Open for{' '}
          <span className="text-[#E9D9B4]">{lessonTitle ?? 'lesson'}</span>.
          Students can mark present until the timer ends.
        </p>
        <Button
          type="button"
          theme="dark"
          disabled={busy}
          onClick={onClose}
          className="w-full"
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
  serverNow,
  busy,
  onPresent,
}: {
  mode: 'open' | 'done'
  openSession: OpenSessionView
  serverNow: Date | string
  busy: boolean
  onPresent: () => void
}) {
  const { label, isExpired } = useLiveRemaining(
    openSession.closesAt,
    serverNow,
    openSession.remainingLabel,
  )
  if (isExpired) return null

  if (mode === 'done') {
    return (
      <div className="border border-[#C5A059]/50 bg-[#1A1716] p-5">
        <p className="text-[0.65rem] font-medium tracking-[0.22em] text-[#C5A059] uppercase">
          Attendance
        </p>
        <p className="mt-2 font-serif text-xl text-[#F8F4EC]">
          You're marked present
        </p>
        <p className="mt-1 text-sm text-[#CFC6B7]">
          {openSession.lessonTitle ?? 'This lesson'} · {label} left
        </p>
      </div>
    )
  }

  return (
    <div className="border-2 border-[#C5A059] bg-[#2A2118] p-5 shadow-[0_30px_80px_-40px_rgba(197,160,89,0.55)]">
      <p className="text-[0.65rem] font-medium tracking-[0.22em] text-[#C5A059] uppercase">
        Live attendance
      </p>
      <p className="mt-2 font-serif text-xl tracking-tight text-[#F8F4EC]">
        Mark yourself present
      </p>
      <p className="mt-1 text-sm text-[#E9D9B4]">
        {openSession.lessonTitle ?? 'Lesson'} · {label} remaining
      </p>
      <Button
        type="button"
        theme="dark"
        disabled={busy}
        onClick={onPresent}
        className="mt-4 w-full"
      >
        Mark present
      </Button>
    </div>
  )
}

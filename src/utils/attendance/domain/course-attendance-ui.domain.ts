export type OpenSessionView = {
  id: string
  lessonId: string
  lessonTitle: string | null
  isOpen: boolean
  /** Absolute window end; client countdown anchors here. */
  closesAt: Date | string | null
  remainingLabel: string | null
  remainingMs: number
  alreadyPresent: boolean
}

export type LessonOption = {
  lessonId: string
  lessonTitle: string
  orderIndex: number
  hasSession: boolean
  isOpen: boolean
}

export function lessonPickerLabel(
  lessons: Array<LessonOption>,
  selectedLessonId: string,
): string | undefined {
  const lesson = lessons.find((item) => item.lessonId === selectedLessonId)
  if (!lesson) return undefined
  return `${lesson.lessonTitle}${lesson.hasSession ? ' · has session' : ''}`
}

export function pickDefaultLessonId(
  lessons: Array<LessonOption>,
  openLessonId: string | null,
): string {
  if (openLessonId) return openLessonId
  if (lessons.length === 0) return ''
  return lessons[0].lessonId
}

export function teacherPanelMode(args: {
  canManage: boolean
  openSession: OpenSessionView | null
}): 'hidden' | 'idle' | 'open' {
  if (!args.canManage) return 'hidden'
  if (args.openSession?.isOpen) return 'open'
  return 'idle'
}

export function studentPanelMode(args: {
  role: string
  openSession: OpenSessionView | null
}): 'hidden' | 'open' | 'done' {
  if (args.role !== 'student') return 'hidden'
  if (!args.openSession?.isOpen) return 'hidden'
  if (args.openSession.alreadyPresent) return 'done'
  return 'open'
}

export function startButtonLabel(hasSession: boolean | undefined): string {
  return hasSession ? 'Re-open (10 min)' : 'Open (10 min)'
}

export function shouldRenderAttendancePanels(
  tMode: 'hidden' | 'idle' | 'open',
  sMode: 'hidden' | 'open' | 'done',
): boolean {
  return tMode !== 'hidden' || sMode !== 'hidden'
}

export type AttendancePanelSlots = {
  showIdleTeacher: boolean
  openTeacherSession: OpenSessionView | null
  studentSlot: {
    mode: 'open' | 'done'
    session: OpenSessionView
  } | null
  lessons: Array<LessonOption>
}

/** Pure shell config for CourseAttendancePanel. Null = render nothing. */
export function buildAttendancePanelSlots(args: {
  state: {
    openSession: OpenSessionView | null
    lessons: Array<LessonOption>
  } | null
  canManage: boolean
  role: string
}): AttendancePanelSlots | null {
  if (!args.state) return null
  const openSession = args.state.openSession
  const teacherMode = teacherPanelMode({
    canManage: args.canManage,
    openSession,
  })
  const studentMode = studentPanelMode({
    role: args.role,
    openSession,
  })
  if (!shouldRenderAttendancePanels(teacherMode, studentMode)) return null

  const openTeacherSession =
    teacherMode === 'open' && openSession ? openSession : null
  const studentSlot =
    studentMode !== 'hidden' && openSession
      ? { mode: studentMode, session: openSession }
      : null

  return {
    showIdleTeacher: args.canManage && openTeacherSession === null,
    openTeacherSession,
    studentSlot,
    lessons: args.state.lessons,
  }
}

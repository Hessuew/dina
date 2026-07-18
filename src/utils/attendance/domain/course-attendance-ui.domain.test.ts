import { describe, expect, it } from 'vitest'
import {
  buildAttendancePanelSlots,
  lessonPickerLabel,
  pickDefaultLessonId,
  shouldRenderAttendancePanels,
  startButtonLabel,
  studentPanelMode,
  teacherPanelMode,
} from './course-attendance-ui.domain'

const lessons = [
  {
    lessonId: 'l1',
    lessonTitle: 'One',
    orderIndex: 0,
    hasSession: false,
    isOpen: false,
  },
  {
    lessonId: 'l2',
    lessonTitle: 'Two',
    orderIndex: 1,
    hasSession: true,
    isOpen: false,
  },
]

describe('lessonPickerLabel', () => {
  it('returns the selected lesson title instead of its id', () => {
    expect(lessonPickerLabel(lessons, 'l2')).toBe('Two · has session')
  })

  it('returns undefined without a matching lesson', () => {
    expect(lessonPickerLabel(lessons, 'missing')).toBeUndefined()
  })
})

describe('pickDefaultLessonId', () => {
  it('prefers open lesson id', () => {
    expect(pickDefaultLessonId(lessons, 'l2')).toBe('l2')
  })

  it('falls back to first lesson', () => {
    expect(pickDefaultLessonId(lessons, null)).toBe('l1')
  })

  it('returns empty string when no lessons', () => {
    expect(pickDefaultLessonId([], null)).toBe('')
  })
})

describe('teacherPanelMode', () => {
  it('hides when cannot manage', () => {
    expect(
      teacherPanelMode({
        canManage: false,
        openSession: {
          id: 's',
          lessonId: 'l1',
          lessonTitle: null,
          isOpen: true,
          closesAt: new Date('2026-01-01T00:10:00.000Z'),
          remainingLabel: '9:00',
          remainingMs: 1,
          alreadyPresent: false,
        },
      }),
    ).toBe('hidden')
  })

  it('shows open when session open', () => {
    expect(
      teacherPanelMode({
        canManage: true,
        openSession: {
          id: 's',
          lessonId: 'l1',
          lessonTitle: 'L',
          isOpen: true,
          closesAt: new Date('2026-01-01T00:10:00.000Z'),
          remainingLabel: '9:00',
          remainingMs: 1,
          alreadyPresent: false,
        },
      }),
    ).toBe('open')
  })

  it('shows idle when closed', () => {
    expect(teacherPanelMode({ canManage: true, openSession: null })).toBe(
      'idle',
    )
  })
})

describe('studentPanelMode', () => {
  const open = {
    id: 's',
    lessonId: 'l1',
    lessonTitle: 'L',
    isOpen: true,
    closesAt: new Date('2026-01-01T00:10:00.000Z'),
    remainingLabel: '9:00',
    remainingMs: 1,
    alreadyPresent: false,
  }

  it('hides for non-students', () => {
    expect(studentPanelMode({ role: 'teacher', openSession: open })).toBe(
      'hidden',
    )
  })

  it('shows open for student when window open', () => {
    expect(studentPanelMode({ role: 'student', openSession: open })).toBe(
      'open',
    )
  })

  it('shows done when already present', () => {
    expect(
      studentPanelMode({
        role: 'student',
        openSession: { ...open, alreadyPresent: true },
      }),
    ).toBe('done')
  })
})

describe('startButtonLabel', () => {
  it('uses re-open when session exists', () => {
    expect(startButtonLabel(true)).toBe('Re-open (10 min)')
  })

  it('uses open for first session', () => {
    expect(startButtonLabel(false)).toBe('Open (10 min)')
    expect(startButtonLabel(undefined)).toBe('Open (10 min)')
  })
})

describe('shouldRenderAttendancePanels', () => {
  it('hides when both modes hidden', () => {
    expect(shouldRenderAttendancePanels('hidden', 'hidden')).toBe(false)
  })

  it('shows when either mode visible', () => {
    expect(shouldRenderAttendancePanels('idle', 'hidden')).toBe(true)
    expect(shouldRenderAttendancePanels('hidden', 'open')).toBe(true)
  })
})

describe('buildAttendancePanelSlots', () => {
  const open = {
    id: 's',
    lessonId: 'l1',
    lessonTitle: 'L',
    isOpen: true,
    closesAt: new Date('2026-01-01T00:10:00.000Z'),
    remainingLabel: '9:00',
    remainingMs: 1,
    alreadyPresent: false,
  }

  it('returns null without state', () => {
    expect(
      buildAttendancePanelSlots({
        state: null,
        canManage: true,
        role: 'teacher',
      }),
    ).toBeNull()
  })

  it('shows open teacher session for course teacher', () => {
    const slots = buildAttendancePanelSlots({
      state: { openSession: open, lessons },
      canManage: true,
      role: 'teacher',
    })
    expect(slots?.openTeacherSession).toEqual(open)
    expect(slots?.showIdleTeacher).toBe(false)
    expect(slots?.studentSlot).toBeNull()
  })

  it('shows student slot', () => {
    const slots = buildAttendancePanelSlots({
      state: { openSession: open, lessons },
      canManage: false,
      role: 'student',
    })
    expect(slots?.studentSlot?.mode).toBe('open')
    expect(slots?.showIdleTeacher).toBe(false)
  })

  it('returns null when nothing to show', () => {
    expect(
      buildAttendancePanelSlots({
        state: { openSession: null, lessons },
        canManage: false,
        role: 'student',
      }),
    ).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import {
  buildLessonBackNavigation,
  buildLessonDialogInitialData,
  formatLessonSchedule,
  getLessonStatus,
  handleDialogDismiss,
  resolveDeleteErrorMessage,
  resolveLessonPublished,
  shouldShowLessonContent,
} from './lesson-detail.domain'

describe('resolveLessonPublished', () => {
  it('returns the boolean when set', () => {
    expect(resolveLessonPublished(true)).toBe(true)
    expect(resolveLessonPublished(false)).toBe(false)
  })

  it('falls back to false when null', () => {
    expect(resolveLessonPublished(null)).toBe(false)
  })
})

describe('shouldShowLessonContent', () => {
  it('is true when published, regardless of edit rights', () => {
    expect(shouldShowLessonContent(true, false)).toBe(true)
  })

  it('is true when the viewer can edit an unpublished lesson', () => {
    expect(shouldShowLessonContent(false, true)).toBe(true)
  })

  it('is false when unpublished and the viewer cannot edit', () => {
    expect(shouldShowLessonContent(false, false)).toBe(false)
  })
})

describe('getLessonStatus', () => {
  it('is "published" when published', () => {
    expect(getLessonStatus(true)).toBe('published')
  })

  it('is "draft" when not published', () => {
    expect(getLessonStatus(false)).toBe('draft')
  })
})

describe('handleDialogDismiss', () => {
  it('invokes the dismiss callback when the dialog reports closed', () => {
    let dismissed = 0
    handleDialogDismiss(false, () => {
      dismissed += 1
    })
    expect(dismissed).toBe(1)
  })

  it('does nothing while the dialog stays open', () => {
    let dismissed = 0
    handleDialogDismiss(true, () => {
      dismissed += 1
    })
    expect(dismissed).toBe(0)
  })
})

describe('resolveDeleteErrorMessage', () => {
  it('uses the error message when present', () => {
    expect(resolveDeleteErrorMessage(new Error('boom'))).toBe('boom')
    expect(resolveDeleteErrorMessage({ message: 'nope' })).toBe('nope')
  })

  it('falls back when no usable message exists', () => {
    expect(resolveDeleteErrorMessage({ message: '' })).toBe(
      'Failed to check submissions',
    )
    expect(resolveDeleteErrorMessage({ message: 42 })).toBe(
      'Failed to check submissions',
    )
    expect(resolveDeleteErrorMessage(null)).toBe('Failed to check submissions')
    expect(resolveDeleteErrorMessage('string error')).toBe(
      'Failed to check submissions',
    )
  })
})

describe('buildLessonBackNavigation', () => {
  it('navigates to the calendar month when arriving from the calendar', () => {
    expect(
      buildLessonBackNavigation(
        { fromCalendar: true, calendarMonth: '2026-06' },
        'course-1',
      ),
    ).toEqual({ kind: 'calendar', month: '2026-06' })
  })

  it('navigates to the course when not from the calendar', () => {
    expect(
      buildLessonBackNavigation({ fromCalendar: false }, 'course-1'),
    ).toEqual({ kind: 'course', courseId: 'course-1' })
  })

  it('navigates to the course when the calendar month is missing', () => {
    expect(
      buildLessonBackNavigation({ fromCalendar: true }, 'course-2'),
    ).toEqual({ kind: 'course', courseId: 'course-2' })
  })
})

describe('formatLessonSchedule', () => {
  it('returns null when there is no scheduled time', () => {
    expect(formatLessonSchedule(null)).toBeNull()
    expect(formatLessonSchedule(undefined)).toBeNull()
  })

  it('formats the date and time in en-US long form', () => {
    // Local-time components keep the output timezone-independent.
    const scheduled = new Date(2026, 0, 5, 14, 30)
    expect(formatLessonSchedule(scheduled)).toBe('January 5, 2026 at 2:30 PM')
  })
})

describe('buildLessonDialogInitialData', () => {
  const lesson = {
    id: 'lesson-1',
    title: 'Lesson one',
    content: 'body',
    scheduledTime: new Date(2026, 0, 5, 14, 30),
    duration: 45,
    isPublished: true,
    orderIndex: 2,
  }

  it('maps a fully-populated lesson', () => {
    expect(buildLessonDialogInitialData(lesson)).toEqual({
      lessonId: 'lesson-1',
      title: 'Lesson one',
      content: 'body',
      scheduledTime: new Date(2026, 0, 5, 14, 30),
      duration: 45,
      isPublished: true,
      orderIndex: 2,
    })
  })

  it('passes through a null schedule and coerces null published to false', () => {
    const result = buildLessonDialogInitialData({
      ...lesson,
      scheduledTime: null,
      isPublished: null,
    })
    expect(result.scheduledTime).toBeNull()
    expect(result.isPublished).toBe(false)
  })
})

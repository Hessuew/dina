import { describe, expect, it } from 'vitest'
import {
  buildEventDetailsViewModel,
  buildEventNavigation,
  canNavigateToEvent,
  getEventChip,
  isEventOverdue,
} from './event-preview-modal.domain'
import type { CalendarEvent } from '@/utils/calendar/calendar'

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'e1',
    title: 'Title',
    date: new Date('2026-06-19T10:00:00Z'),
    type: 'lesson',
    courseId: 'c1',
    courseName: 'Course',
    ...overrides,
  }
}

describe('getEventChip', () => {
  it('returns the chip for a non-special event by its type', () => {
    expect(getEventChip(makeEvent({ type: 'lesson' })).label).toBe('Lesson')
    expect(getEventChip(makeEvent({ type: 'assignment' })).label).toBe(
      'Assignment',
    )
  })

  it('returns the chip for the special category when present', () => {
    expect(
      getEventChip(makeEvent({ type: 'special', specialCategory: 'chapel' }))
        .label,
    ).toBe('Chapel')
    expect(
      getEventChip(makeEvent({ type: 'special', specialCategory: 'exam' }))
        .label,
    ).toBe('Exam')
  })

  it('falls back to the "other" chip for a special event without a category', () => {
    expect(getEventChip(makeEvent({ type: 'special' })).label).toBe('Other')
  })

  it('falls back to the "other" chip for unknown event types', () => {
    const unknownEvent = makeEvent({
      type: 'special' as any,
      specialCategory: 'unknown' as any,
    })
    expect(getEventChip(unknownEvent).label).toBe('Other')
  })
})

describe('isEventOverdue', () => {
  it('is true for an assignment whose date is before now', () => {
    expect(
      isEventOverdue(
        makeEvent({ type: 'assignment', date: new Date('2026-06-01') }),
        new Date('2026-06-19'),
      ),
    ).toBe(true)
  })

  it('is false for an assignment whose date is after now', () => {
    expect(
      isEventOverdue(
        makeEvent({ type: 'assignment', date: new Date('2026-06-30') }),
        new Date('2026-06-19'),
      ),
    ).toBe(false)
  })

  it('is false for non-assignment events even when in the past', () => {
    expect(
      isEventOverdue(
        makeEvent({ type: 'lesson', date: new Date('2026-06-01') }),
        new Date('2026-06-19'),
      ),
    ).toBe(false)
  })

  it('defaults now to the current time', () => {
    expect(
      isEventOverdue(
        makeEvent({ type: 'assignment', date: new Date('2000-01-01') }),
      ),
    ).toBe(true)
  })
})

describe('canNavigateToEvent', () => {
  it('is true for lesson and assignment events', () => {
    expect(canNavigateToEvent(makeEvent({ type: 'lesson' }))).toBe(true)
    expect(canNavigateToEvent(makeEvent({ type: 'assignment' }))).toBe(true)
  })

  it('is false for special events and null', () => {
    expect(canNavigateToEvent(makeEvent({ type: 'special' }))).toBe(false)
    expect(canNavigateToEvent(null)).toBe(false)
  })
})

describe('buildEventNavigation', () => {
  it('returns null for a null event', () => {
    expect(buildEventNavigation(null, undefined)).toBeNull()
  })

  it('returns null for a special event', () => {
    expect(
      buildEventNavigation(makeEvent({ type: 'special' }), undefined),
    ).toBeNull()
  })

  it('builds lesson navigation with the lesson route and params', () => {
    const month = new Date('2026-06-01T00:00:00Z')
    expect(
      buildEventNavigation(makeEvent({ type: 'lesson', id: 'l9' }), month),
    ).toEqual({
      to: '/lessons/$lessonId',
      params: { lessonId: 'l9' },
      search: { fromCalendar: true, calendarMonth: month.toISOString() },
    })
  })

  it('builds assignment navigation with the assignment route and params', () => {
    expect(
      buildEventNavigation(
        makeEvent({ type: 'assignment', id: 'a3' }),
        undefined,
      ),
    ).toEqual({
      to: '/assignments/$assignmentId',
      params: { assignmentId: 'a3' },
      search: { fromCalendar: true, calendarMonth: undefined },
    })
  })
})

describe('buildEventDetailsViewModel', () => {
  it('always includes a formatted date label and the overdue flag', () => {
    const vm = buildEventDetailsViewModel(
      makeEvent({ type: 'special', description: null }),
      true,
    )
    expect(vm.dateLabel).toContain('2026')
    expect(vm.isOverdue).toBe(true)
    expect(vm.rows).toEqual([])
    expect(vm.description).toBeNull()
  })

  it('includes a duration row for a lesson with a duration', () => {
    const vm = buildEventDetailsViewModel(
      makeEvent({ type: 'lesson', duration: 45 }),
      false,
    )
    const duration = vm.rows.find((r) => r.iconKey === 'clock')
    expect(duration?.text).toContain('45 min')
    expect(vm.rows.some((r) => r.iconKey === 'book')).toBe(true)
  })

  it('omits the duration row for a lesson without a duration', () => {
    const vm = buildEventDetailsViewModel(
      makeEvent({ type: 'lesson', duration: null }),
      false,
    )
    expect(vm.rows.some((r) => r.iconKey === 'clock')).toBe(false)
    expect(vm.rows.some((r) => r.iconKey === 'book')).toBe(true)
  })

  it('includes a max-grade row for an assignment with a maxGrade', () => {
    const vm = buildEventDetailsViewModel(
      makeEvent({ type: 'assignment', maxGrade: 20 }),
      false,
    )
    expect(vm.rows).toEqual([
      { iconKey: 'graduation', text: 'Max grade: 20 pts' },
    ])
  })

  it('omits the max-grade row when maxGrade is null', () => {
    const vm = buildEventDetailsViewModel(
      makeEvent({ type: 'assignment', maxGrade: null }),
      false,
    )
    expect(vm.rows).toEqual([])
  })

  it('passes through a present description', () => {
    const vm = buildEventDetailsViewModel(
      makeEvent({ type: 'special', description: 'Notes' }),
      false,
    )
    expect(vm.description).toBe('Notes')
  })
})

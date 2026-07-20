import { describe, expect, it } from 'vitest'
import {
  assertCanMarkPresent,
  assertCanOpenSession,
  buildClosedOverrideSession,
  buildManualClose,
  buildOpenWindow,
} from './attendance-session.domain'
import { ConflictError, ValidationError } from '@/utils/errors'

const T0 = new Date('2026-07-15T10:00:00.000Z')
const later = new Date(T0.getTime() + 5 * 60_000)

describe('assertCanOpenSession', () => {
  it('allows open when nothing is open on the course', () => {
    expect(() =>
      assertCanOpenSession({
        now: T0,
        courseId: 'c1',
        lessonId: 'l1',
        openOnCourse: null,
      }),
    ).not.toThrow()
  })

  it('blocks a different lesson while another session is open', () => {
    expect(() =>
      assertCanOpenSession({
        now: T0,
        courseId: 'c1',
        lessonId: 'l2',
        openOnCourse: {
          id: 's1',
          courseId: 'c1',
          lessonId: 'l1',
          closesAt: later,
        },
      }),
    ).toThrow(ConflictError)
  })

  it('blocks re-open of the already-open same lesson', () => {
    expect(() =>
      assertCanOpenSession({
        now: T0,
        courseId: 'c1',
        lessonId: 'l1',
        openOnCourse: {
          id: 's1',
          courseId: 'c1',
          lessonId: 'l1',
          closesAt: later,
        },
      }),
    ).toThrow(ConflictError)
  })

  it('allows open when prior session is already closed', () => {
    expect(() =>
      assertCanOpenSession({
        now: later,
        courseId: 'c1',
        lessonId: 'l2',
        openOnCourse: {
          id: 's1',
          courseId: 'c1',
          lessonId: 'l1',
          closesAt: T0,
        },
      }),
    ).not.toThrow()
  })
})

describe('assertCanMarkPresent', () => {
  it('allows mark while open', () => {
    expect(() =>
      assertCanMarkPresent({ now: T0, closesAt: later }),
    ).not.toThrow()
  })

  it('rejects when closed', () => {
    expect(() => assertCanMarkPresent({ now: later, closesAt: T0 })).toThrow(
      ValidationError,
    )
  })
})

describe('buildOpenWindow / buildManualClose', () => {
  it('builds a 10-minute window', () => {
    const { openedAt, closesAt } = buildOpenWindow(T0)
    expect(openedAt).toEqual(T0)
    expect(closesAt.getTime() - openedAt.getTime()).toBe(10 * 60_000)
  })

  it('manual close sets closesAt to now', () => {
    expect(buildManualClose(T0)).toEqual({ closesAt: T0 })
  })
})

describe('buildClosedOverrideSession', () => {
  it('stamps openedAt and closesAt to now (closed, no live window)', () => {
    expect(buildClosedOverrideSession(T0)).toEqual({
      openedAt: T0,
      closesAt: T0,
    })
  })
})

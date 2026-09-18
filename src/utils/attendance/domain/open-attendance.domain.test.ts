import { describe, expect, it } from 'vitest'
import { buildOpenAttendanceRows } from './open-attendance.domain'

describe('buildOpenAttendanceRows', () => {
  it('composes published table rows and student presence', () => {
    const rows = buildOpenAttendanceRows(
      [
        {
          id: 'session-1',
          courseId: 'course-1',
          lessonId: 'lesson-1',
          openedAt: new Date('2026-09-18T10:00:00Z'),
          closesAt: new Date('2026-09-18T10:10:00Z'),
        },
      ],
      [{ id: 'course-1', title: 'Romans' }],
      [{ id: 'lesson-1', title: 'Introduction' }],
      [{ id: 'present-1', sessionId: 'session-1' }],
    )

    expect(rows).toEqual([
      expect.objectContaining({
        id: 'session-1',
        courseTitle: 'Romans',
        lessonTitle: 'Introduction',
        presentId: 'present-1',
      }),
    ])
  })

  it('omits sessions without published course or lesson rows', () => {
    expect(
      buildOpenAttendanceRows(
        [
          {
            id: 'session-1',
            courseId: 'course-1',
            lessonId: 'lesson-1',
            openedAt: null,
            closesAt: null,
          },
        ],
        [],
        [{ id: 'lesson-1', title: 'Introduction' }],
        [],
      ),
    ).toEqual([])
  })
})

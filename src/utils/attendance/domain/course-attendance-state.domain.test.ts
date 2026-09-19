import { describe, expect, it } from 'vitest'
import { mergeCourseLessonsWithSessions } from './course-attendance-state.domain'

const lessons = [
  {
    id: 'lesson-1',
    title: 'Introduction',
    orderIndex: 0,
    courseId: 'course-1',
    isPublished: true,
  },
  {
    id: 'lesson-2',
    title: 'Follow-up',
    orderIndex: 1,
    courseId: 'course-1',
    isPublished: false,
  },
]

describe('mergeCourseLessonsWithSessions', () => {
  it('attaches session state to matching lessons', () => {
    const closesAt = new Date('2026-09-18T10:10:00Z')

    expect(
      mergeCourseLessonsWithSessions(lessons, [
        { id: 'session-1', lessonId: 'lesson-1', closesAt },
      ]),
    ).toEqual([
      { ...lessons[0], sessionId: 'session-1', closesAt },
      { ...lessons[1], sessionId: null, closesAt: null },
    ])
  })

  it('returns an empty list when no lessons exist', () => {
    expect(mergeCourseLessonsWithSessions([], [])).toEqual([])
  })
})

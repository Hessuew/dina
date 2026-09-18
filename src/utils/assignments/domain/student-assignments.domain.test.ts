import { describe, expect, it } from 'vitest'
import { buildStudentAssignments } from './student-assignments.domain'

describe('buildStudentAssignments', () => {
  it('composes assignments with their lesson, course, and submissions', () => {
    const result = buildStudentAssignments(
      [{ id: 'a-1', lessonId: 'l-1', title: 'Essay' }],
      [
        {
          id: 'l-1',
          title: 'Lesson 1',
          courseId: 'c-1',
          scheduledTime: new Date('2026-09-18'),
        },
      ],
      [{ id: 'c-1', title: 'Course 1', isPublished: true }],
      [{ id: 's-1', assignmentId: 'a-1' }],
    )

    expect(result).toEqual([
      {
        id: 'a-1',
        lessonId: 'l-1',
        title: 'Essay',
        lesson: {
          id: 'l-1',
          title: 'Lesson 1',
          scheduledTime: new Date('2026-09-18'),
          course: { id: 'c-1', title: 'Course 1', isPublished: true },
        },
        submissions: [{ id: 's-1', assignmentId: 'a-1' }],
      },
    ])
  })

  it('omits assignments whose course is unpublished or whose relation is missing', () => {
    const result = buildStudentAssignments(
      [
        { id: 'a-1', lessonId: 'l-1' },
        { id: 'a-2', lessonId: 'missing-lesson' },
        { id: 'a-3', lessonId: 'l-2' },
      ],
      [
        { id: 'l-1', title: 'Lesson 1', courseId: 'c-1', scheduledTime: null },
        { id: 'l-2', title: 'Lesson 2', courseId: 'c-2', scheduledTime: null },
      ],
      [{ id: 'c-1', title: 'Course 1', isPublished: false }],
      [],
    )

    expect(result).toEqual([])
  })
})

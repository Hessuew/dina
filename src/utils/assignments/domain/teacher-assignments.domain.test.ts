import { describe, expect, it } from 'vitest'
import {
  buildTeacherAssignmentRows,
  mergeTeacherCatalogAssignments,
} from './teacher-assignments.domain'

const lesson = {
  id: 'lesson-1',
  title: 'Lesson 1',
  courseId: 'course-1',
  scheduledTime: new Date('2026-09-18'),
}

const course = { id: 'course-1', title: 'Course 1', isPublished: true }

describe('buildTeacherAssignmentRows', () => {
  it('composes sorted assignment rows with teachers and submissions', () => {
    const result = buildTeacherAssignmentRows(
      [
        {
          id: 'assignment-2',
          lessonId: 'lesson-1',
          dueDate: new Date('2026-09-20'),
        },
        {
          id: 'assignment-1',
          lessonId: 'lesson-1',
          dueDate: new Date('2026-09-19'),
        },
      ],
      [lesson],
      [course],
      [{ courseId: 'course-1', teacherId: 'teacher-1' }],
      [{ id: 'submission-1', assignmentId: 'assignment-1' }],
    )

    expect(result).toEqual([
      {
        id: 'assignment-1',
        lessonId: 'lesson-1',
        dueDate: new Date('2026-09-19'),
        lesson: {
          ...lesson,
          course: {
            ...course,
            courseTeachers: [{ teacherId: 'teacher-1' }],
          },
        },
        submissions: [{ id: 'submission-1', assignmentId: 'assignment-1' }],
      },
      {
        id: 'assignment-2',
        lessonId: 'lesson-1',
        dueDate: new Date('2026-09-20'),
        lesson: {
          ...lesson,
          course: {
            ...course,
            courseTeachers: [{ teacherId: 'teacher-1' }],
          },
        },
        submissions: [],
      },
    ])
  })

  it('omits rows with missing relations and can omit submissions', () => {
    const result = buildTeacherAssignmentRows(
      [{ id: 'assignment-1', lessonId: 'missing', dueDate: new Date() }],
      [],
      [],
      [],
    )

    expect(result).toEqual([])
  })
})

describe('mergeTeacherCatalogAssignments', () => {
  it('deduplicates published rows and sorts the combined catalog', () => {
    const published = [
      {
        id: 'assignment-2',
        lessonId: 'lesson-2',
        dueDate: new Date('2026-09-20'),
      },
      {
        id: 'assignment-1',
        lessonId: 'lesson-1',
        dueDate: new Date('2026-09-19'),
      },
    ]
    const managed = [
      {
        id: 'assignment-1',
        lessonId: 'lesson-1',
        dueDate: new Date('2026-09-19'),
      },
      {
        id: 'assignment-3',
        lessonId: 'lesson-3',
        dueDate: new Date('2026-09-18'),
      },
    ]

    expect(mergeTeacherCatalogAssignments(published, managed)).toEqual([
      managed[1],
      published[1],
      published[0],
    ])
  })
})

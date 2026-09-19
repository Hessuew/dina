import { describe, expect, it } from 'vitest'
import {
  buildAssignmentStats,
  buildCourseCalendarEvents,
  buildCoursesWithProgress,
  buildUpcomingLessons,
  extractTeacherIds,
} from './course.domain'

describe('buildAssignmentStats', () => {
  it('returns zero counts for empty arrays', () => {
    expect(buildAssignmentStats([], [])).toEqual({
      totalAssignments: 0,
      submittedCount: 0,
      gradedCount: 0,
    })
  })

  it('counts total assignments from assignments array length', () => {
    const assignments = [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }]
    expect(buildAssignmentStats(assignments, [])).toEqual({
      totalAssignments: 3,
      submittedCount: 0,
      gradedCount: 0,
    })
  })

  it('counts submitted submissions', () => {
    const assignments = [{ id: 'a1' }, { id: 'a2' }]
    const submissions = [{ status: 'submitted' }, { status: 'submitted' }]
    expect(buildAssignmentStats(assignments, submissions)).toEqual({
      totalAssignments: 2,
      submittedCount: 2,
      gradedCount: 0,
    })
  })

  it('counts graded submissions', () => {
    const assignments = [{ id: 'a1' }]
    const submissions = [{ status: 'graded' }, { status: 'graded' }]
    expect(buildAssignmentStats(assignments, submissions)).toEqual({
      totalAssignments: 1,
      submittedCount: 0,
      gradedCount: 2,
    })
  })

  it('ignores submissions with other statuses', () => {
    const assignments = [{ id: 'a1' }]
    const submissions = [{ status: 'draft' }, { status: 'pending' }]
    expect(buildAssignmentStats(assignments, submissions)).toEqual({
      totalAssignments: 1,
      submittedCount: 0,
      gradedCount: 0,
    })
  })

  it('counts submitted and graded independently', () => {
    const assignments = [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }]
    const submissions = [
      { status: 'submitted' },
      { status: 'graded' },
      { status: 'draft' },
    ]
    expect(buildAssignmentStats(assignments, submissions)).toEqual({
      totalAssignments: 3,
      submittedCount: 1,
      gradedCount: 1,
    })
  })
})

describe('extractTeacherIds', () => {
  it('returns null for both when array is empty', () => {
    expect(extractTeacherIds([])).toEqual({
      teacher1Id: null,
      teacher2Id: null,
    })
  })

  it('returns teacher1Id and null teacher2Id when only one teacher', () => {
    expect(extractTeacherIds([{ teacherId: 't-1' }])).toEqual({
      teacher1Id: 't-1',
      teacher2Id: null,
    })
  })

  it('returns both teacher IDs when two teachers are present', () => {
    expect(
      extractTeacherIds([{ teacherId: 't-1' }, { teacherId: 't-2' }]),
    ).toEqual({ teacher1Id: 't-1', teacher2Id: 't-2' })
  })
})

describe('buildCoursesWithProgress', () => {
  const makeCourse = (id: string, lessonIds: Array<string>) => ({
    id,
    lessons: lessonIds.map((lid) => ({ id: lid })),
  })

  it('returns empty array for empty courses', () => {
    expect(buildCoursesWithProgress([], [], [])).toEqual([])
  })

  it('returns zero stats when there are no assignments', () => {
    const courses = [makeCourse('c1', ['l1', 'l2'])]
    const result = buildCoursesWithProgress(courses, [], [])
    expect(result[0]).toMatchObject({
      totalAssignments: 0,
      submittedAssignments: 0,
      gradedAssignments: 0,
    })
  })

  it('counts assignments for the correct course via lesson mapping', () => {
    const courses = [makeCourse('c1', ['l1']), makeCourse('c2', ['l2'])]
    const assignments = [
      { id: 'a1', lessonId: 'l1' },
      { id: 'a2', lessonId: 'l2' },
      { id: 'a3', lessonId: 'l2' },
    ]
    const result = buildCoursesWithProgress(courses, assignments, [])
    expect(result[0]).toMatchObject({ totalAssignments: 1 })
    expect(result[1]).toMatchObject({ totalAssignments: 2 })
  })

  it('counts submissions for the correct course via assignment mapping', () => {
    const courses = [makeCourse('c1', ['l1']), makeCourse('c2', ['l2'])]
    const assignments = [
      { id: 'a1', lessonId: 'l1' },
      { id: 'a2', lessonId: 'l2' },
    ]
    const submissions = [
      { assignmentId: 'a1', status: 'submitted' },
      { assignmentId: 'a2', status: 'graded' },
    ]
    const result = buildCoursesWithProgress(courses, assignments, submissions)
    expect(result[0]).toMatchObject({
      submittedAssignments: 1,
      gradedAssignments: 0,
    })
    expect(result[1]).toMatchObject({
      submittedAssignments: 0,
      gradedAssignments: 1,
    })
  })

  it('submissions from one course do not bleed into another', () => {
    const courses = [makeCourse('c1', ['l1']), makeCourse('c2', ['l2'])]
    const assignments = [{ id: 'a1', lessonId: 'l1' }]
    const submissions = [{ assignmentId: 'a1', status: 'submitted' }]
    const result = buildCoursesWithProgress(courses, assignments, submissions)
    expect(result[1]).toMatchObject({
      totalAssignments: 0,
      submittedAssignments: 0,
      gradedAssignments: 0,
    })
  })

  it('accumulates multiple submissions for the same assignment', () => {
    const courses = [makeCourse('c1', ['l1'])]
    const assignments = [{ id: 'a1', lessonId: 'l1' }]
    const submissions = [
      { assignmentId: 'a1', status: 'submitted' },
      { assignmentId: 'a1', status: 'graded' },
    ]
    const result = buildCoursesWithProgress(courses, assignments, submissions)
    expect(result[0]).toMatchObject({
      submittedAssignments: 1,
      gradedAssignments: 1,
    })
  })

  it('preserves all original course fields', () => {
    const courses = [{ id: 'c1', title: 'Math', lessons: [{ id: 'l1' }] }]
    const result = buildCoursesWithProgress(courses, [], [])
    expect(result[0]).toMatchObject({ id: 'c1', title: 'Math' })
  })
})

describe('buildCourseCalendarEvents', () => {
  const makeLesson = (
    id: string,
    scheduledTime: Date | null,
    courseId = 'c1',
  ) => ({
    id,
    title: `Lesson ${id}`,
    scheduledTime,
    courseId,
  })
  const makeAssignment = (id: string, dueDate: Date, lessonId = 'l1') => ({
    id,
    title: `Assignment ${id}`,
    dueDate,
    lessonId,
  })
  const courses = [{ id: 'c1', title: 'Course' }]

  it('returns empty array for empty inputs', () => {
    expect(buildCourseCalendarEvents([], [], [])).toEqual([])
  })

  it('filters out lessons with null scheduledTime', () => {
    const lessons = [
      makeLesson('l1', null),
      makeLesson('l2', new Date('2099-01-02')),
    ]
    const result = buildCourseCalendarEvents(lessons, [], courses)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('l2')
  })

  it('maps lessons to type lesson events', () => {
    const date = new Date('2099-01-01')
    const result = buildCourseCalendarEvents(
      [makeLesson('l1', date)],
      [],
      courses,
    )
    expect(result[0]).toEqual({
      id: 'l1',
      title: 'Lesson l1',
      date,
      type: 'lesson',
      courseId: 'c1',
      courseName: 'Course',
    })
  })

  it('maps assignments to type assignment events', () => {
    const date = new Date('2099-01-01')
    const result = buildCourseCalendarEvents(
      [makeLesson('l1', null)],
      [makeAssignment('a1', date)],
      courses,
    )
    expect(result[0]).toEqual({
      id: 'a1',
      title: 'Assignment a1',
      date,
      type: 'assignment',
      courseId: 'c1',
      courseName: 'Course',
    })
  })

  it('sorts events by date ascending', () => {
    const d1 = new Date('2099-01-01')
    const d2 = new Date('2099-01-02')
    const d3 = new Date('2099-01-03')
    const result = buildCourseCalendarEvents(
      [makeLesson('l2', d2), makeLesson('l1', d1)],
      [makeAssignment('a3', d3)],
      courses,
    )
    expect(result.map((e) => e.id)).toEqual(['l1', 'l2', 'a3'])
  })

  it('interleaves lessons and assignments in date order', () => {
    const d1 = new Date('2099-01-01')
    const d2 = new Date('2099-01-02')
    const result = buildCourseCalendarEvents(
      [makeLesson('l1', d2)],
      [makeAssignment('a1', d1)],
      courses,
    )
    expect(result[0].type).toBe('assignment')
    expect(result[1].type).toBe('lesson')
  })

  it('drops rows whose lesson or course is absent from the loaded tables', () => {
    const result = buildCourseCalendarEvents(
      [makeLesson('l1', new Date('2099-01-01')), makeLesson('l2', null, 'c2')],
      [
        makeAssignment('a1', new Date('2099-01-02'), 'l1'),
        makeAssignment('a2', new Date('2099-01-03'), 'missing'),
        makeAssignment('a3', new Date('2099-01-04'), 'l2'),
      ],
      courses,
    )

    expect(result.map((event) => event.id)).toEqual(['l1', 'a1'])
  })
})

describe('buildUpcomingLessons', () => {
  const scheduledTime = new Date('2099-01-01')
  const lessons = [
    {
      id: 'l1',
      title: 'Lesson 1',
      scheduledTime,
      thumbnailUrl: null,
      courseId: 'c1',
    },
  ]

  it('enriches lessons from published courses', () => {
    expect(
      buildUpcomingLessons(lessons, [
        { id: 'c1', title: 'Course 1', isPublished: true },
      ]),
    ).toEqual([
      {
        ...lessons[0],
        courseName: 'Course 1',
      },
    ])
  })

  it('drops lessons from unpublished or missing courses', () => {
    expect(
      buildUpcomingLessons(lessons, [
        { id: 'c1', title: 'Draft course', isPublished: false },
      ]),
    ).toEqual([])
    expect(buildUpcomingLessons(lessons, [])).toEqual([])
  })

  it('preserves published courses with an empty title', () => {
    expect(
      buildUpcomingLessons(lessons, [
        { id: 'c1', title: '', isPublished: true },
      ]),
    ).toEqual([{ ...lessons[0], courseName: '' }])
  })

  it('limits the result after course filtering', () => {
    const manyLessons = Array.from({ length: 6 }, (_, index) => ({
      ...lessons[0],
      id: `l${index}`,
    }))
    expect(
      buildUpcomingLessons(manyLessons, [
        { id: 'c1', title: 'Course 1', isPublished: true },
      ]),
    ).toHaveLength(5)
  })
})

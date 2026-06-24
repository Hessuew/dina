import { describe, expect, it } from 'vitest'
import { buildCourseCardViewModel } from './course-card.domain'

type CourseArg = Parameters<typeof buildCourseCardViewModel>[0]['course']

function makeCourse(overrides: Partial<CourseArg> = {}): CourseArg {
  return {
    description: null,
    lessons: [],
    ...overrides,
  }
}

describe('buildCourseCardViewModel', () => {
  it('marks teacher and admin roles as teacher view', () => {
    expect(
      buildCourseCardViewModel({ course: makeCourse(), role: 'teacher' })
        .isTeacher,
    ).toBe(true)
    expect(
      buildCourseCardViewModel({ course: makeCourse(), role: 'admin' })
        .isTeacher,
    ).toBe(true)
    expect(
      buildCourseCardViewModel({ course: makeCourse(), role: 'student' })
        .isTeacher,
    ).toBe(false)
  })

  it('counts lessons', () => {
    const course = makeCourse({ lessons: [{ id: 'a' }, { id: 'b' }] })
    expect(
      buildCourseCardViewModel({ course, role: 'student' }).lessonCount,
    ).toBe(2)
  })

  it('defaults missing assignment counts to zero', () => {
    const vm = buildCourseCardViewModel({
      course: makeCourse(),
      role: 'student',
    })
    expect(vm.submittedCount).toBe(0)
    expect(vm.gradedCount).toBe(0)
    expect(vm.totalAssignments).toBe(0)
  })

  it('passes through provided assignment counts', () => {
    const course = makeCourse({
      submittedAssignments: 3,
      gradedAssignments: 2,
      totalAssignments: 5,
    })
    const vm = buildCourseCardViewModel({ course, role: 'student' })
    expect(vm.submittedCount).toBe(3)
    expect(vm.gradedCount).toBe(2)
    expect(vm.totalAssignments).toBe(5)
  })

  it('defaults variant to dark when omitted', () => {
    expect(
      buildCourseCardViewModel({ course: makeCourse(), role: 'student' })
        .isDark,
    ).toBe(true)
  })

  it('respects an explicit light variant', () => {
    expect(
      buildCourseCardViewModel({
        course: makeCourse(),
        role: 'student',
        variant: 'light',
      }).isDark,
    ).toBe(false)
  })

  it('reports whether a description is present', () => {
    expect(
      buildCourseCardViewModel({ course: makeCourse(), role: 'student' })
        .hasDescription,
    ).toBe(false)
    expect(
      buildCourseCardViewModel({
        course: makeCourse({ description: 'Hello' }),
        role: 'student',
      }).hasDescription,
    ).toBe(true)
  })

  it('shows progress only for non-teachers when totalAssignments is defined', () => {
    expect(
      buildCourseCardViewModel({
        course: makeCourse({ totalAssignments: 4 }),
        role: 'student',
      }).showProgress,
    ).toBe(true)
    expect(
      buildCourseCardViewModel({
        course: makeCourse({ totalAssignments: 4 }),
        role: 'teacher',
      }).showProgress,
    ).toBe(false)
    expect(
      buildCourseCardViewModel({ course: makeCourse(), role: 'student' })
        .showProgress,
    ).toBe(false)
  })
})

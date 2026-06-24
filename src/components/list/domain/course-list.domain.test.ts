import { describe, expect, it } from 'vitest'
import { buildCourseListViewModel } from './course-list.domain'

describe('buildCourseListViewModel', () => {
  it('marks admin as both admin and teacher', () => {
    const vm = buildCourseListViewModel('admin')
    expect(vm.isAdmin).toBe(true)
    expect(vm.isTeacher).toBe(true)
  })

  it('marks teacher as teacher but not admin', () => {
    const vm = buildCourseListViewModel('teacher')
    expect(vm.isAdmin).toBe(false)
    expect(vm.isTeacher).toBe(true)
  })

  it('marks student as neither admin nor teacher', () => {
    const vm = buildCourseListViewModel('student')
    expect(vm.isAdmin).toBe(false)
    expect(vm.isTeacher).toBe(false)
  })

  it('uses teacher-facing empty-state copy for teachers', () => {
    const vm = buildCourseListViewModel('teacher')
    expect(vm.emptyHeading).toBe('No courses yet')
    expect(vm.emptyDescription).toBe('Create your first course to get started')
  })

  it('uses student-facing empty-state copy for students', () => {
    const vm = buildCourseListViewModel('student')
    expect(vm.emptyHeading).toBe('No enrolled courses')
    expect(vm.emptyDescription).toBe('You are not enrolled in any courses yet')
  })
})

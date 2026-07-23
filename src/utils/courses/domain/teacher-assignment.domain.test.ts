import { describe, expect, it } from 'vitest'
import {
  isTeacherAssignmentConflict,
  resolveOptionalTeacherPair,
  validateSameTeacher,
  validateTeacherRoles,
} from './teacher-assignment.domain'

const makeTeacher = (id: string, role = 'teacher', fullName?: string) => ({
  id,
  role,
  fullName: fullName ?? null,
})

describe('resolveOptionalTeacherPair', () => {
  it('returns a complete pair', () => {
    expect(resolveOptionalTeacherPair('t-1', 't-2')).toEqual(['t-1', 't-2'])
  })

  it('returns undefined when neither teacher is supplied', () => {
    expect(resolveOptionalTeacherPair(undefined, undefined)).toBeUndefined()
  })

  it('rejects either incomplete pair', () => {
    expect(() => resolveOptionalTeacherPair('t-1', undefined)).toThrow(
      'Please assign either both teachers or neither',
    )
    expect(() => resolveOptionalTeacherPair(undefined, 't-2')).toThrow(
      'Please assign either both teachers or neither',
    )
  })
})

describe('isTeacherAssignmentConflict', () => {
  const conflict = { constraint: 'course_teachers_teacher_id_unique' }

  it('recognizes direct and wrapped constraint errors', () => {
    expect(isTeacherAssignmentConflict(conflict)).toBe(true)
    expect(isTeacherAssignmentConflict({ cause: conflict })).toBe(true)
  })

  it('rejects unrelated and malformed errors', () => {
    expect(isTeacherAssignmentConflict({ constraint: 'other' })).toBe(false)
    expect(isTeacherAssignmentConflict({ cause: 'other' })).toBe(false)
    expect(isTeacherAssignmentConflict(null)).toBe(false)
  })
})

describe('validateSameTeacher', () => {
  it('does not throw when IDs are different', () => {
    expect(() => validateSameTeacher('t-1', 't-2')).not.toThrow()
  })

  it('throws ValidationError when IDs are the same', () => {
    expect(() => validateSameTeacher('t-1', 't-1')).toThrow(
      'Must assign 2 different teachers to a course',
    )
  })
})

describe('validateTeacherRoles', () => {
  it('does not throw for two valid teachers', () => {
    const teachers = [makeTeacher('t-1'), makeTeacher('t-2')]
    expect(() => validateTeacherRoles(teachers, 't-1', 't-2')).not.toThrow()
  })

  it('throws NotFoundError when teachers array has fewer than 2 entries', () => {
    expect(() =>
      validateTeacherRoles([makeTeacher('t-1')], 't-1', 't-2'),
    ).toThrow('One or both teachers not found')
  })

  it('throws when teacher1 has student role', () => {
    const teachers = [
      makeTeacher('t-1', 'student', 'Alice'),
      makeTeacher('t-2'),
    ]
    expect(() => validateTeacherRoles(teachers, 't-1', 't-2')).toThrow(
      'Alice is not a teacher',
    )
  })

  it('throws when teacher2 has student role', () => {
    const teachers = [makeTeacher('t-1'), makeTeacher('t-2', 'student', 'Bob')]
    expect(() => validateTeacherRoles(teachers, 't-1', 't-2')).toThrow(
      'Bob is not a teacher',
    )
  })

  it('allows admin role when allowAdmin is true', () => {
    const teachers = [makeTeacher('t-1', 'admin'), makeTeacher('t-2', 'admin')]
    expect(() =>
      validateTeacherRoles(teachers, 't-1', 't-2', true),
    ).not.toThrow()
  })

  it('throws for admin role when allowAdmin is false', () => {
    const teachers = [makeTeacher('t-1', 'admin', 'Carol'), makeTeacher('t-2')]
    expect(() => validateTeacherRoles(teachers, 't-1', 't-2', false)).toThrow(
      'Carol is not a teacher',
    )
  })

  it('uses fullName in error message when available', () => {
    const teachers = [makeTeacher('t-1', 'student', 'Dave'), makeTeacher('t-2')]
    expect(() => validateTeacherRoles(teachers, 't-1', 't-2')).toThrow(
      'Dave is not a teacher',
    )
  })

  it('falls back to "Teacher 1" when teacher1 fullName is null', () => {
    const teachers = [makeTeacher('t-1', 'student'), makeTeacher('t-2')]
    expect(() => validateTeacherRoles(teachers, 't-1', 't-2')).toThrow(
      'Teacher 1 is not a teacher',
    )
  })

  it('falls back to "Teacher 2" when teacher2 fullName is null', () => {
    const teachers = [makeTeacher('t-1'), makeTeacher('t-2', 'student')]
    expect(() => validateTeacherRoles(teachers, 't-1', 't-2')).toThrow(
      'Teacher 2 is not a teacher',
    )
  })
})

import { describe, expect, it } from 'vitest'
import { sortTeachers } from './teachers.domain'

const makeTeacher = (overrides: {
  id?: string
  createdAt?: Date
  orderIndex?: number | null
  hasCourse?: boolean
}) => ({
  id: overrides.id ?? 't-1',
  fullName: 'Teacher Name',
  email: 'teacher@test.com',
  bio: null,
  avatarUrl: null,
  createdAt: overrides.createdAt ?? new Date('2024-01-01'),
  course:
    overrides.hasCourse || (overrides.orderIndex !== undefined && overrides.orderIndex !== null)
      ? {
          id: 'c-1',
          title: 'Course',
          description: null,
          isPublished: true,
          createdAt: new Date('2024-01-01'),
          orderIndex: overrides.orderIndex ?? null,
        }
      : null,
})

describe('sortTeachers', () => {
  it('returns empty array unchanged', () => {
    expect(sortTeachers([])).toEqual([])
  })

  it('sorts both-have-course teachers by course orderIndex ascending', () => {
    const teachers = [
      makeTeacher({ id: 't-2', orderIndex: 2 }),
      makeTeacher({ id: 't-1', orderIndex: 1 }),
      makeTeacher({ id: 't-0', orderIndex: 0 }),
    ]
    const result = sortTeachers(teachers)
    expect(result.map((t) => t.id)).toEqual(['t-0', 't-1', 't-2'])
  })

  it('places teacher with course before teacher without course (no-course first in input)', () => {
    const withCourse = makeTeacher({ id: 'with', orderIndex: 5 })
    const withoutCourse = makeTeacher({ id: 'without', orderIndex: null })
    const result = sortTeachers([withoutCourse, withCourse])
    expect(result[0].id).toBe('with')
    expect(result[1].id).toBe('without')
  })

  it('places teacher with course before teacher without course (has-course first in input)', () => {
    const withCourse = makeTeacher({ id: 'with', orderIndex: 5 })
    const withoutCourse = makeTeacher({ id: 'without', orderIndex: null })
    const result = sortTeachers([withCourse, withoutCourse])
    expect(result[0].id).toBe('with')
    expect(result[1].id).toBe('without')
  })

  it('sorts teachers without course by createdAt ascending', () => {
    const older = makeTeacher({ id: 'older', orderIndex: null, createdAt: new Date('2023-01-01') })
    const newer = makeTeacher({ id: 'newer', orderIndex: null, createdAt: new Date('2024-01-01') })
    const result = sortTeachers([newer, older])
    expect(result[0].id).toBe('older')
    expect(result[1].id).toBe('newer')
  })

  it('handles orderIndex 0 correctly — does not fall through to createdAt sort', () => {
    const atZero = makeTeacher({ id: 'zero', orderIndex: 0 })
    const atOne = makeTeacher({ id: 'one', orderIndex: 1 })
    const result = sortTeachers([atOne, atZero])
    expect(result[0].id).toBe('zero')
  })

  it('treats a course with null orderIndex the same as no course', () => {
    const withNullIdx = makeTeacher({ id: 'null-idx', hasCourse: true, orderIndex: null })
    const withIdx = makeTeacher({ id: 'with-idx', orderIndex: 1 })
    const result = sortTeachers([withNullIdx, withIdx])
    expect(result[0].id).toBe('with-idx')
    expect(result[1].id).toBe('null-idx')
  })

  it('does not mutate the original array', () => {
    const teachers = [
      makeTeacher({ id: 't-2', orderIndex: 2 }),
      makeTeacher({ id: 't-1', orderIndex: 1 }),
    ]
    const original = [...teachers]
    sortTeachers(teachers)
    expect(teachers[0].id).toBe(original[0].id)
  })
})

import { describe, expect, it } from 'vitest'
import {
  buildAssignmentsWithSubmissions,
  buildAverageGradeByCourse,
  buildStudentWithStats,
} from './student.domain'

const makeSub = (overrides: {
  courseId?: string
  grade?: number | null
  status?: string
  maxGrade?: number | null
} = {}) => ({
  status: overrides.status ?? 'submitted',
  grade: overrides.grade ?? null,
  assignment: {
    maxGrade: 'maxGrade' in overrides ? overrides.maxGrade : 100,
    lesson: { course: { id: overrides.courseId ?? 'c-1' } },
  },
})

const makeStudent = (overrides: Partial<{
  id: string
  fullName: string
  email: string
  avatarUrl: string | null
  createdAt: Date
}> = {}) => ({
  id: 's-1',
  fullName: 'Jane Doe',
  email: 'jane@test.com',
  avatarUrl: null,
  createdAt: new Date('2024-01-01'),
  ...overrides,
})

const makeAssignmentRow = (overrides: Partial<{
  assignmentId: string
  assignmentTitle: string
  assignmentDueDate: Date
  assignmentMaxGrade: number | null
  courseId: string
  courseTitle: string
  lessonId: string
  lessonTitle: string
}> = {}) => ({
  assignmentId: 'a-1',
  assignmentTitle: 'Assignment 1',
  assignmentDueDate: new Date('2099-01-01'),
  assignmentMaxGrade: 100,
  courseId: 'c-1',
  courseTitle: 'Course 1',
  lessonId: 'l-1',
  lessonTitle: 'Lesson 1',
  ...overrides,
})

const makeSubmissionRow = (overrides: Partial<{
  id: string
  assignmentId: string
  status: 'draft' | 'submitted' | 'graded' | 'returned'
  grade: number | null
  submittedAt: Date | null
  gradedAt: Date | null
  feedback: string | null
}> = {}) => ({
  id: 'sub-1',
  assignmentId: 'a-1',
  status: 'submitted',
  grade: null,
  submittedAt: null,
  gradedAt: null,
  feedback: null,
  ...overrides,
})

describe('buildAverageGradeByCourse', () => {
  it('returns empty array when course list is empty', () => {
    expect(buildAverageGradeByCourse([], [])).toEqual([])
  })

  it('excludes courses with no matching submissions', () => {
    expect(buildAverageGradeByCourse([{ id: 'c-1', title: 'C1' }], [])).toEqual([])
  })

  it('excludes courses where all submissions have null grade', () => {
    const result = buildAverageGradeByCourse(
      [{ id: 'c-1', title: 'C1' }],
      [makeSub({ grade: null })],
    )
    expect(result).toEqual([])
  })

  it('calculates average grade for a course with a graded submission', () => {
    const result = buildAverageGradeByCourse(
      [{ id: 'c-1', title: 'Course 1' }],
      [makeSub({ grade: 80 })],
    )
    expect(result).toEqual([{ courseId: 'c-1', courseTitle: 'Course 1', averageGrade: 80, maxGrade: 100 }])
  })

  it('uses assignment maxGrade for percentage calculation', () => {
    const [result] = buildAverageGradeByCourse(
      [{ id: 'c-1', title: 'C1' }],
      [makeSub({ grade: 40, maxGrade: 50 })],
    )
    expect(result.averageGrade).toBe(80)
  })

  it('defaults maxGrade to 100 when null', () => {
    const [result] = buildAverageGradeByCourse(
      [{ id: 'c-1', title: 'C1' }],
      [makeSub({ grade: 50, maxGrade: null })],
    )
    expect(result.averageGrade).toBe(50)
  })

  it('only includes submissions matching the course', () => {
    const result = buildAverageGradeByCourse(
      [{ id: 'c-1', title: 'C1' }],
      [makeSub({ grade: 80, courseId: 'c-1' }), makeSub({ grade: 20, courseId: 'c-2' })],
    )
    expect(result[0].averageGrade).toBe(80)
  })
})

describe('buildStudentWithStats', () => {
  it('maps student profile fields correctly', () => {
    const result = buildStudentWithStats(makeStudent(), [], [], 0)
    expect(result.id).toBe('s-1')
    expect(result.fullName).toBe('Jane Doe')
    expect(result.email).toBe('jane@test.com')
  })

  it('sets enrollmentCount to the number of courses', () => {
    const result = buildStudentWithStats(
      makeStudent(),
      [{ id: 'c-1', title: 'C1' }, { id: 'c-2', title: 'C2' }],
      [],
      0,
    )
    expect(result.enrollmentCount).toBe(2)
  })

  it('sets totalAssignments from the passed count', () => {
    const result = buildStudentWithStats(makeStudent(), [], [], 7)
    expect(result.assignmentStats.totalAssignments).toBe(7)
  })

  it('counts only non-draft submissions as submitted', () => {
    const submissions = [
      makeSub({ status: 'submitted' }),
      makeSub({ status: 'draft' }),
      makeSub({ status: 'graded', grade: 90 }),
    ]
    const result = buildStudentWithStats(makeStudent(), [], submissions, 0)
    expect(result.assignmentStats.submittedAssignments).toBe(2)
  })

  it('returns empty averageGradeByCourse when no graded submissions exist', () => {
    const result = buildStudentWithStats(
      makeStudent(),
      [{ id: 'c-1', title: 'C1' }],
      [makeSub({ grade: null })],
      0,
    )
    expect(result.assignmentStats.averageGradeByCourse).toEqual([])
  })
})

describe('buildAssignmentsWithSubmissions', () => {
  it('returns empty array when assignments list is empty', () => {
    expect(buildAssignmentsWithSubmissions([], [])).toEqual([])
  })

  it('excludes assignments with no matching submission', () => {
    expect(buildAssignmentsWithSubmissions([makeAssignmentRow()], [])).toEqual([])
  })

  it('maps assignmentId to id and assignmentTitle to title', () => {
    const [result] = buildAssignmentsWithSubmissions(
      [makeAssignmentRow({ assignmentId: 'a-1', assignmentTitle: 'Essay' })],
      [makeSubmissionRow({ assignmentId: 'a-1' })],
    )
    expect(result.id).toBe('a-1')
    expect(result.title).toBe('Essay')
  })

  it('nests the matching submission under submission field', () => {
    const [result] = buildAssignmentsWithSubmissions(
      [makeAssignmentRow()],
      [makeSubmissionRow({ id: 'sub-99', grade: 85 })],
    )
    expect(result.submission.id).toBe('sub-99')
    expect(result.submission.grade).toBe(85)
  })

  it('returns only matched assignments when there is partial overlap', () => {
    const result = buildAssignmentsWithSubmissions(
      [makeAssignmentRow({ assignmentId: 'a-1' }), makeAssignmentRow({ assignmentId: 'a-2' })],
      [makeSubmissionRow({ assignmentId: 'a-2', id: 'sub-2' })],
    )
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a-2')
  })
})

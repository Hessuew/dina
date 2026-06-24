import { describe, expect, it } from 'vitest'
import {
  computeCourseAverageGrade,
  formatAssignmentDueDate,
  formatAssignmentGrade,
  getAssignmentRowStatus,
  getStudentInitials,
  groupAssignmentsByCourse,
  shouldShowOverdueBadge,
} from './student-detail-view.domain'
import type { StudentDetailWithAssignments } from '@/types/student'

type Enrollment = StudentDetailWithAssignments['enrollments'][number]
type Assignment = StudentDetailWithAssignments['assignments'][number]

const makeEnrollment = (overrides: Partial<Enrollment> = {}): Enrollment => ({
  id: 'e-1',
  status: 'active',
  courseId: 'c-1',
  courseTitle: 'Foundations',
  ...overrides,
})

const makeAssignment = (overrides: Partial<Assignment> = {}): Assignment => ({
  id: 'a-1',
  title: 'Essay',
  dueDate: new Date('2024-06-01'),
  maxGrade: 100,
  courseId: 'c-1',
  courseTitle: 'Foundations',
  lessonId: 'l-1',
  lessonTitle: 'Lesson 1',
  submission: {
    id: 'sub-1',
    status: 'submitted',
    grade: null,
    submittedAt: new Date('2024-05-01'),
    gradedAt: null,
    feedback: null,
  },
  ...overrides,
})

const withGrade = (grade: number | null, overrides: Partial<Assignment> = {}) =>
  makeAssignment({
    ...overrides,
    submission: { ...makeAssignment().submission!, grade },
  })

describe('getStudentInitials', () => {
  it('takes first letter of first two name parts, uppercased', () => {
    expect(getStudentInitials('jane doe')).toBe('JD')
  })

  it('caps at two characters for longer names', () => {
    expect(getStudentInitials('Mary Jane Watson')).toBe('MJ')
  })

  it('handles a single-word name', () => {
    expect(getStudentInitials('cher')).toBe('C')
  })
})

describe('groupAssignmentsByCourse', () => {
  it('pairs each enrollment with its matching assignments by courseId', () => {
    const enrollments = [
      makeEnrollment({ courseId: 'c-1' }),
      makeEnrollment({ id: 'e-2', courseId: 'c-2' }),
    ]
    const assignments = [
      makeAssignment({ id: 'a-1', courseId: 'c-1' }),
      makeAssignment({ id: 'a-2', courseId: 'c-2' }),
      makeAssignment({ id: 'a-3', courseId: 'c-1' }),
    ]

    const result = groupAssignmentsByCourse(enrollments, assignments)

    expect(result).toHaveLength(2)
    expect(result[0].course.courseId).toBe('c-1')
    expect(result[0].assignments.map((a) => a.id)).toEqual(['a-1', 'a-3'])
    expect(result[1].assignments.map((a) => a.id)).toEqual(['a-2'])
  })

  it('yields an empty assignment list for a course with none', () => {
    const result = groupAssignmentsByCourse(
      [makeEnrollment({ courseId: 'c-9' })],
      [makeAssignment({ courseId: 'c-1' })],
    )
    expect(result[0].assignments).toEqual([])
  })
})

describe('computeCourseAverageGrade', () => {
  it('returns null when no assignment is graded', () => {
    expect(computeCourseAverageGrade([withGrade(null)])).toBeNull()
  })

  it('averages graded assignments as a rounded percentage', () => {
    const result = computeCourseAverageGrade([
      withGrade(80, { maxGrade: 100 }),
      withGrade(50, { maxGrade: 100 }),
    ])
    expect(result).toBe(65)
  })

  it('uses each assignment maxGrade for the percentage', () => {
    expect(computeCourseAverageGrade([withGrade(40, { maxGrade: 50 })])).toBe(
      80,
    )
  })

  it('defaults maxGrade to 100 when null', () => {
    expect(computeCourseAverageGrade([withGrade(50, { maxGrade: null })])).toBe(
      50,
    )
  })

  it('ignores ungraded assignments when averaging', () => {
    const result = computeCourseAverageGrade([
      withGrade(100, { maxGrade: 100 }),
      withGrade(null),
    ])
    expect(result).toBe(100)
  })
})

describe('getAssignmentRowStatus', () => {
  const now = new Date('2024-06-15')

  it('marks graded when submission has a grade', () => {
    expect(getAssignmentRowStatus(withGrade(90), now).isGraded).toBe(true)
  })

  it('marks not graded when submission grade is null', () => {
    expect(getAssignmentRowStatus(withGrade(null), now).isGraded).toBe(false)
  })

  it('marks submitted when a submission exists', () => {
    expect(getAssignmentRowStatus(makeAssignment(), now).isSubmitted).toBe(true)
  })

  it('marks not submitted when submission is null', () => {
    expect(
      getAssignmentRowStatus(makeAssignment({ submission: null }), now)
        .isSubmitted,
    ).toBe(false)
  })

  it('marks overdue when dueDate is before now', () => {
    const status = getAssignmentRowStatus(
      makeAssignment({ dueDate: new Date('2024-06-01') }),
      now,
    )
    expect(status.overdue).toBe(true)
  })

  it('is not overdue when dueDate is after now', () => {
    const status = getAssignmentRowStatus(
      makeAssignment({ dueDate: new Date('2024-07-01') }),
      now,
    )
    expect(status.overdue).toBe(false)
  })
})

describe('formatAssignmentGrade', () => {
  it('shows grade / maxGrade when graded', () => {
    expect(
      formatAssignmentGrade(withGrade(85, { maxGrade: 100 }), {
        isGraded: true,
        isSubmitted: true,
      }),
    ).toBe('85 / 100')
  })

  it('defaults maxGrade to 100 when null', () => {
    expect(
      formatAssignmentGrade(withGrade(85, { maxGrade: null }), {
        isGraded: true,
        isSubmitted: true,
      }),
    ).toBe('85 / 100')
  })

  it('shows Submitted when submitted but not graded', () => {
    expect(
      formatAssignmentGrade(withGrade(null), {
        isGraded: false,
        isSubmitted: true,
      }),
    ).toBe('Submitted')
  })

  it('shows Not submitted when neither graded nor submitted', () => {
    expect(
      formatAssignmentGrade(makeAssignment({ submission: null }), {
        isGraded: false,
        isSubmitted: false,
      }),
    ).toBe('Not submitted')
  })
})

describe('formatAssignmentDueDate', () => {
  it('formats as short month and numeric day (en-US)', () => {
    expect(formatAssignmentDueDate(new Date('2024-06-01T12:00:00Z'))).toBe(
      'Jun 1',
    )
  })
})

describe('shouldShowOverdueBadge', () => {
  it('shows when overdue and not graded', () => {
    expect(shouldShowOverdueBadge({ overdue: true, isGraded: false })).toBe(
      true,
    )
  })

  it('hides when overdue but graded', () => {
    expect(shouldShowOverdueBadge({ overdue: true, isGraded: true })).toBe(
      false,
    )
  })

  it('hides when not overdue', () => {
    expect(shouldShowOverdueBadge({ overdue: false, isGraded: false })).toBe(
      false,
    )
  })
})

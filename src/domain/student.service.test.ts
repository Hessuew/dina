import { describe, expect, it } from 'vitest'
import type { submissions } from '@/db/schema'
import { calculateCourseStats } from '@/domain/student.service'

type Submission = typeof submissions.$inferSelect

const makeSub = (
  overrides: Partial<
    Pick<Submission, 'id' | 'assignmentId' | 'status' | 'grade'>
  > = {},
): Submission =>
  ({
    id: 's-1',
    assignmentId: 'a-1',
    status: 'submitted',
    grade: null,
    ...overrides,
  }) as Submission

describe('calculateCourseStats', () => {
  it('returns zero counts and null average when there are no submissions', () => {
    expect(calculateCourseStats([], [{ id: 'a-1' }])).toEqual({
      totalAssignments: 1,
      submittedAssignments: 0,
      averageGrade: null,
    })
  })

  it('counts non-draft submissions only', () => {
    const { submittedAssignments } = calculateCourseStats(
      [
        makeSub({ id: 's-1', status: 'submitted' }),
        makeSub({ id: 's-2', status: 'draft' }),
      ],
      [{ id: 'a-1' }, { id: 'a-2' }],
    )
    expect(submittedAssignments).toBe(1)
  })

  it('calculates average grade using the assignment maxGrade', () => {
    const { averageGrade } = calculateCourseStats(
      [makeSub({ grade: 80, status: 'graded' })],
      [{ id: 'a-1', maxGrade: 100 }],
    )
    expect(averageGrade).toBe(80)
  })

  it('defaults maxGrade to 100 when not specified on the assignment', () => {
    const { averageGrade } = calculateCourseStats(
      [makeSub({ grade: 50, status: 'graded' })],
      [{ id: 'a-1' }],
    )
    expect(averageGrade).toBe(50)
  })

  it('returns null averageGrade when no submissions have a grade', () => {
    const { averageGrade } = calculateCourseStats(
      [makeSub({ grade: null })],
      [{ id: 'a-1' }],
    )
    expect(averageGrade).toBeNull()
  })

  it('uses 100 as fallback maxGrade when submission assignmentId has no matching assignment', () => {
    const { averageGrade } = calculateCourseStats(
      [makeSub({ assignmentId: 'a-missing', grade: 40, status: 'graded' })],
      [],
    )
    expect(averageGrade).toBe(40)
  })

  it('reflects total assignment count regardless of submissions', () => {
    const { totalAssignments } = calculateCourseStats(
      [],
      [{ id: 'a-1' }, { id: 'a-2' }, { id: 'a-3' }],
    )
    expect(totalAssignments).toBe(3)
  })
})

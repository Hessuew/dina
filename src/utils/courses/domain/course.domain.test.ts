import { describe, expect, it } from 'vitest'
import { buildAssignmentStats, extractTeacherIds } from './course.domain'

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
    expect(extractTeacherIds([])).toEqual({ teacher1Id: null, teacher2Id: null })
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

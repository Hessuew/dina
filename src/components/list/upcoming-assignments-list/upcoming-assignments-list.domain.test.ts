import { CheckCircle2Icon, CircleIcon } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import {
  buildUpcomingAssignmentRow,
  filterUpcomingAssignments,
  formatDueDate,
  getSubmissionStatus,
  isAssignmentOverdue,
} from './upcoming-assignments-list.domain'
import type { Assignment } from '@/components/view/assignments-view/AssignmentsView'

const NOW = new Date('2026-06-20T12:00:00Z')

function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'a1',
    title: 'Essay',
    description: null,
    dueDate: new Date('2026-06-25T12:00:00Z'),
    maxGrade: 100,
    status: 'published',
    lesson: {
      id: 'l1',
      title: 'Lesson 1',
      course: { id: 'c1', title: 'Course 1', startDate: null },
    },
    submission: null,
    ...overrides,
  }
}

describe('filterUpcomingAssignments', () => {
  it('keeps published, not-past-due, ungraded assignments for students', () => {
    const a = makeAssignment()
    expect(filterUpcomingAssignments([a], 'student', NOW)).toEqual([a])
  })

  it('excludes unpublished assignments for students', () => {
    const a = makeAssignment({ status: 'draft' })
    expect(filterUpcomingAssignments([a], 'student', NOW)).toEqual([])
  })

  it('excludes past-due assignments for students', () => {
    const a = makeAssignment({ dueDate: new Date('2026-06-19T12:00:00Z') })
    expect(filterUpcomingAssignments([a], 'student', NOW)).toEqual([])
  })

  it('excludes graded assignments for students', () => {
    const a = makeAssignment({
      submission: {
        id: 's1',
        status: 'graded',
        grade: 95,
        submittedAt: new Date('2026-06-18T12:00:00Z'),
      },
    })
    expect(filterUpcomingAssignments([a], 'student', NOW)).toEqual([])
  })

  it('keeps a student submission that has no grade yet', () => {
    const a = makeAssignment({
      submission: {
        id: 's1',
        status: 'submitted',
        grade: null,
        submittedAt: new Date('2026-06-18T12:00:00Z'),
      },
    })
    expect(filterUpcomingAssignments([a], 'student', NOW)).toEqual([a])
  })

  it('keeps only published assignments for teachers regardless of due date or grade', () => {
    const published = makeAssignment({
      id: 'p',
      dueDate: new Date('2026-06-01T12:00:00Z'),
      submission: {
        id: 's1',
        status: 'graded',
        grade: 80,
        submittedAt: new Date('2026-05-30T12:00:00Z'),
      },
    })
    const draft = makeAssignment({ id: 'd', status: 'draft' })
    expect(
      filterUpcomingAssignments([published, draft], 'teacher', NOW),
    ).toEqual([published])
  })

  it('caps the result at 5 assignments', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      makeAssignment({ id: `a${i}` }),
    )
    expect(filterUpcomingAssignments(many, 'teacher', NOW)).toHaveLength(5)
  })
})

describe('getSubmissionStatus', () => {
  it('returns Not Submitted when there is no submission', () => {
    expect(getSubmissionStatus(makeAssignment({ submission: null }))).toBe(
      'Not Submitted',
    )
  })

  it('returns Submitted for submitted status', () => {
    const a = makeAssignment({
      submission: {
        id: 's',
        status: 'submitted',
        grade: null,
        submittedAt: null,
      },
    })
    expect(getSubmissionStatus(a)).toBe('Submitted')
  })

  it('returns Submitted for graded status', () => {
    const a = makeAssignment({
      submission: { id: 's', status: 'graded', grade: 90, submittedAt: null },
    })
    expect(getSubmissionStatus(a)).toBe('Submitted')
  })

  it('returns Not Submitted for any other submission status', () => {
    const a = makeAssignment({
      submission: { id: 's', status: 'draft', grade: null, submittedAt: null },
    })
    expect(getSubmissionStatus(a)).toBe('Not Submitted')
  })
})

describe('isAssignmentOverdue', () => {
  it('is true when the due date is before now', () => {
    expect(isAssignmentOverdue(new Date('2026-06-19T12:00:00Z'), NOW)).toBe(
      true,
    )
  })

  it('is false when the due date is at or after now', () => {
    expect(isAssignmentOverdue(new Date('2026-06-21T12:00:00Z'), NOW)).toBe(
      false,
    )
  })
})

describe('formatDueDate', () => {
  it('formats as short month and numeric day', () => {
    expect(formatDueDate(new Date('2026-06-25T12:00:00Z'))).toBe('Jun 25')
  })
})

describe('buildUpcomingAssignmentRow', () => {
  it('builds the row view model for a submitted, on-time student assignment', () => {
    const a = makeAssignment({
      dueDate: new Date('2026-06-25T12:00:00Z'),
      submission: {
        id: 's',
        status: 'submitted',
        grade: null,
        submittedAt: null,
      },
    })
    expect(buildUpcomingAssignmentRow(a, 'student', NOW)).toEqual({
      overdue: false,
      submissionStatus: 'Submitted',
      isSubmitted: true,
      formattedDueDate: 'Jun 25',
      showStudentBadge: true,
      badgeClassName: 'border-[#C5A059]/40 text-[#D4B373]',
      statusIcon: CheckCircle2Icon,
      dueDateClassName: 'text-[#8E816D]',
      teacherStatsText: null,
    })
  })

  it('builds the row view model for an overdue, unsubmitted student assignment', () => {
    const a = makeAssignment({
      dueDate: new Date('2026-06-18T12:00:00Z'),
      submission: null,
    })
    expect(buildUpcomingAssignmentRow(a, 'student', NOW)).toEqual({
      overdue: true,
      submissionStatus: 'Not Submitted',
      isSubmitted: false,
      formattedDueDate: 'Jun 18',
      showStudentBadge: true,
      badgeClassName: 'border-white/12 text-[#8E816D]',
      statusIcon: CircleIcon,
      dueDateClassName: 'text-destructive font-medium',
      teacherStatsText: null,
    })
  })

  it('builds teacher stats text and hides the student badge for teachers', () => {
    const a = makeAssignment({
      submissionStats: { total: 10, submitted: 4, graded: 2 },
    })
    const vm = buildUpcomingAssignmentRow(a, 'teacher', NOW)
    expect(vm.showStudentBadge).toBe(false)
    expect(vm.teacherStatsText).toBe('4/10 submitted')
  })

  it('omits teacher stats text when stats are absent', () => {
    const vm = buildUpcomingAssignmentRow(makeAssignment(), 'teacher', NOW)
    expect(vm.teacherStatsText).toBeNull()
  })

  it('omits teacher stats text for non-teacher roles even with stats present', () => {
    const a = makeAssignment({
      submissionStats: { total: 10, submitted: 4, graded: 2 },
    })
    expect(
      buildUpcomingAssignmentRow(a, 'admin', NOW).teacherStatsText,
    ).toBeNull()
  })
})

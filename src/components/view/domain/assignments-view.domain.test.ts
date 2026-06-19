import { describe, expect, it } from 'vitest'
import {
  buildAssignmentCardViewModel,
  getSubmissionStatusLabel,
  getSubmissionVariant,
  isAssignmentOverdue,
} from './assignments-view.domain'

describe('isAssignmentOverdue', () => {
  it('is true when the due date is in the past', () => {
    expect(isAssignmentOverdue(new Date(Date.now() - 60_000))).toBe(true)
  })

  it('is false when the due date is in the future', () => {
    expect(isAssignmentOverdue(new Date(Date.now() + 60_000))).toBe(false)
  })
})

describe('getSubmissionStatusLabel', () => {
  it('returns Not Submitted when there is no submission', () => {
    expect(getSubmissionStatusLabel(null)).toBe('Not Submitted')
    expect(getSubmissionStatusLabel(undefined)).toBe('Not Submitted')
  })

  it('returns Graded when a grade is present', () => {
    expect(getSubmissionStatusLabel({ grade: 80, status: 'submitted' })).toBe(
      'Graded',
    )
  })

  it('returns Submitted when ungraded but submitted', () => {
    expect(getSubmissionStatusLabel({ grade: null, status: 'submitted' })).toBe(
      'Submitted',
    )
  })

  it('returns Draft when ungraded and not submitted', () => {
    expect(getSubmissionStatusLabel({ grade: null, status: 'draft' })).toBe(
      'Draft',
    )
  })
})

describe('getSubmissionVariant', () => {
  it('maps each status label to its chip variant', () => {
    expect(getSubmissionVariant('Graded')).toBe('graded')
    expect(getSubmissionVariant('Submitted')).toBe('submitted')
    expect(getSubmissionVariant('Draft')).toBe('draft')
    expect(getSubmissionVariant('Not Submitted')).toBe('not-submitted')
  })
})

describe('buildAssignmentCardViewModel', () => {
  it('uses the submission variant as the chip variant for students', () => {
    const vm = buildAssignmentCardViewModel(
      {
        dueDate: new Date(Date.now() + 60_000),
        status: 'published',
        submission: { grade: null, status: 'submitted' },
      },
      'student',
    )
    expect(vm.statusChipVariant).toBe('submitted')
    expect(vm.overdue).toBe(false)
    expect(vm.showStudentGrade).toBe(false)
  })

  it('uses the assignment status as the chip variant for non-students', () => {
    const vm = buildAssignmentCardViewModel(
      {
        dueDate: new Date(Date.now() - 60_000),
        status: 'closed',
        submission: { grade: 90, status: 'graded' },
      },
      'teacher',
    )
    expect(vm.statusChipVariant).toBe('closed')
    expect(vm.overdue).toBe(true)
  })

  it('shows the student grade only when a grade is present', () => {
    expect(
      buildAssignmentCardViewModel(
        {
          dueDate: new Date(),
          status: 'published',
          submission: { grade: 75, status: 'graded' },
        },
        'student',
      ).showStudentGrade,
    ).toBe(true)

    expect(
      buildAssignmentCardViewModel(
        { dueDate: new Date(), status: 'published', submission: null },
        'student',
      ).showStudentGrade,
    ).toBe(false)
  })
})

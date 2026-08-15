import { describe, expect, it } from 'vitest'
import {
  buildPastDueNoticeViewModel,
  buildSubmissionHeaderViewModel,
  buildSubmissionStatusViewModel,
} from './assignment-detail-sections.domain'

describe('buildSubmissionHeaderViewModel', () => {
  const base = {
    isStudent: true,
    canSubmit: true,
    isPastDue: false,
    submissionCount: 0,
  }

  describe('title', () => {
    it('uses "Your Submission" for students', () => {
      expect(buildSubmissionHeaderViewModel(base).title).toBe('Your Submission')
    })

    it('uses "Submissions" for teachers', () => {
      expect(
        buildSubmissionHeaderViewModel({ ...base, isStudent: false }).title,
      ).toBe('Submissions')
    })
  })

  describe('subtitle — teacher', () => {
    it('shows the submission count for teachers', () => {
      expect(
        buildSubmissionHeaderViewModel({
          ...base,
          isStudent: false,
          submissionCount: 3,
        }).subtitle,
      ).toBe('3 submitted')
    })

    it('shows zero count for teachers with no submissions', () => {
      expect(
        buildSubmissionHeaderViewModel({ ...base, isStudent: false }).subtitle,
      ).toBe('0 submitted')
    })
  })

  describe('subtitle — student', () => {
    it('prompts to submit when submission is open', () => {
      expect(
        buildSubmissionHeaderViewModel({ ...base, canSubmit: true }).subtitle,
      ).toBe('Submit before the due date')
    })

    it('shows late-accepted message when past due and can still submit', () => {
      expect(
        buildSubmissionHeaderViewModel({
          ...base,
          canSubmit: true,
          isPastDue: true,
        }).subtitle,
      ).toBe('Late submissions accepted')
    })

    it('shows past-due message when past due and cannot submit', () => {
      expect(
        buildSubmissionHeaderViewModel({
          ...base,
          canSubmit: false,
          isPastDue: true,
        }).subtitle,
      ).toBe('Submission period ended')
    })

    it('shows not-yet-open message when not past due and cannot submit', () => {
      expect(
        buildSubmissionHeaderViewModel({
          ...base,
          canSubmit: false,
          isPastDue: false,
        }).subtitle,
      ).toBe('Not yet open')
    })
  })
})

describe('buildPastDueNoticeViewModel', () => {
  it('hides notice when not past due', () => {
    expect(
      buildPastDueNoticeViewModel({ isPastDue: false, canSubmit: true }),
    ).toBeNull()
  })

  it('uses soft copy when past due and late submissions still allowed', () => {
    expect(
      buildPastDueNoticeViewModel({ isPastDue: true, canSubmit: true }),
    ).toEqual({
      tone: 'soft',
      message: 'Past due — late submissions still accepted',
      className:
        'border border-[#C5A059]/30 bg-[#C5A059]/10 px-4 py-3 text-xs text-[#E9D9B4]',
    })
  })

  it('uses hard copy when past due and submissions closed', () => {
    expect(
      buildPastDueNoticeViewModel({ isPastDue: true, canSubmit: false }),
    ).toEqual({
      tone: 'hard',
      message: 'This assignment is past due',
      className:
        'border border-red-400/30 bg-red-900/20 px-4 py-3 text-xs text-red-400',
    })
  })
})

describe('buildSubmissionStatusViewModel', () => {
  const baseSubmission = {
    status: 'draft' as const,
    grade: null,
    feedback: null,
    submittedAt: null,
  }

  describe('statusVariant', () => {
    it('is "submitted" when status is "submitted"', () => {
      const vm = buildSubmissionStatusViewModel(
        { ...baseSubmission, status: 'submitted' },
        null,
      )
      expect(vm.statusVariant).toBe('submitted')
    })

    it('is "draft" when status is "draft"', () => {
      const vm = buildSubmissionStatusViewModel(baseSubmission, null)
      expect(vm.statusVariant).toBe('draft')
    })

    it('is "draft" for any non-submitted status', () => {
      const vm = buildSubmissionStatusViewModel(
        { ...baseSubmission, status: 'graded' },
        null,
      )
      expect(vm.statusVariant).toBe('draft')
    })
  })

  describe('submittedAt', () => {
    it('hides submitted-at row when submittedAt is null', () => {
      const vm = buildSubmissionStatusViewModel(baseSubmission, null)
      expect(vm.showSubmittedAt).toBe(false)
      expect(vm.submittedAtLabel).toBe('')
    })

    it('shows submitted-at row with a locale string when date is present', () => {
      const date = new Date('2026-01-15T10:00:00Z')
      const vm = buildSubmissionStatusViewModel(
        { ...baseSubmission, submittedAt: date },
        null,
      )
      expect(vm.showSubmittedAt).toBe(true)
      expect(vm.submittedAtLabel).toBe(date.toLocaleString())
    })
  })

  describe('grade section', () => {
    it('hides grade section when grade is null', () => {
      const vm = buildSubmissionStatusViewModel(baseSubmission, null)
      expect(vm.showGradeSection).toBe(false)
      expect(vm.gradeLabel).toBe('')
    })

    it('shows grade section when grade is present', () => {
      const vm = buildSubmissionStatusViewModel(
        { ...baseSubmission, grade: 85 },
        100,
      )
      expect(vm.showGradeSection).toBe(true)
      expect(vm.gradeLabel).toBe('85 / 100')
    })

    it('defaults maxGrade to 100 when null', () => {
      const vm = buildSubmissionStatusViewModel(
        { ...baseSubmission, grade: 72 },
        null,
      )
      expect(vm.gradeLabel).toBe('72 / 100')
    })
  })

  describe('feedback', () => {
    it('hides feedback when grade is null', () => {
      const vm = buildSubmissionStatusViewModel(
        { ...baseSubmission, feedback: 'Great work!' },
        null,
      )
      expect(vm.showFeedback).toBe(false)
    })

    it('hides feedback when feedback is null even if graded', () => {
      const vm = buildSubmissionStatusViewModel(
        { ...baseSubmission, grade: 80, feedback: null },
        100,
      )
      expect(vm.showFeedback).toBe(false)
    })

    it('hides feedback when feedback is empty string', () => {
      const vm = buildSubmissionStatusViewModel(
        { ...baseSubmission, grade: 80, feedback: '' },
        100,
      )
      expect(vm.showFeedback).toBe(false)
    })

    it('shows feedback when graded and feedback is present', () => {
      const vm = buildSubmissionStatusViewModel(
        { ...baseSubmission, grade: 80, feedback: 'Great work!' },
        100,
      )
      expect(vm.showFeedback).toBe(true)
      expect(vm.feedback).toBe('Great work!')
    })
  })
})

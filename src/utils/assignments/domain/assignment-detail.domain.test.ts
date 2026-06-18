import { describe, expect, it, vi } from 'vitest'
import {
  buildInitialSubmissionFormData,
  deriveSubmissionPermissions,
  formatSubmissionGrade,
  formatSubmittedDate,
  navigateAfterDelete,
  navigateBack,
  resolveEditDialogMode,
  resolveSubmissionStatusVariant,
} from './assignment-detail.domain'

describe('resolveSubmissionStatusVariant', () => {
  it('returns graded when a grade is present, regardless of status', () => {
    expect(
      resolveSubmissionStatusVariant({ grade: 80, status: 'submitted' }),
    ).toBe('graded')
    expect(resolveSubmissionStatusVariant({ grade: 0, status: 'draft' })).toBe(
      'graded',
    )
  })

  it('returns submitted when ungraded but submitted', () => {
    expect(
      resolveSubmissionStatusVariant({ grade: null, status: 'submitted' }),
    ).toBe('submitted')
  })

  it('returns draft when ungraded and not submitted', () => {
    expect(
      resolveSubmissionStatusVariant({ grade: null, status: 'draft' }),
    ).toBe('draft')
    expect(
      resolveSubmissionStatusVariant({ grade: null, status: 'graded' }),
    ).toBe('draft')
  })
})

describe('formatSubmissionGrade', () => {
  it('formats grade against the assignment max grade', () => {
    expect(formatSubmissionGrade(42, 50)).toBe('42 / 50')
  })

  it('defaults the max grade to 100 when absent', () => {
    expect(formatSubmissionGrade(90, null)).toBe('90 / 100')
    expect(formatSubmissionGrade(90, undefined)).toBe('90 / 100')
  })

  it('renders an em dash when there is no grade', () => {
    expect(formatSubmissionGrade(null, 50)).toBe('—')
  })
})

describe('formatSubmittedDate', () => {
  it('renders the localized date when submitted', () => {
    const date = new Date('2026-06-18T00:00:00Z')
    expect(formatSubmittedDate(date)).toBe(date.toLocaleDateString())
  })

  it('renders an em dash when not submitted', () => {
    expect(formatSubmittedDate(null)).toBe('—')
  })
})

describe('buildInitialSubmissionFormData', () => {
  it('uses the submission content and fileUrl when present', () => {
    expect(
      buildInitialSubmissionFormData({ content: 'hi', fileUrl: 'u' }),
    ).toEqual({ content: 'hi', fileUrl: 'u' })
  })

  it('falls back to empty strings for null fields', () => {
    expect(
      buildInitialSubmissionFormData({ content: null, fileUrl: null }),
    ).toEqual({ content: '', fileUrl: '' })
  })

  it('falls back to empty strings when there is no submission', () => {
    expect(buildInitialSubmissionFormData(null)).toEqual({
      content: '',
      fileUrl: '',
    })
    expect(buildInitialSubmissionFormData(undefined)).toEqual({
      content: '',
      fileUrl: '',
    })
  })
})

describe('deriveSubmissionPermissions', () => {
  const future = new Date('2999-01-01T00:00:00Z')
  const past = new Date('2000-01-01T00:00:00Z')

  it('lets a student submit a published, not-yet-due assignment', () => {
    expect(
      deriveSubmissionPermissions({
        role: 'student',
        status: 'published',
        dueDate: future,
      }),
    ).toEqual({ isStudent: true, isPastDue: false, canSubmit: true })
  })

  it('blocks submission once past due', () => {
    expect(
      deriveSubmissionPermissions({
        role: 'student',
        status: 'published',
        dueDate: past,
      }),
    ).toEqual({ isStudent: true, isPastDue: true, canSubmit: false })
  })

  it('blocks submission for an unpublished assignment', () => {
    expect(
      deriveSubmissionPermissions({
        role: 'student',
        status: 'draft',
        dueDate: future,
      }),
    ).toEqual({ isStudent: true, isPastDue: false, canSubmit: false })
  })

  it('marks non-students as unable to submit', () => {
    expect(
      deriveSubmissionPermissions({
        role: 'teacher',
        status: 'published',
        dueDate: future,
      }),
    ).toEqual({ isStudent: false, isPastDue: false, canSubmit: false })
  })

  it('uses the injected now for past-due comparison', () => {
    expect(
      deriveSubmissionPermissions({
        role: 'student',
        status: 'published',
        dueDate: new Date('2026-06-18T12:00:00Z'),
        now: new Date('2026-06-18T13:00:00Z'),
      }).isPastDue,
    ).toBe(true)
  })
})

describe('navigateBack', () => {
  it('navigates to the calendar month when arriving from the calendar', () => {
    const actions = {
      toCalendar: vi.fn(),
      toDashboard: vi.fn(),
      back: vi.fn(),
    }
    navigateBack(
      { fromCalendar: true, calendarMonth: '2026-06', fromDashboard: false },
      actions,
    )
    expect(actions.toCalendar).toHaveBeenCalledWith('2026-06')
    expect(actions.toDashboard).not.toHaveBeenCalled()
    expect(actions.back).not.toHaveBeenCalled()
  })

  it('falls through to dashboard when calendar month is missing', () => {
    const actions = {
      toCalendar: vi.fn(),
      toDashboard: vi.fn(),
      back: vi.fn(),
    }
    navigateBack(
      { fromCalendar: true, calendarMonth: undefined, fromDashboard: true },
      actions,
    )
    expect(actions.toCalendar).not.toHaveBeenCalled()
    expect(actions.toDashboard).toHaveBeenCalledTimes(1)
  })

  it('navigates to the dashboard when arriving from the dashboard', () => {
    const actions = {
      toCalendar: vi.fn(),
      toDashboard: vi.fn(),
      back: vi.fn(),
    }
    navigateBack(
      { fromCalendar: false, calendarMonth: undefined, fromDashboard: true },
      actions,
    )
    expect(actions.toDashboard).toHaveBeenCalledTimes(1)
    expect(actions.back).not.toHaveBeenCalled()
  })

  it('goes back in history otherwise', () => {
    const actions = {
      toCalendar: vi.fn(),
      toDashboard: vi.fn(),
      back: vi.fn(),
    }
    navigateBack(
      { fromCalendar: false, calendarMonth: undefined, fromDashboard: false },
      actions,
    )
    expect(actions.back).toHaveBeenCalledTimes(1)
  })
})

describe('resolveEditDialogMode', () => {
  it('returns the edit/delete mode when open', () => {
    expect(resolveEditDialogMode({ mode: 'edit', isOpen: true })).toBe('edit')
    expect(resolveEditDialogMode({ mode: 'delete', isOpen: true })).toBe(
      'delete',
    )
  })

  it('returns null when not open even for edit/delete', () => {
    expect(resolveEditDialogMode({ mode: 'edit', isOpen: false })).toBeNull()
  })

  it('returns null for other modes', () => {
    expect(resolveEditDialogMode({ mode: 'grade', isOpen: true })).toBeNull()
    expect(resolveEditDialogMode({ mode: null, isOpen: true })).toBeNull()
    expect(resolveEditDialogMode({ mode: undefined, isOpen: true })).toBeNull()
  })
})

describe('navigateAfterDelete', () => {
  it('navigates to the assignments list when from the dashboard', () => {
    const actions = { toAssignments: vi.fn(), toLesson: vi.fn() }
    navigateAfterDelete({ fromDashboard: true }, actions)
    expect(actions.toAssignments).toHaveBeenCalledTimes(1)
    expect(actions.toLesson).not.toHaveBeenCalled()
  })

  it('navigates to the lesson otherwise', () => {
    const actions = { toAssignments: vi.fn(), toLesson: vi.fn() }
    navigateAfterDelete({ fromDashboard: false }, actions)
    expect(actions.toLesson).toHaveBeenCalledTimes(1)
    expect(actions.toAssignments).not.toHaveBeenCalled()
  })
})

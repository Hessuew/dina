import { describe, expect, it } from 'vitest'
import {
  buildAssignmentSubmitAction,
  buildGradeSubmitData,
  formatSubmissionCountWarning,
  getAssignmentFormCopy,
  getAssignmentInitialValues,
  getGradingInitialValues,
  getSubmissionPreviewModel,
  getSubmissionStudentName,
  resolveMaxGrade,
} from './assignment-dialog.domain'
import type {
  AssignmentData,
  AssignmentFormData,
  GradingFormData,
  SubmissionData,
} from './assignment-dialog.domain'

function makeAssignment(
  overrides: Partial<AssignmentData> = {},
): AssignmentData {
  return {
    id: 'a1',
    title: 'Essay',
    description: 'Write an essay',
    // Local wall-clock ctor so form value is stable across host timezones.
    dueDate: new Date(2026, 5, 19, 10, 0),
    maxGrade: 80,
    status: 'published',
    ...overrides,
  }
}

function makeSubmission(
  overrides: Partial<SubmissionData> = {},
): SubmissionData {
  return {
    id: 's1',
    content: 'My answer',
    grade: 75,
    feedback: 'Good work',
    student: { fullName: 'Jane Doe' },
    ...overrides,
  }
}

function makeFormValue(
  overrides: Partial<AssignmentFormData> = {},
): AssignmentFormData {
  return {
    title: 'Essay',
    description: 'Write an essay',
    dueDate: '2026-06-19T10:00',
    maxGrade: 80,
    status: 'published',
    ...overrides,
  }
}

describe('getAssignmentInitialValues', () => {
  it('returns the empty form when there is no assignment', () => {
    expect(getAssignmentInitialValues(undefined, 'edit')).toEqual({
      title: '',
      description: '',
      dueDate: '',
      maxGrade: 100,
      status: 'draft',
    })
  })

  it('returns the empty form in create mode even with an assignment', () => {
    expect(getAssignmentInitialValues(makeAssignment(), 'create').title).toBe(
      '',
    )
  })

  it('maps an assignment to form values in edit mode', () => {
    expect(getAssignmentInitialValues(makeAssignment(), 'edit')).toEqual({
      title: 'Essay',
      description: 'Write an essay',
      dueDate: '2026-06-19T10:00',
      maxGrade: 80,
      status: 'published',
    })
  })

  it('falls back to defaults for null description and maxGrade', () => {
    const values = getAssignmentInitialValues(
      makeAssignment({ description: null, maxGrade: null }),
      'edit',
    )
    expect(values.description).toBe('')
    expect(values.maxGrade).toBe(100)
  })
})

describe('getGradingInitialValues', () => {
  it('returns the empty grading form when there is no submission', () => {
    expect(getGradingInitialValues(null)).toEqual({ grade: 0, feedback: '' })
  })

  it('maps a submission to grading values', () => {
    expect(getGradingInitialValues(makeSubmission())).toEqual({
      grade: 75,
      feedback: 'Good work',
    })
  })

  it('falls back to defaults for null grade and feedback', () => {
    expect(
      getGradingInitialValues(makeSubmission({ grade: null, feedback: null })),
    ).toEqual({ grade: 0, feedback: '' })
  })
})

describe('buildAssignmentSubmitAction', () => {
  it('returns a create action with the lesson id in create mode', () => {
    const action = buildAssignmentSubmitAction({
      value: makeFormValue(),
      mode: 'create',
      lessonId: 'l1',
      assignment: undefined,
    })
    expect(action).toEqual({
      kind: 'create',
      data: {
        title: 'Essay',
        description: 'Write an essay',
        dueDate: '2026-06-19T10:00',
        maxGrade: 80,
        lessonId: 'l1',
      },
    })
  })

  it('returns none in create mode without a lesson id', () => {
    expect(
      buildAssignmentSubmitAction({
        value: makeFormValue(),
        mode: 'create',
        lessonId: undefined,
        assignment: undefined,
      }),
    ).toEqual({ kind: 'none' })
  })

  it('omits empty description and non-positive maxGrade', () => {
    const action = buildAssignmentSubmitAction({
      value: makeFormValue({ description: '', maxGrade: 0 }),
      mode: 'create',
      lessonId: 'l1',
      assignment: undefined,
    })
    expect(action).toEqual({
      kind: 'create',
      data: {
        title: 'Essay',
        description: undefined,
        dueDate: '2026-06-19T10:00',
        maxGrade: undefined,
        lessonId: 'l1',
      },
    })
  })

  it('returns an update action with the assignment id and status in edit mode', () => {
    const action = buildAssignmentSubmitAction({
      value: makeFormValue({ status: 'closed' }),
      mode: 'edit',
      lessonId: undefined,
      assignment: makeAssignment({ id: 'a9' }),
    })
    expect(action).toEqual({
      kind: 'update',
      data: {
        title: 'Essay',
        description: 'Write an essay',
        dueDate: '2026-06-19T10:00',
        maxGrade: 80,
        assignmentId: 'a9',
        status: 'closed',
      },
    })
  })

  it('returns none in edit mode without an assignment', () => {
    expect(
      buildAssignmentSubmitAction({
        value: makeFormValue(),
        mode: 'edit',
        lessonId: undefined,
        assignment: undefined,
      }),
    ).toEqual({ kind: 'none' })
  })
})

describe('buildGradeSubmitData', () => {
  it('returns null without a submission', () => {
    expect(
      buildGradeSubmitData({
        value: { grade: 5, feedback: 'ok' },
        submission: null,
        assignment: makeAssignment(),
      }),
    ).toBeNull()
  })

  it('returns null without an assignment', () => {
    expect(
      buildGradeSubmitData({
        value: { grade: 5, feedback: 'ok' },
        submission: makeSubmission(),
        assignment: undefined,
      }),
    ).toBeNull()
  })

  it('builds grade data when both submission and assignment exist', () => {
    expect(
      buildGradeSubmitData({
        value: { grade: 90, feedback: 'great' },
        submission: makeSubmission({ id: 's7' }),
        assignment: makeAssignment({ id: 'a7' }),
      }),
    ).toEqual({
      submissionId: 's7',
      assignmentId: 'a7',
      grade: 90,
      feedback: 'great',
    })
  })

  it('omits empty feedback', () => {
    const data = buildGradeSubmitData({
      value: { grade: 90, feedback: '' } as GradingFormData,
      submission: makeSubmission(),
      assignment: makeAssignment(),
    })
    expect(data?.feedback).toBeUndefined()
  })
})

describe('getAssignmentFormCopy', () => {
  it('returns create copy in create mode', () => {
    expect(getAssignmentFormCopy('create')).toEqual({
      title: 'Create Assignment',
      subtitle: 'Add a new assignment for this lesson',
      submitLabel: 'Create Assignment',
    })
  })

  it('returns edit copy in any non-create mode', () => {
    expect(getAssignmentFormCopy('edit')).toEqual({
      title: 'Edit Assignment',
      subtitle: 'Update the assignment information',
      submitLabel: 'Save Changes',
    })
  })
})

describe('resolveMaxGrade', () => {
  it('returns the assignment maxGrade when set', () => {
    expect(resolveMaxGrade(makeAssignment({ maxGrade: 50 }))).toBe(50)
  })

  it('returns 100 when there is no assignment', () => {
    expect(resolveMaxGrade(undefined)).toBe(100)
  })

  it('returns 100 when maxGrade is null', () => {
    expect(resolveMaxGrade(makeAssignment({ maxGrade: null }))).toBe(100)
  })
})

describe('getSubmissionPreviewModel', () => {
  it('returns content text for a submission', () => {
    expect(getSubmissionPreviewModel(makeSubmission())).toEqual({
      contentText: 'My answer',
    })
  })

  it('uses a placeholder for empty content', () => {
    expect(getSubmissionPreviewModel(makeSubmission({ content: '' }))).toEqual({
      contentText: 'No content provided',
    })
  })

  it('handles a null submission', () => {
    expect(getSubmissionPreviewModel(null)).toEqual({
      contentText: 'No content provided',
    })
  })
})

describe('getSubmissionStudentName', () => {
  it('returns the student full name', () => {
    expect(getSubmissionStudentName(makeSubmission())).toBe('Jane Doe')
  })

  it('returns an empty string for a null submission', () => {
    expect(getSubmissionStudentName(null)).toBe('')
  })
})

describe('formatSubmissionCountWarning', () => {
  it('pluralizes for multiple submissions', () => {
    expect(formatSubmissionCountWarning(3)).toBe(
      'This assignment has 3 submissions. Assignments with submissions cannot be deleted.',
    )
  })

  it('uses singular for exactly one submission', () => {
    expect(formatSubmissionCountWarning(1)).toBe(
      'This assignment has 1 submission. Assignments with submissions cannot be deleted.',
    )
  })
})

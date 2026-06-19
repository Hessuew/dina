import { describe, expect, it } from 'vitest'
import {
  buildAssignmentCardViewModel,
  buildAssignmentsCourseView,
  getAssignmentCardFooterMode,
  getAssignmentsSubtitle,
  getSelectedCourseLabel,
  getSubmissionStatusLabel,
  getSubmissionVariant,
  isAssignmentOverdue,
} from './assignments-view.domain'

const makeAssignment = (
  id: string,
  course: { id: string; title: string; startDate: Date | null },
) => ({ id, lesson: { course } })

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

describe('getAssignmentCardFooterMode', () => {
  it('returns grade for a student with a visible grade', () => {
    expect(getAssignmentCardFooterMode('student', true, false)).toBe('grade')
  })

  it('returns none for a student without a visible grade', () => {
    expect(getAssignmentCardFooterMode('student', false, false)).toBe('none')
  })

  it('returns stats for a non-student with submission stats', () => {
    expect(getAssignmentCardFooterMode('teacher', false, true)).toBe('stats')
    expect(getAssignmentCardFooterMode('admin', false, true)).toBe('stats')
  })

  it('returns none for a non-student without submission stats', () => {
    expect(getAssignmentCardFooterMode('teacher', false, false)).toBe('none')
  })
})

describe('getAssignmentsSubtitle', () => {
  it('returns the student subtitle for students', () => {
    expect(getAssignmentsSubtitle('student')).toBe(
      'View and submit your assignments',
    )
  })

  it('returns the management subtitle for teachers and admins', () => {
    expect(getAssignmentsSubtitle('teacher')).toBe(
      'Manage assignments and grade submissions',
    )
    expect(getAssignmentsSubtitle('admin')).toBe(
      'Manage assignments and grade submissions',
    )
  })
})

describe('getSelectedCourseLabel', () => {
  const courses = [
    { id: 'a', title: 'Alpha', startDate: null },
    { id: 'b', title: 'Beta', startDate: null },
  ]

  it('returns "All Courses" when the filter is "all"', () => {
    expect(getSelectedCourseLabel('all', courses)).toBe('All Courses')
  })

  it('returns the matching course title', () => {
    expect(getSelectedCourseLabel('b', courses)).toBe('Beta')
  })

  it('falls back to "Select Course" when no course matches', () => {
    expect(getSelectedCourseLabel('missing', courses)).toBe('Select Course')
    expect(getSelectedCourseLabel(null, courses)).toBe('Select Course')
  })
})

describe('buildAssignmentsCourseView', () => {
  const courseA = { id: 'a', title: 'Alpha', startDate: new Date('2026-02-01') }
  const courseB = { id: 'b', title: 'Beta', startDate: new Date('2026-01-01') }

  it('dedupes courses and sorts them by start date ascending', () => {
    const view = buildAssignmentsCourseView(
      [
        makeAssignment('1', courseA),
        makeAssignment('2', courseB),
        makeAssignment('3', courseA),
      ],
      'all',
    )
    expect(view.courses.map((c) => c.id)).toEqual(['b', 'a'])
  })

  it('treats a missing start date as the earliest', () => {
    const courseNoDate = { id: 'c', title: 'Gamma', startDate: null }
    const view = buildAssignmentsCourseView(
      [makeAssignment('1', courseA), makeAssignment('2', courseNoDate)],
      'all',
    )
    expect(view.courses.map((c) => c.id)).toEqual(['c', 'a'])
  })

  it('sorts a mix of dated and undated courses with the undated ones first', () => {
    const late = {
      id: 'late',
      title: 'Late',
      startDate: new Date('2026-03-01'),
    }
    const noDate = { id: 'none', title: 'None', startDate: null }
    const early = {
      id: 'early',
      title: 'Early',
      startDate: new Date('2026-01-01'),
    }
    const view = buildAssignmentsCourseView(
      [
        makeAssignment('1', late),
        makeAssignment('2', noDate),
        makeAssignment('3', early),
      ],
      'all',
    )
    expect(view.courses.map((c) => c.id)).toEqual(['none', 'early', 'late'])
  })

  it('returns every assignment when the filter is "all"', () => {
    const view = buildAssignmentsCourseView(
      [makeAssignment('1', courseA), makeAssignment('2', courseB)],
      'all',
    )
    expect(view.filteredAssignments).toHaveLength(2)
  })

  it('filters assignments to the selected course', () => {
    const view = buildAssignmentsCourseView(
      [makeAssignment('1', courseA), makeAssignment('2', courseB)],
      'a',
    )
    expect(view.filteredAssignments.map((a) => a.id)).toEqual(['1'])
  })

  it('groups filtered assignments under each course in sorted order', () => {
    const view = buildAssignmentsCourseView(
      [
        makeAssignment('1', courseA),
        makeAssignment('2', courseB),
        makeAssignment('3', courseA),
      ],
      'all',
    )
    expect(
      view.groupedByCourse.map((g) => ({
        id: g.course.id,
        assignments: g.assignments.map((a) => a.id),
      })),
    ).toEqual([
      { id: 'b', assignments: ['2'] },
      { id: 'a', assignments: ['1', '3'] },
    ])
  })

  it('keeps every course group present but empty for filtered-out courses', () => {
    const view = buildAssignmentsCourseView(
      [makeAssignment('1', courseA), makeAssignment('2', courseB)],
      'a',
    )
    expect(
      view.groupedByCourse.map((g) => ({
        id: g.course.id,
        count: g.assignments.length,
      })),
    ).toEqual([
      { id: 'b', count: 0 },
      { id: 'a', count: 1 },
    ])
  })

  it('returns empty collections for no assignments', () => {
    const view = buildAssignmentsCourseView([], 'all')
    expect(view.courses).toEqual([])
    expect(view.filteredAssignments).toEqual([])
    expect(view.groupedByCourse).toEqual([])
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

  it('is not overdue for a student with a submitted submission even when past due', () => {
    const vm = buildAssignmentCardViewModel(
      {
        dueDate: new Date(Date.now() - 60_000),
        status: 'published',
        submission: { grade: null, status: 'submitted' },
      },
      'student',
    )
    expect(vm.overdue).toBe(false)
  })

  it('is not overdue for a student with a graded submission even when past due', () => {
    const vm = buildAssignmentCardViewModel(
      {
        dueDate: new Date(Date.now() - 60_000),
        status: 'published',
        submission: { grade: 90, status: 'graded' },
      },
      'student',
    )
    expect(vm.overdue).toBe(false)
  })

  it('is overdue for a teacher regardless of submission status', () => {
    const vm = buildAssignmentCardViewModel(
      {
        dueDate: new Date(Date.now() - 60_000),
        status: 'published',
        submission: { grade: 90, status: 'graded' },
      },
      'teacher',
    )
    expect(vm.overdue).toBe(true)
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

  it('sets the overdue due-date class only when overdue', () => {
    expect(
      buildAssignmentCardViewModel(
        { dueDate: new Date(Date.now() - 60_000), status: 'published' },
        'student',
      ).dueDateClassName,
    ).toBe('font-medium text-red-400')

    expect(
      buildAssignmentCardViewModel(
        { dueDate: new Date(Date.now() + 60_000), status: 'published' },
        'student',
      ).dueDateClassName,
    ).toBeUndefined()
  })

  it('formats the grade text from the submission grade and max grade', () => {
    expect(
      buildAssignmentCardViewModel(
        {
          dueDate: new Date(),
          status: 'published',
          maxGrade: 50,
          submission: { grade: 40, status: 'graded' },
        },
        'student',
      ).gradeText,
    ).toBe('40 / 50')
  })

  it('defaults the max grade to 100 when absent', () => {
    expect(
      buildAssignmentCardViewModel(
        {
          dueDate: new Date(),
          status: 'published',
          submission: { grade: 88, status: 'graded' },
        },
        'student',
      ).gradeText,
    ).toBe('88 / 100')
  })

  it('formats submitted and graded text from submission stats', () => {
    const vm = buildAssignmentCardViewModel(
      {
        dueDate: new Date(),
        status: 'published',
        submissionStats: { total: 5, submitted: 3, graded: 2 },
      },
      'teacher',
    )
    expect(vm.submittedText).toBe('3 / 5')
    expect(vm.gradedText).toBe('2')
  })

  it('leaves stats text empty when there are no submission stats', () => {
    const vm = buildAssignmentCardViewModel(
      { dueDate: new Date(), status: 'published' },
      'teacher',
    )
    expect(vm.submittedText).toBe('')
    expect(vm.gradedText).toBe('')
  })

  it('derives the footer mode from role, grade, and submission stats', () => {
    expect(
      buildAssignmentCardViewModel(
        {
          dueDate: new Date(),
          status: 'published',
          submission: { grade: 80, status: 'graded' },
        },
        'student',
      ).footerMode,
    ).toBe('grade')

    expect(
      buildAssignmentCardViewModel(
        {
          dueDate: new Date(),
          status: 'published',
          submissionStats: { total: 3, submitted: 2, graded: 1 },
        },
        'teacher',
      ).footerMode,
    ).toBe('stats')
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

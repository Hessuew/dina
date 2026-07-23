import { describe, expect, it } from 'vitest'
import {
  buildCourseSubmitAction,
  emptyCourseFormData,
  extractCreatedCourseId,
  getAvailableCourseTeachers,
  getCourseDialogChrome,
  getCourseLoadingLabel,
  getInitialValues,
  isCourseDialogSubmitting,
  shouldLoadCourseTeachers,
} from './course-dialog.domain'
import type { CourseFormData, CourseInitialData } from './course-dialog.domain'

const initialData: CourseInitialData = {
  courseId: 'course-1',
  title: 'Intro',
  description: 'Desc',
  thumbnailUrl: 'https://cdn/thumb.png',
  isPublished: true,
  teacher1Id: 't1',
  teacher2Id: 't2',
  orderIndex: 3,
}

describe('getAvailableCourseTeachers', () => {
  const teachers = [
    { id: 'free', role: 'teacher', courseId: null },
    { id: 'current', role: 'teacher', courseId: 'course-1' },
    { id: 'assigned', role: 'teacher', courseId: 'course-2' },
    { id: 'admin', role: 'admin', courseId: null },
  ]

  it('offers unassigned teachers and admins when creating', () => {
    expect(getAvailableCourseTeachers(teachers).map((t) => t.id)).toEqual([
      'free',
      'admin',
    ])
  })

  it('keeps current teachers available when editing', () => {
    expect(
      getAvailableCourseTeachers(teachers, 'course-1').map((t) => t.id),
    ).toEqual(['free', 'current', 'admin'])
  })
})

describe('getInitialValues', () => {
  it('returns a fresh copy of empty form data when no initialData', () => {
    const result = getInitialValues(undefined)
    expect(result).toEqual(emptyCourseFormData)
    expect(result).not.toBe(emptyCourseFormData)
  })

  it('maps initialData onto the form shape', () => {
    expect(getInitialValues(initialData)).toEqual({
      title: 'Intro',
      description: 'Desc',
      orderIndex: 3,
      teacher1Id: 't1',
      teacher2Id: 't2',
      isPublished: true,
    })
  })

  it('coerces null teacher ids to empty strings', () => {
    expect(
      getInitialValues({ ...initialData, teacher1Id: null, teacher2Id: null }),
    ).toMatchObject({ teacher1Id: '', teacher2Id: '' })
  })
})

const formValue: CourseFormData = {
  title: 'Title',
  description: 'Body',
  orderIndex: 2,
  teacher1Id: 't1',
  teacher2Id: '',
  isPublished: false,
}

describe('buildCourseSubmitAction', () => {
  it('builds a create action with empty teacher ids coerced to undefined', () => {
    const action = buildCourseSubmitAction('create', formValue, undefined, null)
    expect(action).toEqual({
      kind: 'create',
      data: {
        title: 'Title',
        description: 'Body',
        orderIndex: 2,
        teacher1Id: 't1',
        teacher2Id: undefined,
        isPublished: false,
      },
    })
  })

  it('keeps non-empty teacher ids and coerces empty teacher1Id', () => {
    const action = buildCourseSubmitAction(
      'create',
      { ...formValue, teacher1Id: '', teacher2Id: 't2' },
      undefined,
      null,
    )
    expect(action).toMatchObject({
      kind: 'create',
      data: { teacher1Id: undefined, teacher2Id: 't2' },
    })
  })

  it('returns none in edit mode when initialData is missing', () => {
    expect(buildCourseSubmitAction('edit', formValue, undefined, null)).toEqual(
      {
        kind: 'none',
      },
    )
  })

  it('builds an update action carrying courseId and thumbnailUrl', () => {
    const action = buildCourseSubmitAction(
      'edit',
      formValue,
      initialData,
      'https://cdn/new.png',
    )
    expect(action).toEqual({
      kind: 'update',
      data: {
        title: 'Title',
        description: 'Body',
        orderIndex: 2,
        teacher1Id: 't1',
        teacher2Id: undefined,
        isPublished: false,
        courseId: 'course-1',
        thumbnailUrl: 'https://cdn/new.png',
      },
    })
  })

  it('coerces an empty thumbnailUrl to undefined on update', () => {
    const action = buildCourseSubmitAction('edit', formValue, initialData, null)
    expect(action).toMatchObject({
      kind: 'update',
      data: { thumbnailUrl: undefined },
    })
  })
})

describe('getCourseDialogChrome', () => {
  it('returns create chrome', () => {
    expect(getCourseDialogChrome('create')).toEqual({
      title: 'Create Course',
      subtitle: 'Add a new course and assign teachers',
      submitLabel: 'Create Course',
    })
  })

  it('returns edit chrome', () => {
    expect(getCourseDialogChrome('edit')).toEqual({
      title: 'Edit Course',
      subtitle: 'Update the course information',
      submitLabel: 'Save Changes',
    })
  })
})

describe('getCourseLoadingLabel', () => {
  it('returns the uploading label while uploading', () => {
    expect(getCourseLoadingLabel(true)).toBe('Uploading...')
  })

  it('returns undefined when not uploading', () => {
    expect(getCourseLoadingLabel(false)).toBeUndefined()
  })
})

describe('isCourseDialogSubmitting', () => {
  it('is true when a mutation is pending', () => {
    expect(isCourseDialogSubmitting(true, false)).toBe(true)
  })

  it('is true while uploading', () => {
    expect(isCourseDialogSubmitting(false, true)).toBe(true)
  })

  it('is false when idle', () => {
    expect(isCourseDialogSubmitting(false, false)).toBe(false)
  })
})

describe('shouldLoadCourseTeachers', () => {
  it('loads only when open and admin', () => {
    expect(shouldLoadCourseTeachers(true, true)).toBe(true)
    expect(shouldLoadCourseTeachers(true, false)).toBe(false)
    expect(shouldLoadCourseTeachers(false, true)).toBe(false)
  })
})

describe('extractCreatedCourseId', () => {
  it('returns the nested course id when present', () => {
    expect(extractCreatedCourseId({ course: { id: 'c-9' } })).toBe('c-9')
  })

  it('returns null when there is no course key', () => {
    expect(extractCreatedCourseId({ other: true })).toBeNull()
  })

  it('returns null for non-object payloads', () => {
    expect(extractCreatedCourseId(null)).toBeNull()
    expect(extractCreatedCourseId('nope')).toBeNull()
  })

  it('returns null when course has no id', () => {
    expect(extractCreatedCourseId({ course: {} })).toBeNull()
  })
})

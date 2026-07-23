import { describe, expect, it } from 'vitest'
import {
  MAX_LESSONS_PER_COURSE,
  buildLessonCreateInput,
  buildLessonDialogConfig,
  buildLessonUpdateInput,
  getLessonInitialValues,
} from '../lesson-dialog/lesson-dialog.domain'

const baseInitialData = {
  lessonId: 'lesson-1',
  title: 'My Lesson',
  content: 'Some content',
  // Local wall-clock ctor so form value is stable across host timezones.
  scheduledTime: new Date(2024, 2, 15, 10, 30),
  duration: 45,
  isPublished: true,
  orderIndex: 0,
}

describe('getLessonInitialValues', () => {
  it('returns empty form data when no initialData', () => {
    expect(getLessonInitialValues(undefined, 'edit')).toEqual({
      title: '',
      content: '',
      scheduledTime: '',
      duration: 0,
      isPublished: false,
    })
  })

  it('returns empty form data when mode is create even with initialData', () => {
    expect(getLessonInitialValues(baseInitialData, 'create')).toEqual({
      title: '',
      content: '',
      scheduledTime: '',
      duration: 0,
      isPublished: false,
    })
  })

  it('maps initialData fields for edit mode', () => {
    const result = getLessonInitialValues(baseInitialData, 'edit')
    expect(result.title).toBe('My Lesson')
    expect(result.content).toBe('Some content')
    expect(result.duration).toBe(45)
    expect(result.isPublished).toBe(true)
  })

  it('formats scheduledTime as local datetime-local value when present', () => {
    const result = getLessonInitialValues(baseInitialData, 'edit')
    expect(result.scheduledTime).toBe('2024-03-15T10:30')
  })

  it('returns empty string for scheduledTime when null', () => {
    const result = getLessonInitialValues(
      { ...baseInitialData, scheduledTime: null },
      'edit',
    )
    expect(result.scheduledTime).toBe('')
  })

  it('returns empty string for content when null', () => {
    const result = getLessonInitialValues(
      { ...baseInitialData, content: null },
      'edit',
    )
    expect(result.content).toBe('')
  })

  it('returns 0 for duration when null', () => {
    const result = getLessonInitialValues(
      { ...baseInitialData, duration: null },
      'edit',
    )
    expect(result.duration).toBe(0)
  })

  it('returns false for isPublished when null', () => {
    const result = getLessonInitialValues(
      { ...baseInitialData, isPublished: null },
      'edit',
    )
    expect(result.isPublished).toBe(false)
  })
})

const baseFormValues = {
  title: 'Lesson Title',
  content: 'Some content',
  scheduledTime: '2024-03-15T10:30',
  duration: 45,
  isPublished: true,
}

describe('MAX_LESSONS_PER_COURSE', () => {
  it('is 3', () => {
    expect(MAX_LESSONS_PER_COURSE).toBe(3)
  })
})

describe('buildLessonCreateInput', () => {
  it('maps title and isPublished', () => {
    const result = buildLessonCreateInput(baseFormValues, 'course-1', 0)
    expect(result.title).toBe('Lesson Title')
    expect(result.isPublished).toBe(true)
  })

  it('includes courseId and orderIndex', () => {
    const result = buildLessonCreateInput(baseFormValues, 'course-abc', 2)
    expect(result.courseId).toBe('course-abc')
    expect(result.orderIndex).toBe(2)
  })

  it('converts scheduledTime string to Date', () => {
    const result = buildLessonCreateInput(baseFormValues, 'course-1', 0)
    expect(result.scheduledTime).toBeInstanceOf(Date)
  })

  it('sets scheduledTime to undefined when empty string', () => {
    const result = buildLessonCreateInput(
      { ...baseFormValues, scheduledTime: '' },
      'course-1',
      0,
    )
    expect(result.scheduledTime).toBeUndefined()
  })

  it('maps positive duration', () => {
    const result = buildLessonCreateInput(baseFormValues, 'course-1', 0)
    expect(result.duration).toBe(45)
  })

  it('sets duration to undefined when 0', () => {
    const result = buildLessonCreateInput(
      { ...baseFormValues, duration: 0 },
      'course-1',
      0,
    )
    expect(result.duration).toBeUndefined()
  })

  it('maps non-empty content', () => {
    const result = buildLessonCreateInput(baseFormValues, 'course-1', 0)
    expect(result.content).toBe('Some content')
  })

  it('sets content to undefined when empty string', () => {
    const result = buildLessonCreateInput(
      { ...baseFormValues, content: '' },
      'course-1',
      0,
    )
    expect(result.content).toBeUndefined()
  })
})

describe('buildLessonDialogConfig', () => {
  it('returns create labels when mode is create', () => {
    const result = buildLessonDialogConfig('create')
    expect(result.title).toBe('Create Lesson')
    expect(result.subtitle).toBe('Add a new lesson to this course')
    expect(result.submitLabel).toBe('Create Lesson')
  })

  it('returns edit labels when mode is edit', () => {
    const result = buildLessonDialogConfig('edit')
    expect(result.title).toBe('Edit Lesson')
    expect(result.subtitle).toBe('Update the lesson information')
    expect(result.submitLabel).toBe('Save Changes')
  })
})

describe('buildLessonUpdateInput', () => {
  it('includes lessonId and courseId', () => {
    const result = buildLessonUpdateInput(
      baseFormValues,
      'lesson-99',
      'course-1',
    )
    expect(result.lessonId).toBe('lesson-99')
    expect(result.courseId).toBe('course-1')
  })

  it('maps title and isPublished', () => {
    const result = buildLessonUpdateInput(
      baseFormValues,
      'lesson-1',
      'course-1',
    )
    expect(result.title).toBe('Lesson Title')
    expect(result.isPublished).toBe(true)
  })

  it('converts scheduledTime string to Date', () => {
    const result = buildLessonUpdateInput(
      baseFormValues,
      'lesson-1',
      'course-1',
    )
    expect(result.scheduledTime).toBeInstanceOf(Date)
  })

  it('sets scheduledTime to undefined when empty', () => {
    const result = buildLessonUpdateInput(
      { ...baseFormValues, scheduledTime: '' },
      'lesson-1',
      'course-1',
    )
    expect(result.scheduledTime).toBeUndefined()
  })

  it('sets duration to undefined when 0', () => {
    const result = buildLessonUpdateInput(
      { ...baseFormValues, duration: 0 },
      'lesson-1',
      'course-1',
    )
    expect(result.duration).toBeUndefined()
  })

  it('sets content to undefined when empty string', () => {
    const result = buildLessonUpdateInput(
      { ...baseFormValues, content: '' },
      'lesson-1',
      'course-1',
    )
    expect(result.content).toBeUndefined()
  })
})

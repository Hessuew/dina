import { describe, expect, it } from 'vitest'
import {
  buildCourseEditData,
  buildLessonInitialData,
  buildMediaDialogKey,
  getCourseStatus,
  handleDialogDismiss,
  isDialogModeActive,
  shouldShowMaterials,
} from './course-detail.domain'

describe('buildCourseEditData', () => {
  const baseCourse = {
    id: 'course-1',
    title: 'Algebra',
    description: 'Intro to algebra',
    thumbnailUrl: 'https://img/x.png',
    isPublished: true,
    orderIndex: 3,
  }

  it('maps a fully-populated course with two teachers', () => {
    expect(
      buildCourseEditData(baseCourse, [
        { teacher: { id: 't1' } },
        { teacher: { id: 't2' } },
      ]),
    ).toEqual({
      courseId: 'course-1',
      title: 'Algebra',
      description: 'Intro to algebra',
      thumbnailUrl: 'https://img/x.png',
      isPublished: true,
      teacher1Id: 't1',
      teacher2Id: 't2',
      orderIndex: 3,
    })
  })

  it('falls back to empty description and null teachers when absent', () => {
    expect(
      buildCourseEditData(
        {
          ...baseCourse,
          description: null,
          isPublished: null,
          orderIndex: null,
        },
        [],
      ),
    ).toEqual({
      courseId: 'course-1',
      title: 'Algebra',
      description: '',
      thumbnailUrl: 'https://img/x.png',
      isPublished: false,
      teacher1Id: null,
      teacher2Id: null,
      orderIndex: 0,
    })
  })

  it('treats a teacher entry without a teacher object as null', () => {
    const result = buildCourseEditData(baseCourse, [
      { teacher: null },
      { teacher: { id: '' } },
    ])
    expect(result.teacher1Id).toBeNull()
    expect(result.teacher2Id).toBeNull()
  })
})

describe('shouldShowMaterials', () => {
  it('is true when the viewer can edit, regardless of published state', () => {
    expect(shouldShowMaterials(true, [{ isPublished: false }])).toBe(true)
  })

  it('is true when any material is published', () => {
    expect(
      shouldShowMaterials(false, [
        { isPublished: null },
        { isPublished: true },
      ]),
    ).toBe(true)
  })

  it('is false when the viewer cannot edit and nothing is published', () => {
    expect(
      shouldShowMaterials(false, [
        { isPublished: false },
        { isPublished: null },
      ]),
    ).toBe(false)
  })

  it('is false for an empty material list when the viewer cannot edit', () => {
    expect(shouldShowMaterials(false, [])).toBe(false)
  })
})

describe('getCourseStatus', () => {
  it('is "published" when the course is published', () => {
    expect(getCourseStatus(true)).toBe('published')
  })

  it('is "draft" when not published or unknown', () => {
    expect(getCourseStatus(false)).toBe('draft')
    expect(getCourseStatus(null)).toBe('draft')
  })
})

describe('handleDialogDismiss', () => {
  it('invokes onClose when the dialog reports closed', () => {
    let closed = 0
    handleDialogDismiss(false, () => {
      closed += 1
    })
    expect(closed).toBe(1)
  })

  it('does nothing when the dialog reports open', () => {
    let closed = 0
    handleDialogDismiss(true, () => {
      closed += 1
    })
    expect(closed).toBe(0)
  })
})

describe('isDialogModeActive', () => {
  it('is true only when open and the mode matches the target', () => {
    expect(isDialogModeActive(true, 'edit', 'edit')).toBe(true)
  })

  it('is false when closed', () => {
    expect(isDialogModeActive(false, 'edit', 'edit')).toBe(false)
  })

  it('is false when the mode differs', () => {
    expect(isDialogModeActive(true, 'delete', 'edit')).toBe(false)
  })
})

describe('buildMediaDialogKey', () => {
  it('combines mode with the item id', () => {
    expect(buildMediaDialogKey('edit', { id: 'm-1' })).toBe('edit-m-1')
  })

  it('renders undefined id when there is no item', () => {
    expect(buildMediaDialogKey('create', undefined)).toBe('create-undefined')
  })
})

describe('buildLessonInitialData', () => {
  const lesson = {
    id: 'lesson-1',
    title: 'Lesson one',
    content: 'body',
    scheduledTime: null,
    duration: 30,
    isPublished: true,
    orderIndex: 0,
  }

  it('returns undefined when there is no dialog item', () => {
    expect(buildLessonInitialData(undefined)).toBeUndefined()
    expect(buildLessonInitialData(null)).toBeUndefined()
  })

  it('adds a lessonId mirroring the item id', () => {
    expect(buildLessonInitialData(lesson)).toEqual({
      ...lesson,
      lessonId: 'lesson-1',
    })
  })
})

import { describe, expect, it } from 'vitest'
import { resolveLessonActionsView } from './lesson-actions.domain'

const baseInput = {
  role: 'student' as const,
  isPublished: true,
  isCompleted: false,
  permissions: { canEdit: false, isCourseTeacher: false },
}

describe('resolveLessonActionsView', () => {
  describe('canManage', () => {
    it('is true only when canEdit and isCourseTeacher are both true', () => {
      expect(
        resolveLessonActionsView({
          ...baseInput,
          permissions: { canEdit: true, isCourseTeacher: true },
        }).canManage,
      ).toBe(true)
    })

    it('is false when canEdit is false', () => {
      expect(
        resolveLessonActionsView({
          ...baseInput,
          permissions: { canEdit: false, isCourseTeacher: true },
        }).canManage,
      ).toBe(false)
    })

    it('is false when isCourseTeacher is false', () => {
      expect(
        resolveLessonActionsView({
          ...baseInput,
          permissions: { canEdit: true, isCourseTeacher: false },
        }).canManage,
      ).toBe(false)
    })
  })

  describe('showCompletedBadge', () => {
    it('is true for a student on a published, completed lesson', () => {
      expect(
        resolveLessonActionsView({
          ...baseInput,
          isCompleted: true,
        }).showCompletedBadge,
      ).toBe(true)
    })

    it('is false when not completed', () => {
      expect(resolveLessonActionsView(baseInput).showCompletedBadge).toBe(false)
    })

    it('is false when not published', () => {
      expect(
        resolveLessonActionsView({
          ...baseInput,
          isPublished: false,
          isCompleted: true,
        }).showCompletedBadge,
      ).toBe(false)
    })

    it('is false for a non-student role', () => {
      expect(
        resolveLessonActionsView({
          ...baseInput,
          role: 'teacher',
          isCompleted: true,
        }).showCompletedBadge,
      ).toBe(false)
    })
  })

  describe('showOpenButton', () => {
    it('is true for a student on a published, not-completed lesson', () => {
      expect(resolveLessonActionsView(baseInput).showOpenButton).toBe(true)
    })

    it('is false when completed', () => {
      expect(
        resolveLessonActionsView({
          ...baseInput,
          isCompleted: true,
        }).showOpenButton,
      ).toBe(false)
    })

    it('is false when not published', () => {
      expect(
        resolveLessonActionsView({
          ...baseInput,
          isPublished: false,
        }).showOpenButton,
      ).toBe(false)
    })

    it('is false for a non-student role', () => {
      expect(
        resolveLessonActionsView({
          ...baseInput,
          role: 'admin',
        }).showOpenButton,
      ).toBe(false)
    })
  })
})

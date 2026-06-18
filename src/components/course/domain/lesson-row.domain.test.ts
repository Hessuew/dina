import { describe, expect, it } from 'vitest'
import { resolveLessonRowView } from './lesson-row.domain'

const baseInput = {
  lesson: { isPublished: true, content: 'body' },
  index: 0,
  permissions: { canEdit: false, isCourseTeacher: false },
}

describe('resolveLessonRowView', () => {
  describe('isPublished', () => {
    it('is false when lesson.isPublished is null', () => {
      expect(
        resolveLessonRowView({ ...baseInput, lesson: { isPublished: null, content: 'body' } })
          .isPublished,
      ).toBe(false)
    })

    it('is false when lesson.isPublished is false', () => {
      expect(
        resolveLessonRowView({ ...baseInput, lesson: { isPublished: false, content: 'body' } })
          .isPublished,
      ).toBe(false)
    })

    it('is true when lesson.isPublished is true', () => {
      expect(resolveLessonRowView(baseInput).isPublished).toBe(true)
    })
  })

  describe('showContent', () => {
    it('is true when the lesson is published', () => {
      expect(
        resolveLessonRowView({
          ...baseInput,
          lesson: { isPublished: true, content: 'body' },
          permissions: { canEdit: false, isCourseTeacher: false },
        }).showContent,
      ).toBe(true)
    })

    it('is true when unpublished but the viewer can edit', () => {
      expect(
        resolveLessonRowView({
          ...baseInput,
          lesson: { isPublished: false, content: 'body' },
          permissions: { canEdit: true, isCourseTeacher: false },
        }).showContent,
      ).toBe(true)
    })

    it('is false when unpublished and the viewer cannot edit', () => {
      expect(
        resolveLessonRowView({
          ...baseInput,
          lesson: { isPublished: false, content: 'body' },
          permissions: { canEdit: false, isCourseTeacher: false },
        }).showContent,
      ).toBe(false)
    })
  })

  describe('indexLabel', () => {
    it('zero-pads single-digit positions (1-based)', () => {
      expect(resolveLessonRowView({ ...baseInput, index: 0 }).indexLabel).toBe('01')
    })

    it('renders two-digit positions without padding', () => {
      expect(resolveLessonRowView({ ...baseInput, index: 9 }).indexLabel).toBe('10')
    })

    it('does not truncate three-digit positions', () => {
      expect(resolveLessonRowView({ ...baseInput, index: 99 }).indexLabel).toBe('100')
    })
  })

  describe('showStatusChip', () => {
    it('is true only when the viewer can edit and is the course teacher', () => {
      expect(
        resolveLessonRowView({
          ...baseInput,
          permissions: { canEdit: true, isCourseTeacher: true },
        }).showStatusChip,
      ).toBe(true)
    })

    it('is false when the viewer can edit but is not the course teacher', () => {
      expect(
        resolveLessonRowView({
          ...baseInput,
          permissions: { canEdit: true, isCourseTeacher: false },
        }).showStatusChip,
      ).toBe(false)
    })

    it('is false when the viewer is the course teacher but cannot edit', () => {
      expect(
        resolveLessonRowView({
          ...baseInput,
          permissions: { canEdit: false, isCourseTeacher: true },
        }).showStatusChip,
      ).toBe(false)
    })
  })

  describe('statusChipVariant', () => {
    it("is 'published' for a published lesson", () => {
      expect(
        resolveLessonRowView({ ...baseInput, lesson: { isPublished: true, content: 'body' } })
          .statusChipVariant,
      ).toBe('published')
    })

    it("is 'draft' for an unpublished lesson", () => {
      expect(
        resolveLessonRowView({ ...baseInput, lesson: { isPublished: false, content: 'body' } })
          .statusChipVariant,
      ).toBe('draft')
    })
  })

  describe('showContentText', () => {
    it('is true when content is visible and present', () => {
      expect(resolveLessonRowView(baseInput).showContentText).toBe(true)
    })

    it('is false when content is visible but empty', () => {
      expect(
        resolveLessonRowView({ ...baseInput, lesson: { isPublished: true, content: '' } })
          .showContentText,
      ).toBe(false)
    })

    it('is false when content is null', () => {
      expect(
        resolveLessonRowView({ ...baseInput, lesson: { isPublished: true, content: null } })
          .showContentText,
      ).toBe(false)
    })

    it('is false when content is present but hidden', () => {
      expect(
        resolveLessonRowView({
          ...baseInput,
          lesson: { isPublished: false, content: 'body' },
          permissions: { canEdit: false, isCourseTeacher: false },
        }).showContentText,
      ).toBe(false)
    })
  })

  describe('showMeta', () => {
    it('mirrors showContent', () => {
      expect(resolveLessonRowView(baseInput).showMeta).toBe(true)
      expect(
        resolveLessonRowView({
          ...baseInput,
          lesson: { isPublished: false, content: 'body' },
          permissions: { canEdit: false, isCourseTeacher: false },
        }).showMeta,
      ).toBe(false)
    })
  })
})

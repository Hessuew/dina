import { describe, expect, it } from 'vitest'
import {
  buildZoomLinkPayload,
  emptyZoomForm,
  getZoomLinkDialogConfig,
  getZoomLinkInitialValues,
  resolveZoomLink,
} from '../zoom-link-dialog/zoom-link-dialog.domain'
import type { ZoomLinkRow } from '@/utils/zoomLink'

const baseLink: ZoomLinkRow = {
  id: 'link-1',
  title: 'Ground Course Lecture',
  description: 'Weekly zoom',
  section: 'general_class_lecture',
  courseId: 'course-1',
  courseTitle: 'Ground Course',
  zoomUrl: 'https://zoom.us/j/123',
  meetingId: '123 456 7890',
  passcode: 'secret',
  orderIndex: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('resolveZoomLink', () => {
  it('returns null when dialogState is null', () => {
    expect(resolveZoomLink(null)).toBeNull()
  })

  it('returns null when mode is create', () => {
    expect(resolveZoomLink({ mode: 'create' })).toBeNull()
  })

  it('returns the link when mode is edit', () => {
    expect(resolveZoomLink({ mode: 'edit', link: baseLink })).toBe(baseLink)
  })
})

describe('getZoomLinkDialogConfig', () => {
  it('returns edit labels when isEdit is true', () => {
    const config = getZoomLinkDialogConfig(true)
    expect(config.subtitle).toBe('Edit meeting details')
    expect(config.title).toBe('Edit Zoom Link')
  })

  it('returns create labels when isEdit is false', () => {
    const config = getZoomLinkDialogConfig(false)
    expect(config.subtitle).toBe('New meeting details')
    expect(config.title).toBe('Add Zoom Link')
  })
})

describe('getZoomLinkInitialValues', () => {
  it('returns empty form when dialogState is null', () => {
    expect(getZoomLinkInitialValues(null)).toEqual(emptyZoomForm)
  })

  it('returns empty form when mode is create', () => {
    expect(getZoomLinkInitialValues({ mode: 'create' })).toEqual(emptyZoomForm)
  })

  it('maps link fields when mode is edit', () => {
    const result = getZoomLinkInitialValues({ mode: 'edit', link: baseLink })
    expect(result.title).toBe('Ground Course Lecture')
    expect(result.zoomUrl).toBe('https://zoom.us/j/123')
    expect(result.meetingId).toBe('123 456 7890')
    expect(result.passcode).toBe('secret')
    expect(result.orderIndex).toBe(1)
    expect(result.section).toBe('general_class_lecture')
  })

  it('maps courseId from link', () => {
    const result = getZoomLinkInitialValues({ mode: 'edit', link: baseLink })
    expect(result.courseId).toBe('course-1')
  })

  it('falls back to "none" when courseId is null', () => {
    const result = getZoomLinkInitialValues({
      mode: 'edit',
      link: { ...baseLink, courseId: null },
    })
    expect(result.courseId).toBe('none')
  })

  it('maps description from link', () => {
    const result = getZoomLinkInitialValues({ mode: 'edit', link: baseLink })
    expect(result.description).toBe('Weekly zoom')
  })

  it('falls back to empty string when description is null', () => {
    const result = getZoomLinkInitialValues({
      mode: 'edit',
      link: { ...baseLink, description: null },
    })
    expect(result.description).toBe('')
  })

  it('returns a new object (not a reference to emptyZoomForm)', () => {
    const a = getZoomLinkInitialValues(null)
    const b = getZoomLinkInitialValues(null)
    expect(a).not.toBe(b)
  })
})

const baseFormData = {
  title: 'Ground Lecture',
  description: 'Weekly session',
  section: 'general_class_lecture',
  courseId: 'course-1',
  zoomUrl: 'https://zoom.us/j/456',
  meetingId: '456 789 0123',
  passcode: 'pass',
  orderIndex: 2,
}

describe('buildZoomLinkPayload', () => {
  it('passes title, zoomUrl, meetingId, passcode through', () => {
    const payload = buildZoomLinkPayload(baseFormData)
    expect(payload.title).toBe('Ground Lecture')
    expect(payload.zoomUrl).toBe('https://zoom.us/j/456')
    expect(payload.meetingId).toBe('456 789 0123')
    expect(payload.passcode).toBe('pass')
  })

  it('passes non-empty description through', () => {
    const payload = buildZoomLinkPayload(baseFormData)
    expect(payload.description).toBe('Weekly session')
  })

  it('sets description to undefined when empty', () => {
    const payload = buildZoomLinkPayload({ ...baseFormData, description: '' })
    expect(payload.description).toBeUndefined()
  })

  it('passes courseId through when not "none"', () => {
    const payload = buildZoomLinkPayload(baseFormData)
    expect(payload.courseId).toBe('course-1')
  })

  it('sets courseId to undefined when "none"', () => {
    const payload = buildZoomLinkPayload({ ...baseFormData, courseId: 'none' })
    expect(payload.courseId).toBeUndefined()
  })

  it('passes finite orderIndex through', () => {
    const payload = buildZoomLinkPayload(baseFormData)
    expect(payload.orderIndex).toBe(2)
  })

  it('sets orderIndex to undefined when NaN', () => {
    const payload = buildZoomLinkPayload({ ...baseFormData, orderIndex: NaN })
    expect(payload.orderIndex).toBeUndefined()
  })

  it('casts section to ZoomLinkSection', () => {
    const payload = buildZoomLinkPayload(baseFormData)
    expect(payload.section).toBe('general_class_lecture')
  })
})

import { describe, expect, it } from 'vitest'
import {
  buildZoomLinkPayload,
  emptyZoomForm,
  getZoomLinkDialogConfig,
  getZoomLinkInitialValues,
  resolveZoomLink,
} from './zoom-link-dialog.domain'
import type { ZoomLinkRow } from '@/utils/zoomLink'

const teacherId = '11111111-1111-4111-8111-111111111111'
const baseLink: ZoomLinkRow = {
  id: 'link-1',
  title: 'Teacher Session',
  description: 'Weekly zoom',
  section: 'teacher',
  teacherId,
  teacherName: 'Teacher One',
  zoomUrl: 'https://zoom.us/j/123',
  meetingId: '123 456 7890',
  passcode: 'secret',
  orderIndex: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('resolveZoomLink', () => {
  it('returns null without an edit link', () => {
    expect(resolveZoomLink(null)).toBeNull()
    expect(resolveZoomLink({ mode: 'create' })).toBeNull()
  })

  it('returns the edit link', () => {
    expect(resolveZoomLink({ mode: 'edit', link: baseLink })).toBe(baseLink)
  })
})

describe('getZoomLinkDialogConfig', () => {
  it('returns edit labels', () => {
    expect(getZoomLinkDialogConfig(true)).toEqual({
      subtitle: 'Edit meeting details',
      title: 'Edit Zoom Link',
    })
  })

  it('returns create labels', () => {
    expect(getZoomLinkDialogConfig(false)).toEqual({
      subtitle: 'New meeting details',
      title: 'Add Zoom Link',
    })
  })
})

describe('getZoomLinkInitialValues', () => {
  it('returns fresh empty forms for create states', () => {
    const first = getZoomLinkInitialValues(null)
    expect(first).toEqual(emptyZoomForm)
    expect(getZoomLinkInitialValues({ mode: 'create' })).toEqual(emptyZoomForm)
    expect(first).not.toBe(getZoomLinkInitialValues(null))
  })

  it('maps an owned link', () => {
    expect(getZoomLinkInitialValues({ mode: 'edit', link: baseLink })).toEqual({
      title: 'Teacher Session',
      description: 'Weekly zoom',
      section: 'teacher',
      teacherId,
      zoomUrl: 'https://zoom.us/j/123',
      meetingId: '123 456 7890',
      passcode: 'secret',
      orderIndex: 1,
    })
  })

  it('uses empty display defaults for nullable values', () => {
    const values = getZoomLinkInitialValues({
      mode: 'edit',
      link: { ...baseLink, teacherId: null, description: null },
    })
    expect(values.teacherId).toBe('none')
    expect(values.description).toBe('')
  })
})

const baseFormData = {
  title: 'Ground Lecture',
  description: 'Weekly session',
  section: 'general_class_lecture',
  teacherId: 'none',
  zoomUrl: 'https://zoom.us/j/456',
  meetingId: '456 789 0123',
  passcode: 'pass',
  orderIndex: 2,
}

describe('buildZoomLinkPayload', () => {
  it('builds a general payload without teacher ownership', () => {
    expect(buildZoomLinkPayload(baseFormData)).toEqual({
      title: 'Ground Lecture',
      description: 'Weekly session',
      section: 'general_class_lecture',
      zoomUrl: 'https://zoom.us/j/456',
      meetingId: '456 789 0123',
      passcode: 'pass',
      orderIndex: 2,
    })
  })

  it('builds a teacher-owned payload', () => {
    expect(
      buildZoomLinkPayload({
        ...baseFormData,
        section: 'teacher',
        teacherId,
      }),
    ).toMatchObject({ section: 'teacher', teacherId })
  })

  it('normalizes empty optional values', () => {
    const payload = buildZoomLinkPayload({
      ...baseFormData,
      description: '',
      orderIndex: Number.NaN,
    })
    expect(payload.description).toBeUndefined()
    expect(payload.orderIndex).toBeUndefined()
  })
})

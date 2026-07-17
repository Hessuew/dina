import { describe, expect, it } from 'vitest'
import { createZoomLinkSchema } from './zoomLink.schema'

const teacherId = '11111111-1111-4111-8111-111111111111'
const base = {
  title: 'Meeting',
  zoomUrl: 'https://zoom.us/j/123',
  meetingId: '123',
  passcode: 'secret',
}

describe('createZoomLinkSchema', () => {
  it('accepts a general link without an owner', () => {
    expect(
      createZoomLinkSchema.safeParse({
        ...base,
        section: 'general_class_lecture',
      }).success,
    ).toBe(true)
  })

  it('rejects a general link with teacher ownership', () => {
    expect(
      createZoomLinkSchema.safeParse({
        ...base,
        section: 'general_class_lecture',
        teacherId,
      }).success,
    ).toBe(false)
  })

  it('accepts a teacher link with a valid owner', () => {
    expect(
      createZoomLinkSchema.safeParse({
        ...base,
        section: 'teacher',
        teacherId,
      }).success,
    ).toBe(true)
  })

  it('rejects a teacher link without an owner', () => {
    expect(
      createZoomLinkSchema.safeParse({ ...base, section: 'teacher' }).success,
    ).toBe(false)
  })
})

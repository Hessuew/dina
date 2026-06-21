import { describe, expect, it } from 'vitest'
import { buildEventValues } from './event-input.domain'

const start = new Date('2026-01-01T10:00:00.000Z')
const end = new Date('2026-01-01T11:00:00.000Z')

describe('buildEventValues', () => {
  it('passes required fields through unchanged', () => {
    const values = buildEventValues({
      title: 'Exam',
      startTime: start,
      endTime: end,
    })
    expect(values.title).toBe('Exam')
    expect(values.startTime).toBe(start)
    expect(values.endTime).toBe(end)
  })

  it('normalizes every omitted optional to null', () => {
    const values = buildEventValues({
      title: 'Exam',
      startTime: start,
      endTime: end,
    })
    expect(values).toEqual({
      title: 'Exam',
      description: null,
      startTime: start,
      endTime: end,
      location: null,
      zoomLink: null,
      category: null,
      courseId: null,
    })
  })

  it('preserves provided optional fields', () => {
    const values = buildEventValues({
      title: 'Chapel',
      description: 'Weekly chapel',
      startTime: start,
      endTime: end,
      location: 'Hall A',
      zoomLink: 'https://zoom.test/abc',
      category: 'chapel',
      courseId: '11111111-1111-1111-1111-111111111111',
    })
    expect(values).toEqual({
      title: 'Chapel',
      description: 'Weekly chapel',
      startTime: start,
      endTime: end,
      location: 'Hall A',
      zoomLink: 'https://zoom.test/abc',
      category: 'chapel',
      courseId: '11111111-1111-1111-1111-111111111111',
    })
  })

  it('treats explicit null the same as omitted', () => {
    const values = buildEventValues({
      title: 'Personal',
      description: null,
      startTime: start,
      endTime: end,
      location: null,
      zoomLink: null,
      category: null,
      courseId: null,
    })
    expect(values.description).toBeNull()
    expect(values.location).toBeNull()
    expect(values.zoomLink).toBeNull()
    expect(values.category).toBeNull()
    expect(values.courseId).toBeNull()
  })
})

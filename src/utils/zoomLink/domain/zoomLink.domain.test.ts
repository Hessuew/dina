import { describe, expect, it } from 'vitest'
import {
  buildCreateZoomLinkValues,
  buildUpdateZoomLinkValues,
  buildZoomLinksPayload,
} from './zoomLink.domain'
import type { ZoomLinkRow } from './zoomLink.domain'
import type {
  CreateZoomLinkInput,
  UpdateZoomLinkInput,
} from '@/schemas/zoomLink.schema'

const makeZoomLinkRow = (
  overrides: Partial<ZoomLinkRow> = {},
): ZoomLinkRow => ({
  id: 'z-1',
  title: 'Lecture',
  description: 'A lecture',
  section: 'general_class_lecture',
  courseId: 'c-1',
  courseTitle: 'Course 1',
  zoomUrl: 'https://zoom.us/j/123',
  meetingId: '123',
  passcode: 'pass',
  orderIndex: 0,
  createdAt: new Date('2024-06-01T10:00:00Z'),
  updatedAt: new Date('2024-06-01T10:00:00Z'),
  ...overrides,
})

const makeCreateInput = (
  overrides: Partial<CreateZoomLinkInput> = {},
): CreateZoomLinkInput => ({
  title: 'Lecture',
  description: 'A lecture',
  section: 'general_class_lecture',
  courseId: 'c-1',
  zoomUrl: 'https://zoom.us/j/123',
  meetingId: '123',
  passcode: 'pass',
  orderIndex: 2,
  ...overrides,
})

const makeUpdateInput = (
  overrides: Partial<UpdateZoomLinkInput> = {},
): UpdateZoomLinkInput => ({
  zoomLinkId: 'z-1',
  ...makeCreateInput(overrides),
  ...overrides,
})

describe('buildZoomLinksPayload', () => {
  it('returns empty links when rows are empty', () => {
    const payload = buildZoomLinksPayload([], [], 'student')
    expect(payload.links).toEqual([])
  })

  it('keeps a non-null courseTitle as-is', () => {
    const [link] = buildZoomLinksPayload(
      [makeZoomLinkRow({ courseTitle: 'Course 1' })],
      [],
      'admin',
    ).links
    expect(link.courseTitle).toBe('Course 1')
  })

  it('maps a null courseTitle to null', () => {
    const [link] = buildZoomLinksPayload(
      [makeZoomLinkRow({ courseTitle: null })],
      [],
      'admin',
    ).links
    expect(link.courseTitle).toBeNull()
  })

  it('passes through courses and role', () => {
    const courses = [{ id: 'c-1', title: 'Course 1' }]
    const payload = buildZoomLinksPayload([], courses, 'teacher')
    expect(payload.courses).toEqual(courses)
    expect(payload.role).toBe('teacher')
  })
})

describe('buildCreateZoomLinkValues', () => {
  it('passes provided values through', () => {
    const values = buildCreateZoomLinkValues(makeCreateInput())
    expect(values).toEqual({
      title: 'Lecture',
      description: 'A lecture',
      section: 'general_class_lecture',
      courseId: 'c-1',
      zoomUrl: 'https://zoom.us/j/123',
      meetingId: '123',
      passcode: 'pass',
      orderIndex: 2,
    })
  })

  it('normalizes empty description and courseId to null', () => {
    const values = buildCreateZoomLinkValues(
      makeCreateInput({ description: '', courseId: '' }),
    )
    expect(values.description).toBeNull()
    expect(values.courseId).toBeNull()
  })

  it('defaults a missing orderIndex to 0', () => {
    const values = buildCreateZoomLinkValues(
      makeCreateInput({ orderIndex: undefined }),
    )
    expect(values.orderIndex).toBe(0)
  })

  it('keeps an explicit orderIndex of 0', () => {
    const values = buildCreateZoomLinkValues(makeCreateInput({ orderIndex: 0 }))
    expect(values.orderIndex).toBe(0)
  })
})

describe('buildUpdateZoomLinkValues', () => {
  const now = new Date('2024-07-01T00:00:00Z')

  it('passes provided values through and sets updatedAt to now', () => {
    const values = buildUpdateZoomLinkValues(makeUpdateInput(), now)
    expect(values).toEqual({
      title: 'Lecture',
      description: 'A lecture',
      section: 'general_class_lecture',
      courseId: 'c-1',
      zoomUrl: 'https://zoom.us/j/123',
      meetingId: '123',
      passcode: 'pass',
      orderIndex: 2,
      updatedAt: now,
    })
  })

  it('normalizes empty description and courseId to null', () => {
    const values = buildUpdateZoomLinkValues(
      makeUpdateInput({ description: '', courseId: '' }),
      now,
    )
    expect(values.description).toBeNull()
    expect(values.courseId).toBeNull()
  })

  it('defaults a missing orderIndex to 0', () => {
    const values = buildUpdateZoomLinkValues(
      makeUpdateInput({ orderIndex: undefined }),
      now,
    )
    expect(values.orderIndex).toBe(0)
  })
})

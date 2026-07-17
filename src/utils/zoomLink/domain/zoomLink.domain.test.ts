import { describe, expect, it } from 'vitest'
import {
  buildCreateZoomLinkValues,
  buildUpdateZoomLinkValues,
  buildZoomLinksPayload,
  filterVisibleZoomLinks,
  groupTeacherZoomLinks,
  orderZoomLinks,
} from './zoomLink.domain'
import type { ZoomLinkRow, ZoomTeacherOption } from './zoomLink.domain'
import type {
  CreateZoomLinkInput,
  UpdateZoomLinkInput,
} from '@/schemas/zoomLink.schema'

const teacherId = '11111111-1111-4111-8111-111111111111'

const makeZoomLinkRow = (
  overrides: Partial<ZoomLinkRow> = {},
): ZoomLinkRow => ({
  id: 'z-1',
  title: 'Lecture',
  description: 'A lecture',
  section: 'general_class_lecture',
  teacherId: null,
  teacherName: null,
  zoomUrl: 'https://zoom.us/j/123',
  meetingId: '123',
  passcode: 'pass',
  orderIndex: 0,
  createdAt: new Date('2024-06-01T10:00:00Z'),
  updatedAt: new Date('2024-06-01T10:00:00Z'),
  ...overrides,
})

const makeGeneralInput = (
  overrides: Partial<CreateZoomLinkInput> = {},
): CreateZoomLinkInput =>
  ({
    title: 'Lecture',
    description: 'A lecture',
    section: 'general_class_lecture',
    zoomUrl: 'https://zoom.us/j/123',
    meetingId: '123',
    passcode: 'pass',
    orderIndex: 2,
    ...overrides,
  }) as CreateZoomLinkInput

const makeUpdateInput = (
  overrides: Partial<UpdateZoomLinkInput> = {},
): UpdateZoomLinkInput =>
  ({
    zoomLinkId: '11111111-1111-4111-8111-111111111112',
    ...makeGeneralInput(),
    ...overrides,
  }) as UpdateZoomLinkInput

const teacherOrder: Array<ZoomTeacherOption> = [
  { id: 'teacher-b', fullName: 'Teacher B' },
  { id: 'teacher-a', fullName: 'Teacher A' },
]

describe('filterVisibleZoomLinks', () => {
  const general = makeZoomLinkRow({ id: 'general' })
  const assigned = makeZoomLinkRow({
    id: 'assigned',
    section: 'teacher',
    teacherId: 'teacher-a',
  })
  const foreign = makeZoomLinkRow({
    id: 'foreign',
    section: 'teacher',
    teacherId: 'teacher-b',
  })
  const rows = [general, assigned, foreign]

  it.each(['teacher', 'admin'] as const)('returns all links for %s', (role) => {
    expect(filterVisibleZoomLinks(rows, role, null)).toEqual(rows)
  })

  it('returns general plus assigned-teacher links for a student', () => {
    expect(filterVisibleZoomLinks(rows, 'student', 'teacher-a')).toEqual([
      general,
      assigned,
    ])
  })

  it('returns only general links for an unassigned student', () => {
    expect(filterVisibleZoomLinks(rows, 'student', null)).toEqual([general])
  })
})

describe('groupTeacherZoomLinks', () => {
  it('groups populated teacher links in first-seen order', () => {
    const groups = groupTeacherZoomLinks([
      makeZoomLinkRow({
        id: 'a1',
        section: 'teacher',
        teacherId: 'teacher-a',
        teacherName: 'Teacher A',
      }),
      makeZoomLinkRow({
        id: 'b1',
        section: 'teacher',
        teacherId: 'teacher-b',
        teacherName: 'Teacher B',
      }),
      makeZoomLinkRow({
        id: 'a2',
        section: 'teacher',
        teacherId: 'teacher-a',
        teacherName: 'Teacher A',
      }),
    ])
    expect(groups.map((group) => group.teacherId)).toEqual([
      'teacher-a',
      'teacher-b',
    ])
    expect(groups[0].links.map((link) => link.id)).toEqual(['a1', 'a2'])
  })

  it('omits general and incomplete teacher rows', () => {
    expect(
      groupTeacherZoomLinks([
        makeZoomLinkRow(),
        makeZoomLinkRow({ section: 'teacher', teacherId: null }),
        makeZoomLinkRow({
          section: 'teacher',
          teacherId: 'teacher-a',
          teacherName: null,
        }),
      ]),
    ).toEqual([])
  })
})

describe('orderZoomLinks', () => {
  it('orders general links first by orderIndex then title', () => {
    const rows = [
      makeZoomLinkRow({ id: 'b', title: 'B', orderIndex: 1 }),
      makeZoomLinkRow({ id: 'c', title: 'C', orderIndex: 0 }),
      makeZoomLinkRow({ id: 'a', title: 'A', orderIndex: 1 }),
    ]
    expect(orderZoomLinks(rows, []).map((row) => row.id)).toEqual([
      'c',
      'a',
      'b',
    ])
  })

  it('orders teacher groups by supplied owner order and links within each group', () => {
    const rows = [
      makeZoomLinkRow({ id: 'general' }),
      makeZoomLinkRow({
        id: 'a',
        section: 'teacher',
        teacherId: 'teacher-a',
        orderIndex: 0,
      }),
      makeZoomLinkRow({
        id: 'b2',
        section: 'teacher',
        teacherId: 'teacher-b',
        title: 'Z',
        orderIndex: 1,
      }),
      makeZoomLinkRow({
        id: 'b1',
        section: 'teacher',
        teacherId: 'teacher-b',
        title: 'A',
        orderIndex: 1,
      }),
    ]
    expect(orderZoomLinks(rows, teacherOrder).map((row) => row.id)).toEqual([
      'general',
      'b1',
      'b2',
      'a',
    ])
    expect(
      orderZoomLinks([...rows].reverse(), teacherOrder).map((row) => row.id),
    ).toEqual(['general', 'b1', 'b2', 'a'])
  })

  it('places an unknown teacher after ordered teachers', () => {
    const rows = [
      makeZoomLinkRow({
        id: 'unknown',
        section: 'teacher',
        teacherId: 'unknown',
      }),
      makeZoomLinkRow({
        id: 'known',
        section: 'teacher',
        teacherId: 'teacher-b',
      }),
    ]
    expect(orderZoomLinks(rows, teacherOrder).map((row) => row.id)).toEqual([
      'known',
      'unknown',
    ])
    expect(
      orderZoomLinks([...rows].reverse(), teacherOrder).map((row) => row.id),
    ).toEqual(['known', 'unknown'])
  })
})

describe('buildZoomLinksPayload', () => {
  it('filters student links and does not return teacher editing options', () => {
    const payload = buildZoomLinksPayload(
      [
        makeZoomLinkRow({ id: 'general' }),
        makeZoomLinkRow({ id: 'owned', section: 'teacher', teacherId }),
        makeZoomLinkRow({
          id: 'foreign',
          section: 'teacher',
          teacherId: 'other',
        }),
      ],
      teacherOrder,
      'student',
      teacherId,
    )
    expect(payload.links.map((link) => link.id)).toEqual(['general', 'owned'])
    expect(payload.teachers).toEqual([])
    expect(payload.role).toBe('student')
  })

  it('returns ordered teacher options only to admins', () => {
    expect(
      buildZoomLinksPayload([], teacherOrder, 'admin', null).teachers,
    ).toEqual(teacherOrder)
    expect(
      buildZoomLinksPayload([], teacherOrder, 'teacher', null).teachers,
    ).toEqual([])
  })
})

describe('buildCreateZoomLinkValues', () => {
  it('normalizes a general link and removes teacher ownership', () => {
    expect(buildCreateZoomLinkValues(makeGeneralInput())).toEqual({
      title: 'Lecture',
      description: 'A lecture',
      section: 'general_class_lecture',
      teacherId: null,
      zoomUrl: 'https://zoom.us/j/123',
      meetingId: '123',
      passcode: 'pass',
      orderIndex: 2,
    })
  })

  it('keeps ownership for a teacher link', () => {
    const input: CreateZoomLinkInput = {
      ...makeGeneralInput(),
      section: 'teacher',
      teacherId,
    }
    expect(buildCreateZoomLinkValues(input).teacherId).toBe(teacherId)
  })

  it('normalizes empty description and defaults missing orderIndex', () => {
    const values = buildCreateZoomLinkValues(
      makeGeneralInput({ description: '', orderIndex: undefined }),
    )
    expect(values.description).toBeNull()
    expect(values.orderIndex).toBe(0)
  })

  it('keeps an explicit orderIndex of zero', () => {
    expect(
      buildCreateZoomLinkValues(makeGeneralInput({ orderIndex: 0 })).orderIndex,
    ).toBe(0)
  })
})

describe('buildUpdateZoomLinkValues', () => {
  const now = new Date('2024-07-01T00:00:00Z')

  it('maps values and injects updatedAt', () => {
    expect(buildUpdateZoomLinkValues(makeUpdateInput(), now)).toEqual({
      title: 'Lecture',
      description: 'A lecture',
      section: 'general_class_lecture',
      teacherId: null,
      zoomUrl: 'https://zoom.us/j/123',
      meetingId: '123',
      passcode: 'pass',
      orderIndex: 2,
      updatedAt: now,
    })
  })

  it('keeps teacher ownership', () => {
    const input = makeUpdateInput({ section: 'teacher', teacherId })
    expect(buildUpdateZoomLinkValues(input, now).teacherId).toBe(teacherId)
  })

  it('normalizes empty description and defaults missing orderIndex', () => {
    const values = buildUpdateZoomLinkValues(
      makeUpdateInput({ description: '', orderIndex: undefined }),
      now,
    )
    expect(values.description).toBeNull()
    expect(values.orderIndex).toBe(0)
  })
})

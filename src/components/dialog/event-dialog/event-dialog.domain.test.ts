import { describe, expect, it } from 'vitest'
import {
  buildEventViewModel,
  getEventDefaultValues,
} from './event-dialog.domain'
import type { CalendarEventRow } from '@/utils/event/events'

function makeEvent(
  overrides: Partial<CalendarEventRow> = {},
): CalendarEventRow {
  return {
    id: 'e1',
    title: 'Chapel Service',
    description: 'Weekly chapel',
    // Local wall-clock ctors so form values are stable across host timezones.
    startTime: new Date(2026, 5, 19, 10, 0),
    endTime: new Date(2026, 5, 19, 11, 0),
    location: 'Main Hall',
    zoomLink: 'https://zoom.us/j/123',
    category: 'chapel',
    courseId: 'c1',
    courseName: 'Theology 101',
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    ...overrides,
  }
}

describe('getEventDefaultValues', () => {
  it('maps an event to form values in edit mode', () => {
    const values = getEventDefaultValues('edit', makeEvent())
    expect(values).toEqual({
      title: 'Chapel Service',
      description: 'Weekly chapel',
      startTime: '2026-06-19T10:00',
      endTime: '2026-06-19T11:00',
      location: 'Main Hall',
      zoomLink: 'https://zoom.us/j/123',
      category: 'chapel',
    })
  })

  it('maps an event to form values in view mode', () => {
    const values = getEventDefaultValues('view', makeEvent())
    expect(values.title).toBe('Chapel Service')
    expect(values.startTime).toBe('2026-06-19T10:00')
  })

  it('coalesces nullable fields to empty strings', () => {
    const values = getEventDefaultValues(
      'edit',
      makeEvent({
        description: null,
        location: null,
        zoomLink: null,
        category: null,
      }),
    )
    expect(values.description).toBe('')
    expect(values.location).toBe('')
    expect(values.zoomLink).toBe('')
    expect(values.category).toBe('')
  })

  it('returns blank values for create mode', () => {
    expect(getEventDefaultValues('create')).toEqual({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      location: '',
      zoomLink: '',
      category: '',
    })
  })

  it('returns blank values for edit/view mode when no event is provided', () => {
    expect(getEventDefaultValues('edit')).toEqual(
      getEventDefaultValues('create'),
    )
    expect(getEventDefaultValues('view')).toEqual(
      getEventDefaultValues('create'),
    )
  })

  it('returns blank values for delete mode even with an event', () => {
    expect(getEventDefaultValues('delete', makeEvent())).toEqual(
      getEventDefaultValues('create'),
    )
  })
})

describe('buildEventViewModel', () => {
  it('derives the category display for a known category', () => {
    const vm = buildEventViewModel(makeEvent({ category: 'exam' }))
    expect(vm.category).toEqual({
      iconKey: 'exam',
      label: 'Exam',
      chipClass: expect.stringContaining('red'),
    })
  })

  it('returns a null category when the event has none', () => {
    expect(
      buildEventViewModel(makeEvent({ category: null })).category,
    ).toBeNull()
  })

  it('coalesces a missing course name to null', () => {
    expect(
      buildEventViewModel(makeEvent({ courseName: null })).courseName,
    ).toBeNull()
  })

  it('coalesces a missing description to null', () => {
    expect(
      buildEventViewModel(makeEvent({ description: null })).description,
    ).toBeNull()
  })

  it('always includes a date and time row', () => {
    const vm = buildEventViewModel(
      makeEvent({ location: null, zoomLink: null }),
    )
    expect(vm.detailRows.map((r) => r.iconKey)).toEqual(['calendar', 'clock'])
    expect(vm.detailRows[0].text).toContain('2026')
    expect(vm.detailRows[0].href).toBeNull()
    expect(vm.detailRows[1].text).toContain('–')
  })

  it('adds a location row when a location is present', () => {
    const vm = buildEventViewModel(makeEvent({ zoomLink: null }))
    const locationRow = vm.detailRows.find((r) => r.iconKey === 'mappin')
    expect(locationRow).toEqual({
      iconKey: 'mappin',
      text: 'Main Hall',
      href: null,
    })
  })

  it('adds a zoom row carrying the link as an href', () => {
    const vm = buildEventViewModel(makeEvent({ location: null }))
    const zoomRow = vm.detailRows.find((r) => r.iconKey === 'video')
    expect(zoomRow).toEqual({
      iconKey: 'video',
      text: 'https://zoom.us/j/123',
      href: 'https://zoom.us/j/123',
    })
  })
})

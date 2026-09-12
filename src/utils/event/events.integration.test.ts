import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createEventService,
  deleteEventService,
  getEventsService,
  updateEventService,
} from './service/event.service'
import * as database from '@/db'
import { AuthorizationError } from '@/utils/errors'
import {
  seedCalendarEvent,
  seedCourse,
  seedProfile,
} from '@/../test/integration/seed'
import { withObservabilityRequest } from '@/utils/observability/request-context'

describe('calendar event mutation telemetry (integration)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps event listing restricted to teachers and admins', async () => {
    const studentId = await seedProfile({ role: 'student' })
    const teacherId = await seedProfile({ role: 'teacher' })
    const adminId = await seedProfile({ role: 'admin' })
    const eventId = await seedCalendarEvent({ title: 'Private event' })

    await expect(getEventsService(studentId)).rejects.toBeInstanceOf(
      AuthorizationError,
    )
    await expect(getEventsService(teacherId)).resolves.toEqual({
      events: [
        expect.objectContaining({ id: eventId, title: 'Private event' }),
      ],
    })
    await expect(getEventsService(adminId)).resolves.toEqual({
      events: [
        expect.objectContaining({ id: eventId, title: 'Private event' }),
      ],
    })
  })

  it('logs redacted event-list read telemetry', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const actorId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    await seedCalendarEvent({
      title: 'Private event title',
      description: 'Private event description',
      courseId,
    })

    await withObservabilityRequest(
      new Request('https://christ-dina.org/events', {
        headers: { 'x-request-id': 'calendar-event-list-read' },
      }),
      () => getEventsService(actorId),
    )

    const lines = infoSpy.mock.calls.map(([line]) => String(line))
    const event = JSON.parse(lines.at(-1) as string)
    expect(event).toMatchObject({
      event: 'calendar_event_list_loaded',
      path: 'serverFn:getEvents',
      requestId: 'calendar-event-list-read',
      actorId,
      eventCount: 1,
      linkedEventCount: 1,
      status: 'success',
      durationMs: expect.any(Number),
    })
    expect(lines.join('\n')).not.toContain('Private event title')
    expect(lines.join('\n')).not.toContain('Private event description')
  })

  it('logs stable persistence failures without raw database errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const actorId = await seedProfile({ role: 'teacher' })
    const realDb = await database.getDb()
    const repositoryError = new Error('calendar event database secret')
    vi.spyOn(database, 'getDb')
      .mockResolvedValueOnce(realDb)
      .mockRejectedValueOnce(repositoryError)

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org/events', {
          headers: { 'x-request-id': 'calendar-event-list-failure' },
        }),
        () => getEventsService(actorId),
      ),
    ).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(JSON.parse(line)).toMatchObject({
      event: 'calendar_event_list_load_failed',
      path: 'serverFn:getEvents',
      requestId: 'calendar-event-list-failure',
      actorId,
      status: 'failure',
      errorCategory: 'calendar_event_read_persistence',
      durationMs: expect.any(Number),
    })
    expect(line).not.toContain('calendar event database secret')
  })

  it('keeps event mutations restricted to teachers and admins', async () => {
    const studentId = await seedProfile({ role: 'student' })
    const eventId = await seedCalendarEvent({ title: 'Protected event' })

    await expect(
      createEventService(
        {
          title: 'Student event',
          startTime: new Date('2026-09-11T09:00:00Z'),
        },
        studentId,
      ),
    ).rejects.toBeInstanceOf(AuthorizationError)
    await expect(
      updateEventService(
        {
          eventId,
          title: 'Student update',
          startTime: new Date('2026-09-11T10:00:00Z'),
        },
        studentId,
      ),
    ).rejects.toBeInstanceOf(AuthorizationError)
    await expect(
      deleteEventService({ eventId }, studentId),
    ).rejects.toBeInstanceOf(AuthorizationError)
  })

  it('logs redacted create, update, and delete outcomes', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const actorId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    const created = await createEventService(
      {
        title: 'Private title',
        description: 'Private description',
        startTime: new Date('2026-09-11T09:00:00Z'),
        location: 'Private location',
        zoomLink: 'https://private.test/meeting',
        category: 'exam',
        courseId,
      },
      actorId,
    )
    await updateEventService(
      {
        eventId: created.event.id,
        title: 'Updated private title',
        startTime: new Date('2026-09-11T10:00:00Z'),
        category: 'chapel',
        courseId,
      },
      actorId,
    )
    await deleteEventService({ eventId: created.event.id }, actorId)

    const lines = infoSpy.mock.calls.map(([line]) => String(line))
    const events = lines.map((line) => JSON.parse(line))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'calendar_event_created',
          actorId,
          eventId: created.event.id,
          category: 'exam',
          courseId,
          status: 'success',
        }),
        expect.objectContaining({
          event: 'calendar_event_updated',
          actorId,
          eventId: created.event.id,
          category: 'chapel',
          status: 'success',
        }),
        expect.objectContaining({
          event: 'calendar_event_deleted',
          actorId,
          eventId: created.event.id,
          status: 'success',
        }),
      ]),
    )
    expect(events.every((event) => typeof event.durationMs === 'number')).toBe(
      true,
    )
    expect(lines.join('\n')).not.toContain('Private title')
    expect(lines.join('\n')).not.toContain('Private description')
    expect(lines.join('\n')).not.toContain('Private location')
    expect(lines.join('\n')).not.toContain('private.test')
  })

  it('does not log an update event when the target is missing', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const actorId = await seedProfile({ role: 'teacher' })

    await updateEventService(
      {
        eventId: randomUUID(),
        title: 'Missing',
        startTime: new Date('2026-09-11T10:00:00Z'),
      },
      actorId,
    )

    expect(
      infoSpy.mock.calls
        .map(([line]) => JSON.parse(String(line)))
        .some((event) => event.event === 'calendar_event_updated'),
    ).toBe(false)
  })
})

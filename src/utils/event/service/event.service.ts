import { asc, eq } from 'drizzle-orm'
import type {
  CreateEventInput,
  DeleteEventInput,
  UpdateEventInput,
} from '@/schemas/event.schema'
import type { LogLevel } from '@/utils/observability/logger'
import { getDb } from '@/db'
import { calendarEvents, courses } from '@/db/schema'
import { buildEventValues } from '@/utils/event/domain/event-input.domain'
import { resolveAdminOrTeacherAccess } from '@/utils/authz'
import { AuthorizationError } from '@/utils/errors'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'

async function requireEventManager(actorId: string): Promise<void> {
  const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(actorId)
  if (!isAdmin && !isTeacher) {
    throw new AuthorizationError('Teacher access required')
  }
}

export async function getEventsService(actorId: string) {
  await requireEventManager(actorId)

  const db = await getDb()
  const rows = await db
    .select({
      id: calendarEvents.id,
      title: calendarEvents.title,
      description: calendarEvents.description,
      startTime: calendarEvents.startTime,
      endTime: calendarEvents.endTime,
      location: calendarEvents.location,
      zoomLink: calendarEvents.zoomLink,
      category: calendarEvents.category,
      courseId: calendarEvents.courseId,
      courseName: courses.title,
      createdAt: calendarEvents.createdAt,
      updatedAt: calendarEvents.updatedAt,
    })
    .from(calendarEvents)
    .leftJoin(courses, eq(calendarEvents.courseId, courses.id))
    .orderBy(asc(calendarEvents.startTime))

  return {
    events: rows.map((row) => ({
      ...row,
      courseName: row.courseName ?? null,
    })),
  }
}

type CalendarEventMutation = 'createEvent' | 'updateEvent' | 'deleteEvent'

type CalendarEventMutationContext = {
  action: CalendarEventMutation
  actorId: string
  eventId?: string
  failureEvent: string
  startedAt: number
}

function logCalendarEventMutation(
  level: LogLevel,
  event: string,
  context: CalendarEventMutationContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    eventId: context.eventId,
    ...fields,
  })
}

function logCalendarEventFailure(context: CalendarEventMutationContext): void {
  logCalendarEventMutation('error', context.failureEvent, context, {
    errorCategory: 'calendar_event_persistence',
  })
}

export async function createEventService(
  data: CreateEventInput,
  actorId: string,
) {
  await requireEventManager(actorId)
  const context: CalendarEventMutationContext = {
    action: 'createEvent',
    actorId,
    failureEvent: 'calendar_event_create_failed',
    startedAt: performance.now(),
  }

  try {
    const db = await getDb()
    const [event] = await db
      .insert(calendarEvents)
      .values(buildEventValues(data))
      .returning()
    context.eventId = event.id
    logCalendarEventMutation('info', 'calendar_event_created', context, {
      category: data.category ?? null,
      courseId: data.courseId ?? null,
    })
    return { event }
  } catch (error) {
    logCalendarEventFailure(context)
    throw error
  }
}

export async function updateEventService(
  data: UpdateEventInput,
  actorId: string,
) {
  await requireEventManager(actorId)
  const context: CalendarEventMutationContext = {
    action: 'updateEvent',
    actorId,
    eventId: data.eventId,
    failureEvent: 'calendar_event_update_failed',
    startedAt: performance.now(),
  }

  try {
    const db = await getDb()
    const rows = await db
      .update(calendarEvents)
      .set({ ...buildEventValues(data), updatedAt: new Date() })
      .where(eq(calendarEvents.id, data.eventId))
      .returning()
    if (rows.length === 0) return { event: undefined }
    const [event] = rows
    logCalendarEventMutation('info', 'calendar_event_updated', context, {
      category: data.category ?? null,
      courseId: data.courseId ?? null,
    })
    return { event }
  } catch (error) {
    logCalendarEventFailure(context)
    throw error
  }
}

export async function deleteEventService(
  data: DeleteEventInput,
  actorId: string,
): Promise<void> {
  await requireEventManager(actorId)
  const context: CalendarEventMutationContext = {
    action: 'deleteEvent',
    actorId,
    eventId: data.eventId,
    failureEvent: 'calendar_event_delete_failed',
    startedAt: performance.now(),
  }

  try {
    const db = await getDb()
    await db.delete(calendarEvents).where(eq(calendarEvents.id, data.eventId))
    logCalendarEventMutation('info', 'calendar_event_deleted', context)
  } catch (error) {
    logCalendarEventFailure(context)
    throw error
  }
}

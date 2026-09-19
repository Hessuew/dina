import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { calendarEvents } from '@/db/schema'

export type CalendarEventInsert = typeof calendarEvents.$inferInsert

/* v8 ignore start */
export async function findAllCalendarEvents() {
  const db = await getDb()
  return db.select().from(calendarEvents)
}

export async function insertCalendarEvent(values: CalendarEventInsert) {
  const db = await getDb()
  const [event] = await db.insert(calendarEvents).values(values).returning()
  return event
}

export async function updateCalendarEvent(
  eventId: string,
  values: Partial<CalendarEventInsert>,
) {
  const db = await getDb()
  return (
    await db
      .update(calendarEvents)
      .set(values)
      .where(eq(calendarEvents.id, eventId))
      .returning()
  ).at(0)
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const db = await getDb()
  await db.delete(calendarEvents).where(eq(calendarEvents.id, eventId))
}
/* v8 ignore end */

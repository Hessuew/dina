import { and, desc, eq, gt, inArray, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { attendanceSessions } from '@/db/schema'

export type AttendanceSessionRow = typeof attendanceSessions.$inferSelect

export type AttendanceSessionsTransactionClient = Parameters<
  Parameters<Awaited<ReturnType<typeof getDb>>['transaction']>[0]
>[0]

export async function findAttendanceSessionsByIds(sessionIds: Array<string>) {
  if (sessionIds.length === 0) return []
  const db = await getDb()
  return db
    .select({
      id: attendanceSessions.id,
      lessonId: attendanceSessions.lessonId,
    })
    .from(attendanceSessions)
    .where(inArray(attendanceSessions.id, sessionIds))
}

export async function findAttendanceSessionsByLessonIds(
  lessonIds: Array<string>,
) {
  if (lessonIds.length === 0) return []
  const db = await getDb()
  return db
    .select({
      id: attendanceSessions.id,
      lessonId: attendanceSessions.lessonId,
      closesAt: attendanceSessions.closesAt,
    })
    .from(attendanceSessions)
    .where(inArray(attendanceSessions.lessonId, lessonIds))
}

export async function findOpenAttendanceSessions(now: Date) {
  const db = await getDb()
  return db
    .select()
    .from(attendanceSessions)
    .where(gt(attendanceSessions.closesAt, now))
    .orderBy(desc(attendanceSessions.openedAt))
}

function firstOrNull<T>(rows: Array<T>): T | null {
  return rows.length === 0 ? null : rows[0]
}

export async function findOpenSessionOnCourse(
  courseId: string,
  now: Date,
): Promise<AttendanceSessionRow | null> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.courseId, courseId),
        gt(attendanceSessions.closesAt, now),
      ),
    )
    .limit(1)
  return firstOrNull(rows)
}

export async function findOpenAttendanceSessionInTransaction(
  tx: AttendanceSessionsTransactionClient,
  courseId: string,
  now: Date,
): Promise<AttendanceSessionRow | null> {
  const rows = await tx
    .select()
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.courseId, courseId),
        gt(attendanceSessions.closesAt, now),
      ),
    )
    .limit(1)
  return firstOrNull(rows)
}

export async function findAttendanceSessionByLessonInTransaction(
  tx: AttendanceSessionsTransactionClient,
  lessonId: string,
): Promise<AttendanceSessionRow | null> {
  const rows = await tx
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.lessonId, lessonId))
    .limit(1)
  return firstOrNull(rows)
}

export async function insertAttendanceSessionInTransaction(
  tx: AttendanceSessionsTransactionClient,
  values: typeof attendanceSessions.$inferInsert,
): Promise<AttendanceSessionRow> {
  const rows = await tx.insert(attendanceSessions).values(values).returning()
  const session = firstOrNull(rows)
  if (!session) throw new Error('Failed to create attendance session')
  return session
}

/* v8 ignore start */
export async function openAttendanceSessionAtomically(values: {
  courseId: string
  lessonId: string
  openedBy: string
}) {
  const db = await getDb()
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${values.courseId}))`,
    )
    const now = new Date()
    const open = await findOpenAttendanceSessionInTransaction(
      tx,
      values.courseId,
      now,
    )
    if (open) return { kind: 'conflict' as const, open }

    const existing = await findAttendanceSessionByLessonInTransaction(
      tx,
      values.lessonId,
    )
    const window = {
      openedAt: now,
      closesAt: new Date(now.getTime() + 10 * 60_000),
      openedBy: values.openedBy,
      updatedAt: now,
    }
    const updated = existing
      ? await tx
          .update(attendanceSessions)
          .set(window)
          .where(eq(attendanceSessions.id, existing.id))
          .returning()
      : []
    const session = existing
      ? firstOrNull(updated)
      : await insertAttendanceSessionInTransaction(tx, {
          ...window,
          courseId: values.courseId,
          lessonId: values.lessonId,
        })
    if (!session) throw new Error('Failed to open attendance session')
    return { kind: 'opened' as const, session }
  })
}

export async function closeAttendanceSessionAtomically(
  courseId: string,
): Promise<AttendanceSessionRow | null> {
  const db = await getDb()
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${courseId}))`)
    const now = new Date()
    const rows = await tx
      .update(attendanceSessions)
      .set({ closesAt: now, updatedAt: now })
      .where(
        and(
          eq(attendanceSessions.courseId, courseId),
          gt(attendanceSessions.closesAt, now),
        ),
      )
      .returning()
    return firstOrNull(rows)
  })
}
/* v8 ignore end */

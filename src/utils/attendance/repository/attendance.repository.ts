/* v8 ignore start */
import { and, desc, eq, gt, inArray, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import {
  attendancePresents,
  attendanceSessions,
  courses,
  lessons,
} from '@/db/schema'

export type AttendanceSessionRow = typeof attendanceSessions.$inferSelect

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

export async function findOpenSessionsForStudent(now: Date, studentId: string) {
  const db = await getDb()
  return db
    .select({
      id: attendanceSessions.id,
      courseId: attendanceSessions.courseId,
      lessonId: attendanceSessions.lessonId,
      openedAt: attendanceSessions.openedAt,
      closesAt: attendanceSessions.closesAt,
      courseTitle: courses.title,
      lessonTitle: lessons.title,
      presentId: attendancePresents.id,
    })
    .from(attendanceSessions)
    .innerJoin(courses, eq(courses.id, attendanceSessions.courseId))
    .innerJoin(lessons, eq(lessons.id, attendanceSessions.lessonId))
    .leftJoin(
      attendancePresents,
      and(
        eq(attendancePresents.sessionId, attendanceSessions.id),
        eq(attendancePresents.studentId, studentId),
      ),
    )
    .where(gt(attendanceSessions.closesAt, now))
    .orderBy(desc(attendanceSessions.openedAt))
}

export async function findLessonsWithSessionsByCourseId(courseId: string) {
  const db = await getDb()
  return db
    .select({
      id: lessons.id,
      title: lessons.title,
      orderIndex: lessons.orderIndex,
      courseId: lessons.courseId,
      sessionId: attendanceSessions.id,
      closesAt: attendanceSessions.closesAt,
    })
    .from(lessons)
    .leftJoin(attendanceSessions, eq(attendanceSessions.lessonId, lessons.id))
    .where(eq(lessons.courseId, courseId))
    .orderBy(lessons.orderIndex)
}

export async function findLessonInCourse(lessonId: string, courseId: string) {
  const db = await getDb()
  const rows = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      courseId: lessons.courseId,
    })
    .from(lessons)
    .where(and(eq(lessons.id, lessonId), eq(lessons.courseId, courseId)))
    .limit(1)
  return firstOrNull(rows)
}

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
    const openRows = await tx
      .select()
      .from(attendanceSessions)
      .where(
        and(
          eq(attendanceSessions.courseId, values.courseId),
          gt(attendanceSessions.closesAt, now),
        ),
      )
      .limit(1)
    const open = firstOrNull(openRows)
    if (open) return { kind: 'conflict' as const, open }

    const existingRows = await tx
      .select()
      .from(attendanceSessions)
      .where(eq(attendanceSessions.lessonId, values.lessonId))
      .limit(1)
    const existing = firstOrNull(existingRows)
    const window = {
      openedAt: now,
      closesAt: new Date(now.getTime() + 10 * 60_000),
      openedBy: values.openedBy,
      updatedAt: now,
    }
    const rows = existing
      ? await tx
          .update(attendanceSessions)
          .set(window)
          .where(eq(attendanceSessions.id, existing.id))
          .returning()
      : await tx
          .insert(attendanceSessions)
          .values({
            ...window,
            courseId: values.courseId,
            lessonId: values.lessonId,
          })
          .returning()
    const session = firstOrNull(rows)
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

export async function findPresent(
  sessionId: string,
  studentId: string,
): Promise<{ id: string; checkedInAt: Date } | null> {
  const db = await getDb()
  const rows = await db
    .select({
      id: attendancePresents.id,
      checkedInAt: attendancePresents.checkedInAt,
    })
    .from(attendancePresents)
    .where(
      and(
        eq(attendancePresents.sessionId, sessionId),
        eq(attendancePresents.studentId, studentId),
      ),
    )
    .limit(1)
  return firstOrNull(rows)
}

/** Idempotent and serialized with open/close for the course. */
export async function markPresentAtomically(values: {
  courseId: string
  studentId: string
}) {
  const db = await getDb()
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${values.courseId}))`,
    )
    const now = new Date()
    const sessionRows = await tx
      .select()
      .from(attendanceSessions)
      .where(
        and(
          eq(attendanceSessions.courseId, values.courseId),
          gt(attendanceSessions.closesAt, now),
        ),
      )
      .limit(1)
    const session = firstOrNull(sessionRows)
    if (!session) return null

    const inserted = await tx
      .insert(attendancePresents)
      .values({ sessionId: session.id, studentId: values.studentId })
      .onConflictDoNothing({
        target: [attendancePresents.sessionId, attendancePresents.studentId],
      })
      .returning()
    const created = firstOrNull(inserted)
    if (created) return { session, present: created, created: true as const }

    const existingRows = await tx
      .select()
      .from(attendancePresents)
      .where(
        and(
          eq(attendancePresents.sessionId, session.id),
          eq(attendancePresents.studentId, values.studentId),
        ),
      )
      .limit(1)
    const present = firstOrNull(existingRows)
    if (!present) throw new Error('Present missing after conflict')
    return { session, present, created: false as const }
  })
}

export async function findAllLessonsForAttendance() {
  const db = await getDb()
  return db
    .select({
      id: lessons.id,
      title: lessons.title,
      orderIndex: lessons.orderIndex,
      courseId: lessons.courseId,
    })
    .from(lessons)
}

export async function findPresentsForStudents(studentIds: Array<string>) {
  if (studentIds.length === 0) return []
  const db = await getDb()
  return db
    .select({
      studentId: attendancePresents.studentId,
      lessonId: attendanceSessions.lessonId,
      sessionId: attendancePresents.sessionId,
      checkedInAt: attendancePresents.checkedInAt,
    })
    .from(attendancePresents)
    .innerJoin(
      attendanceSessions,
      eq(attendanceSessions.id, attendancePresents.sessionId),
    )
    .where(inArray(attendancePresents.studentId, studentIds))
}

export async function findPresentsForStudent(studentId: string) {
  return findPresentsForStudents([studentId])
}

/**
 * Teacher/admin override: ensure session for lesson (create closed if missing;
 * never rewrite existing timestamps), then insert Present idempotently.
 */
export async function setPresentOverrideAtomically(values: {
  courseId: string
  lessonId: string
  studentId: string
  openedBy: string
}) {
  const db = await getDb()
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${values.courseId}))`,
    )
    const now = new Date()

    const existingRows = await tx
      .select()
      .from(attendanceSessions)
      .where(eq(attendanceSessions.lessonId, values.lessonId))
      .limit(1)
    let session = firstOrNull(existingRows)

    if (!session) {
      const inserted = await tx
        .insert(attendanceSessions)
        .values({
          courseId: values.courseId,
          lessonId: values.lessonId,
          openedAt: now,
          closesAt: now,
          openedBy: values.openedBy,
          updatedAt: now,
        })
        .returning()
      session = firstOrNull(inserted)
      if (!session) throw new Error('Failed to create override session')
    }

    const insertedPresent = await tx
      .insert(attendancePresents)
      .values({ sessionId: session.id, studentId: values.studentId })
      .onConflictDoNothing({
        target: [attendancePresents.sessionId, attendancePresents.studentId],
      })
      .returning()
    const created = firstOrNull(insertedPresent)
    if (created) {
      return { session, present: created, created: true as const }
    }

    const existingPresent = await tx
      .select()
      .from(attendancePresents)
      .where(
        and(
          eq(attendancePresents.sessionId, session.id),
          eq(attendancePresents.studentId, values.studentId),
        ),
      )
      .limit(1)
    const present = firstOrNull(existingPresent)
    if (!present) throw new Error('Present missing after conflict')
    return { session, present, created: false as const }
  })
}

/** Clear Present for student on lesson session; no-op if session or row missing. */
export async function clearPresentOverrideAtomically(values: {
  courseId: string
  lessonId: string
  studentId: string
}) {
  const db = await getDb()
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${values.courseId}))`,
    )

    const sessionRows = await tx
      .select()
      .from(attendanceSessions)
      .where(eq(attendanceSessions.lessonId, values.lessonId))
      .limit(1)
    const session = firstOrNull(sessionRows)
    if (!session) {
      return { session: null, cleared: false as const }
    }

    const deleted = await tx
      .delete(attendancePresents)
      .where(
        and(
          eq(attendancePresents.sessionId, session.id),
          eq(attendancePresents.studentId, values.studentId),
        ),
      )
      .returning({ id: attendancePresents.id })

    return {
      session,
      cleared: deleted.length > 0,
    }
  })
}
/* v8 ignore end */

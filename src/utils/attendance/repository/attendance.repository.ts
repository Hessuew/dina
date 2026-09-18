/* v8 ignore start */
import { and, desc, eq, gt, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import {
  attendancePresents,
  attendanceSessions,
  courses,
  lessons,
} from '@/db/schema'
import {
  findAttendanceSessionByLessonInTransaction,
  findOpenAttendanceSessionInTransaction,
  insertAttendanceSessionInTransaction,
} from '@/utils/repository/attendance-sessions.repository'
import {
  deletePresentInTransaction,
  findPresentInTransaction,
  insertPresentInTransaction,
} from '@/utils/repository/attendance-presents.repository'

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
    .where(
      and(
        gt(attendanceSessions.closesAt, now),
        eq(courses.isPublished, true),
        eq(lessons.isPublished, true),
      ),
    )
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
      isPublished: lessons.isPublished,
      sessionId: attendanceSessions.id,
      closesAt: attendanceSessions.closesAt,
    })
    .from(lessons)
    .leftJoin(attendanceSessions, eq(attendanceSessions.lessonId, lessons.id))
    .where(eq(lessons.courseId, courseId))
    .orderBy(lessons.orderIndex)
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
    const session = await findOpenAttendanceSessionInTransaction(
      tx,
      values.courseId,
      now,
    )
    if (!session) return null

    const created = await insertPresentInTransaction(
      tx,
      session.id,
      values.studentId,
    )
    if (created) return { session, present: created, created: true as const }

    const present = await findPresentInTransaction(
      tx,
      session.id,
      values.studentId,
    )
    if (!present) throw new Error('Present missing after conflict')
    return { session, present, created: false as const }
  })
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

    let session = await findAttendanceSessionByLessonInTransaction(
      tx,
      values.lessonId,
    )

    if (!session) {
      session = await insertAttendanceSessionInTransaction(tx, {
        courseId: values.courseId,
        lessonId: values.lessonId,
        openedAt: now,
        closesAt: now,
        openedBy: values.openedBy,
        updatedAt: now,
      })
    }

    const created = await insertPresentInTransaction(
      tx,
      session.id,
      values.studentId,
    )
    if (created) {
      return { session, present: created, created: true as const }
    }

    const present = await findPresentInTransaction(
      tx,
      session.id,
      values.studentId,
    )
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

    const session = await findAttendanceSessionByLessonInTransaction(
      tx,
      values.lessonId,
    )
    if (!session) {
      return { session: null, cleared: false as const }
    }

    const deleted = await deletePresentInTransaction(
      tx,
      session.id,
      values.studentId,
    )

    return {
      session,
      cleared: deleted.length > 0,
    }
  })
}
/* v8 ignore end */

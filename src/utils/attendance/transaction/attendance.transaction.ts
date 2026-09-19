/* v8 ignore start */
import { getDb } from '@/db'
import {
  deletePresentInTransaction,
  findAttendanceSessionByLessonInTransaction,
  findOpenAttendanceSessionInTransaction,
  findPresentInTransaction,
  insertAttendanceSessionInTransaction,
  insertPresentInTransaction,
  lockAttendanceCourseInTransaction,
} from '@/utils/repository'

/** Idempotent and serialized with open/close for the course. */
export async function markPresentAtomically(values: {
  courseId: string
  studentId: string
}) {
  const db = await getDb()
  return db.transaction(async (tx) => {
    await lockAttendanceCourseInTransaction(tx, values.courseId)
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
    await lockAttendanceCourseInTransaction(tx, values.courseId)
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
    await lockAttendanceCourseInTransaction(tx, values.courseId)

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

import { and, eq } from 'drizzle-orm'
import type { AttendanceSessionsTransactionClient } from './attendance-sessions.repository'
import { getDb } from '@/db'
import { attendancePresents } from '@/db/schema'

export type AttendancePresentRow = typeof attendancePresents.$inferSelect

function firstOrNull<T>(rows: Array<T>): T | null {
  return rows.length === 0 ? null : rows[0]
}

export async function findPresent(
  sessionId: string,
  studentId: string,
): Promise<Pick<AttendancePresentRow, 'id' | 'checkedInAt'> | null> {
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

export async function findPresentInTransaction(
  tx: AttendanceSessionsTransactionClient,
  sessionId: string,
  studentId: string,
): Promise<AttendancePresentRow | null> {
  const rows = await tx
    .select()
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

export async function insertPresentInTransaction(
  tx: AttendanceSessionsTransactionClient,
  sessionId: string,
  studentId: string,
): Promise<AttendancePresentRow | null> {
  const rows = await tx
    .insert(attendancePresents)
    .values({ sessionId, studentId })
    .onConflictDoNothing({
      target: [attendancePresents.sessionId, attendancePresents.studentId],
    })
    .returning()
  return firstOrNull(rows)
}

export async function deletePresentInTransaction(
  tx: AttendanceSessionsTransactionClient,
  sessionId: string,
  studentId: string,
): Promise<Array<{ id: string }>> {
  return tx
    .delete(attendancePresents)
    .where(
      and(
        eq(attendancePresents.sessionId, sessionId),
        eq(attendancePresents.studentId, studentId),
      ),
    )
    .returning({ id: attendancePresents.id })
}

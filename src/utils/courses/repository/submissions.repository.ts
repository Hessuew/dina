/* v8 ignore start */
import { and, eq, inArray } from 'drizzle-orm'
import type { getDb } from '@/db'
import { submissions } from '@/db/schema'

type Db = Awaited<ReturnType<typeof getDb>>

export async function findStudentSubmissions(
  db: Db,
  studentId: string,
  assignmentIds: string[],
) {
  if (assignmentIds.length === 0) return []
  return db.query.submissions.findMany({
    where: and(
      eq(submissions.studentId, studentId),
      inArray(submissions.assignmentId, assignmentIds),
    ),
  })
}
/* v8 ignore end */

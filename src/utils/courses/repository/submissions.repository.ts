/* v8 ignore start */
import { and, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { submissions } from '@/db/schema'

export async function findStudentSubmissions(
  studentId: string,
  assignmentIds: Array<string>,
) {
  if (assignmentIds.length === 0) return []
  const db = await getDb()
  return db.query.submissions.findMany({
    where: and(
      eq(submissions.studentId, studentId),
      inArray(submissions.assignmentId, assignmentIds),
    ),
  })
}
/* v8 ignore end */

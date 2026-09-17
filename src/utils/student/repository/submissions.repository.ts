import { inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { submissions } from '@/db/schema'

/* v8 ignore start */
export async function findSubmissionsForStudents(studentIds: Array<string>) {
  if (studentIds.length === 0) return []
  const db = await getDb()
  return db.query.submissions.findMany({
    where: inArray(submissions.studentId, studentIds),
    with: {
      assignment: {
        with: {
          lesson: {
            with: {
              course: {
                columns: { id: true, title: true },
              },
            },
          },
        },
      },
    },
  })
}

/* v8 ignore end */

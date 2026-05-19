import { and, eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'

/* v8 ignore start */
export async function findAllStudents() {
  const db = await getDb()
  return db.query.profiles.findMany({
    where: eq(profiles.role, 'student'),
    orderBy: (p, { asc }) => [asc(p.fullName)],
  })
}

export async function findStudentById(studentId: string) {
  const db = await getDb()
  return db.query.profiles.findFirst({
    where: and(eq(profiles.id, studentId), eq(profiles.role, 'student')),
  })
}
/* v8 ignore end */

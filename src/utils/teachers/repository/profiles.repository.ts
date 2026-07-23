import { inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'

/* v8 ignore start */
export async function findAllTeachers() {
  const db = await getDb()
  return db.query.profiles.findMany({
    where: inArray(profiles.role, ['teacher', 'admin']),
    orderBy: (t, { asc }) => [asc(t.fullName)],
  })
}

export async function findAllTeachersSimple() {
  const db = await getDb()
  return db.query.profiles.findMany({
    where: inArray(profiles.role, ['teacher', 'admin']),
    columns: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      avatarUrl: true,
    },
    with: {
      courseTeachers: {
        columns: { courseId: true },
      },
    },
    orderBy: (p, { asc }) => [asc(p.fullName)],
  })
}
/* v8 ignore end */

import { getDb } from '@/db'

/* v8 ignore start */
export async function findAllCourses() {
  const db = await getDb()
  return db.query.courses.findMany({
    columns: { id: true, title: true },
  })
}

export async function findAllCoursesDesc() {
  const db = await getDb()
  return db.query.courses.findMany({
    columns: { id: true, title: true },
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  })
}
/* v8 ignore end */

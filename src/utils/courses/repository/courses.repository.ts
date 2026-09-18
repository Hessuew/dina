/* v8 ignore start */
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { courses } from '@/db/schema'

export async function findAllCourses(includeUnpublishedLessons: boolean) {
  const db = await getDb()
  return db.query.courses.findMany({
    with: {
      courseTeachers: {
        with: { teacher: true },
        orderBy: (ct, { asc }) => [asc(ct.createdAt)],
      },
      lessons: {
        where: includeUnpublishedLessons
          ? undefined
          : (l) => eq(l.isPublished, true),
        orderBy: (l, { asc }) => [asc(l.orderIndex)],
      },
    },
    orderBy: (c, { asc }) => [asc(c.orderIndex)],
  })
}

export async function findCourseWithDetails(
  courseId: string,
  includeUnpublished: boolean,
) {
  const db = await getDb()
  return db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      courseTeachers: {
        with: { teacher: true },
        orderBy: (ct, { asc }) => [asc(ct.createdAt)],
      },
      lessons: {
        where: includeUnpublished ? undefined : (l) => eq(l.isPublished, true),
        orderBy: (l, { asc }) => [asc(l.orderIndex)],
      },
      mediaFiles: {
        where: includeUnpublished ? undefined : (t) => eq(t.isPublished, true),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      },
    },
  })
}

/* v8 ignore end */

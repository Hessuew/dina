/* v8 ignore start */
import { eq } from 'drizzle-orm'
import type { getDb } from '@/db'
import { courses } from '@/db/schema'

type Db = Awaited<ReturnType<typeof getDb>>

export async function findAllCourses(db: Db) {
  return db.query.courses.findMany({
    with: {
      courseTeachers: { with: { teacher: true } },
      lessons: { orderBy: (l, { asc }) => [asc(l.orderIndex)] },
    },
    orderBy: (c, { asc }) => [asc(c.orderIndex)],
  })
}

export async function findCourseWithDetails(
  db: Db,
  courseId: string,
  includeUnpublished: boolean,
) {
  return db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      courseTeachers: { with: { teacher: true } },
      lessons: { orderBy: (l, { asc }) => [asc(l.orderIndex)] },
      mediaFiles: {
        where: includeUnpublished ? undefined : (t) => eq(t.isPublished, true),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      },
    },
  })
}

export async function findCourseById(db: Db, courseId: string) {
  return db.query.courses.findFirst({
    where: eq(courses.id, courseId),
  })
}

export async function findAllCourseIds(db: Db) {
  const result = await db.query.courses.findMany({ columns: { id: true } })
  return result.map((c) => c.id)
}

export async function insertCourse(
  db: Db,
  values: {
    title: string
    description: string
    thumbnailUrl: string | null
    isPublished: boolean
    orderIndex: number
  },
) {
  const [course] = await db.insert(courses).values(values).returning()
  return course
}

export async function updateCourseById(
  db: Db,
  courseId: string,
  values: {
    title: string
    description: string
    thumbnailUrl: string | null
    isPublished?: boolean
    orderIndex?: number
    updatedAt: Date
  },
) {
  const [course] = await db
    .update(courses)
    .set(values)
    .where(eq(courses.id, courseId))
    .returning()
  return course
}

export async function deleteCourseById(db: Db, courseId: string) {
  await db.delete(courses).where(eq(courses.id, courseId))
}
/* v8 ignore end */

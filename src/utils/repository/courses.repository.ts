/* v8 ignore start */
import { eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { courses } from '@/db/schema'

export type CoursesTransactionClient = Parameters<
  Parameters<Awaited<ReturnType<typeof getDb>>['transaction']>[0]
>[0]

export async function insertCourseInTransaction(
  tx: CoursesTransactionClient,
  values: {
    title: string
    description: string
    thumbnailUrl: string | null
    isPublished: boolean
    orderIndex: number
  },
) {
  const [course] = await tx.insert(courses).values(values).returning()
  return course
}

export async function findCourseById(courseId: string) {
  const db = await getDb()
  return db.query.courses.findFirst({
    where: eq(courses.id, courseId),
  })
}

export async function findAllCourseIds() {
  const db = await getDb()
  const result = await db.query.courses.findMany({ columns: { id: true } })
  return result.map((course) => course.id)
}

export async function findAllCourses() {
  const db = await getDb()
  return db.query.courses.findMany({
    columns: { id: true, title: true },
  })
}

export async function findCoursesByIds(courseIds: Array<string>) {
  if (courseIds.length === 0) return []
  const db = await getDb()
  return db.query.courses.findMany({
    where: inArray(courses.id, courseIds),
    columns: { id: true, title: true, orderIndex: true, isPublished: true },
  })
}

export async function findAllCoursesDesc() {
  const db = await getDb()
  return db.query.courses.findMany({
    columns: { id: true, title: true },
    orderBy: (course, { desc }) => [desc(course.createdAt)],
  })
}

export async function updateCourseById(
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
  const db = await getDb()
  const [course] = await db
    .update(courses)
    .set(values)
    .where(eq(courses.id, courseId))
    .returning()
  return course
}

export async function updateCourseThumbnailPath(
  courseId: string,
  thumbnailPath: string,
): Promise<void> {
  const db = await getDb()
  await db
    .update(courses)
    .set({ thumbnailUrl: thumbnailPath, updatedAt: new Date() })
    .where(eq(courses.id, courseId))
}

export async function deleteCourseById(courseId: string) {
  const db = await getDb()
  await db.delete(courses).where(eq(courses.id, courseId))
}
/* v8 ignore end */

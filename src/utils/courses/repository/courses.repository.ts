/* v8 ignore start */
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { courseTeachers, courses } from '@/db/schema'

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

export async function findCourseById(courseId: string) {
  const db = await getDb()
  return db.query.courses.findFirst({
    where: eq(courses.id, courseId),
  })
}

export async function findAllCourseIds() {
  const db = await getDb()
  const result = await db.query.courses.findMany({ columns: { id: true } })
  return result.map((c) => c.id)
}

export async function insertCourse(
  values: {
    title: string
    description: string
    thumbnailUrl: string | null
    isPublished: boolean
    orderIndex: number
  },
  teacherIds?: [string, string],
) {
  const db = await getDb()
  return db.transaction(async (tx) => {
    const [course] = await tx.insert(courses).values(values).returning()
    if (teacherIds) {
      await tx
        .insert(courseTeachers)
        .values(
          teacherIds.map((teacherId) => ({ courseId: course.id, teacherId })),
        )
    }
    return course
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

export async function deleteCourseById(courseId: string) {
  const db = await getDb()
  await db.delete(courses).where(eq(courses.id, courseId))
}
/* v8 ignore end */

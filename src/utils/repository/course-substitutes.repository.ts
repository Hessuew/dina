import { eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { courseSubstitutes } from '@/db/schema'

export type CourseSubstitutesTransactionClient = Parameters<
  Parameters<Awaited<ReturnType<typeof getDb>>['transaction']>[0]
>[0]

/* v8 ignore start */
export async function insertCourseSubstituteInTransaction(
  tx: CourseSubstitutesTransactionClient,
  values: Pick<
    typeof courseSubstitutes.$inferInsert,
    'courseId' | 'substituteTeacherId' | 'absentTeacherId'
  >,
) {
  await tx.insert(courseSubstitutes).values(values)
}

export async function findAbsentTeacherIdsWithActiveSubstitution(): Promise<
  Array<string>
> {
  const db = await getDb()
  const rows = await db
    .select({ absentTeacherId: courseSubstitutes.absentTeacherId })
    .from(courseSubstitutes)
  return [...new Set(rows.map((r) => r.absentTeacherId))]
}

export async function findSubstituteTeacherIdsByCourse(courseId: string) {
  const db = await getDb()
  const rows = await db.query.courseSubstitutes.findMany({
    where: eq(courseSubstitutes.courseId, courseId),
    columns: { substituteTeacherId: true },
  })
  return rows.map((row) => row.substituteTeacherId)
}

export async function findCourseSubstitutesByCourseIds(
  courseIds: Array<string>,
) {
  if (courseIds.length === 0) return []
  const db = await getDb()
  return db.query.courseSubstitutes.findMany({
    where: inArray(courseSubstitutes.courseId, courseIds),
    columns: {
      courseId: true,
      substituteTeacherId: true,
      absentTeacherId: true,
    },
  })
}

export async function findCourseIdsBySubstituteTeacher(
  substituteTeacherId: string,
) {
  const db = await getDb()
  const rows = await db.query.courseSubstitutes.findMany({
    where: eq(courseSubstitutes.substituteTeacherId, substituteTeacherId),
    columns: { courseId: true },
  })
  return rows.map((row) => row.courseId)
}

export async function deleteCourseSubstituteByAbsent(
  absentTeacherId: string,
): Promise<number> {
  const db = await getDb()
  const deleted = await db
    .delete(courseSubstitutes)
    .where(eq(courseSubstitutes.absentTeacherId, absentTeacherId))
    .returning({ id: courseSubstitutes.id })
  return deleted.length
}
/* v8 ignore end */

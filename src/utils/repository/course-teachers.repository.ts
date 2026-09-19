/* v8 ignore start */
import { and, eq, inArray } from 'drizzle-orm'
import type { RepositoryTransactionClient } from './transaction-client'
import { getDb } from '@/db'
import { courseTeachers } from '@/db/schema'

async function insertCourseTeacherAssignmentRows(
  executor: RepositoryTransactionClient | Awaited<ReturnType<typeof getDb>>,
  courseId: string,
  teacherIds: Array<string>,
): Promise<void> {
  await executor
    .insert(courseTeachers)
    .values(teacherIds.map((teacherId) => ({ courseId, teacherId })))
}

export async function insertCourseTeacherAssignments(
  courseId: string,
  teacherIds: Array<string>,
): Promise<void> {
  await insertCourseTeacherAssignmentRows(await getDb(), courseId, teacherIds)
}

export async function insertCourseTeacherAssignmentsInTransaction(
  tx: RepositoryTransactionClient,
  courseId: string,
  teacherIds: Array<string>,
): Promise<void> {
  await insertCourseTeacherAssignmentRows(tx, courseId, teacherIds)
}

export async function findCourseAssignmentsByTeacherIds(
  teacherIds: Array<string>,
) {
  const db = await getDb()
  return db.query.courseTeachers.findMany({
    where: inArray(courseTeachers.teacherId, teacherIds),
    columns: { teacherId: true },
  })
}

export async function findCourseAssignmentsForTeacherIds(
  teacherIds: Array<string>,
) {
  if (teacherIds.length === 0) return []
  const db = await getDb()
  return db.query.courseTeachers.findMany({
    where: inArray(courseTeachers.teacherId, teacherIds),
    orderBy: (ct, { desc }) => [desc(ct.createdAt)],
  })
}

export async function findCourseTeacherRows(courseId: string) {
  const db = await getDb()
  return db.query.courseTeachers.findMany({
    where: eq(courseTeachers.courseId, courseId),
    orderBy: (ct, { asc }) => [asc(ct.createdAt)],
  })
}

export async function findCourseTeacherRowsByCourseIds(
  courseIds: Array<string>,
) {
  if (courseIds.length === 0) return []
  const db = await getDb()
  return db.query.courseTeachers.findMany({
    where: inArray(courseTeachers.courseId, courseIds),
    orderBy: (ct, { asc }) => [asc(ct.createdAt)],
  })
}

export async function findCourseIdsByTeacher(teacherId: string) {
  const db = await getDb()
  const result = await db.query.courseTeachers.findMany({
    where: eq(courseTeachers.teacherId, teacherId),
    columns: { courseId: true },
  })
  return result.map((assignment) => assignment.courseId)
}

export async function findTeacherIdsByCourseId(courseId: string) {
  const db = await getDb()
  const result = await db.query.courseTeachers.findMany({
    where: eq(courseTeachers.courseId, courseId),
    columns: { teacherId: true },
  })
  return result.map((assignment) => assignment.teacherId)
}

export async function findTeacherIdsByCourseIds(courseIds: Array<string>) {
  if (courseIds.length === 0) return []
  const db = await getDb()
  return db
    .select({
      courseId: courseTeachers.courseId,
      teacherId: courseTeachers.teacherId,
    })
    .from(courseTeachers)
    .where(inArray(courseTeachers.courseId, courseIds))
}

export async function findCourseTeacher(courseId: string, teacherId: string) {
  const db = await getDb()
  return db.query.courseTeachers.findFirst({
    where: and(
      eq(courseTeachers.courseId, courseId),
      eq(courseTeachers.teacherId, teacherId),
    ),
  })
}

export async function replaceTeacherAssignments(
  courseId: string,
  teacher1Id: string,
  teacher2Id: string,
) {
  const db = await getDb()
  await db.transaction(async (tx) => {
    await tx.delete(courseTeachers).where(eq(courseTeachers.courseId, courseId))
    await tx.insert(courseTeachers).values([
      { courseId, teacherId: teacher1Id },
      { courseId, teacherId: teacher2Id },
    ])
  })
}

export async function findCourseIdByTeacherId(
  teacherId: string,
): Promise<string | null> {
  const db = await getDb()
  const row = await db.query.courseTeachers.findFirst({
    where: eq(courseTeachers.teacherId, teacherId),
    columns: { courseId: true },
  })
  return row?.courseId ?? null
}

export async function findCourseIdsByTeacherIds(
  teacherIds: Array<string>,
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>(
    teacherIds.map((id) => [id, null]),
  )
  if (teacherIds.length === 0) return result
  const db = await getDb()
  const rows = await db
    .select({
      teacherId: courseTeachers.teacherId,
      courseId: courseTeachers.courseId,
    })
    .from(courseTeachers)
    .where(inArray(courseTeachers.teacherId, teacherIds))
  for (const row of rows) result.set(row.teacherId, row.courseId)
  return result
}
/* v8 ignore end */

/* v8 ignore start */
import { and, eq, inArray } from 'drizzle-orm'
import type { AssignmentStatus } from '@/types/database.types'
import { getDb } from '@/db'
import { assignments } from '@/db/schema'

export async function findAllAssignments() {
  const db = await getDb()
  return db.query.assignments.findMany()
}

export async function findPublishedAssignments() {
  const db = await getDb()
  return db.query.assignments.findMany({
    where: eq(assignments.status, 'published'),
    orderBy: (assignment, { asc }) => [asc(assignment.dueDate)],
  })
}

export async function findAssignmentById(assignmentId: string) {
  const db = await getDb()
  return db.query.assignments.findFirst({
    where: eq(assignments.id, assignmentId),
  })
}

export async function findAssignmentsByLessonId(lessonId: string) {
  const db = await getDb()
  return db.query.assignments.findMany({
    where: eq(assignments.lessonId, lessonId),
    orderBy: (assignment, { desc }) => [desc(assignment.createdAt)],
  })
}

export async function findPublishedAssignmentsByLessonIds(
  lessonIds: Array<string>,
) {
  if (lessonIds.length === 0) return []
  const db = await getDb()
  return db.query.assignments.findMany({
    where: and(
      inArray(assignments.lessonId, lessonIds),
      eq(assignments.status, 'published'),
    ),
  })
}

export async function insertAssignment(values: {
  lessonId: string
  title: string
  description: string | null
  dueDate: Date
  maxGrade: number
  status: 'draft'
}) {
  const db = await getDb()
  const [assignment] = await db.insert(assignments).values(values).returning()
  return assignment
}

export async function updateAssignmentById(
  assignmentId: string,
  values: {
    title: string
    description: string | null
    dueDate: Date
    maxGrade: number
    status?: AssignmentStatus
    updatedAt: Date
  },
) {
  const db = await getDb()
  const [assignment] = await db
    .update(assignments)
    .set(values)
    .where(eq(assignments.id, assignmentId))
    .returning()
  return assignment
}

export async function deleteAssignmentById(assignmentId: string) {
  const db = await getDb()
  await db.delete(assignments).where(eq(assignments.id, assignmentId))
}
/* v8 ignore end */

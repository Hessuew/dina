import { and, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import {
  discipleshipAssignments,
  discipleshipGroups,
  discipleshipPairs,
  profiles,
} from '@/db/schema'

/* v8 ignore start -- thin DB adapters; logic lives in domain/ */

const staffColumns = {
  id: true,
  fullName: true,
  email: true,
  avatarUrl: true,
} as const

export async function findDiscipleshipTeachers() {
  const db = await getDb()
  return db.query.profiles.findMany({
    where: inArray(profiles.role, ['teacher', 'admin']),
    columns: staffColumns,
    orderBy: (p, { asc }) => [asc(p.fullName)],
  })
}

export async function findDiscipleshipStudents() {
  const db = await getDb()
  return db.query.profiles.findMany({
    where: eq(profiles.role, 'student'),
    columns: staffColumns,
    orderBy: (p, { asc }) => [asc(p.fullName)],
  })
}

export async function findAllAssignments() {
  const db = await getDb()
  return db.query.discipleshipAssignments.findMany()
}

export async function findAssignmentsByTeacher(teacherId: string) {
  const db = await getDb()
  return db.query.discipleshipAssignments.findMany({
    where: eq(discipleshipAssignments.teacherId, teacherId),
  })
}

export async function findAssignmentByStudentId(studentId: string) {
  const db = await getDb()
  return db.query.discipleshipAssignments.findFirst({
    where: eq(discipleshipAssignments.studentId, studentId),
  })
}

export async function findAssignmentsByPairId(pairId: string) {
  const db = await getDb()
  return db.query.discipleshipAssignments.findMany({
    where: eq(discipleshipAssignments.pairId, pairId),
  })
}

export async function findAllPairs() {
  const db = await getDb()
  return db.query.discipleshipPairs.findMany()
}

export async function findPairsByTeacher(teacherId: string) {
  const db = await getDb()
  return db.query.discipleshipPairs.findMany({
    where: eq(discipleshipPairs.teacherId, teacherId),
  })
}

export async function findPairById(pairId: string) {
  const db = await getDb()
  return db.query.discipleshipPairs.findFirst({
    where: eq(discipleshipPairs.id, pairId),
  })
}

export async function findAllGroups() {
  const db = await getDb()
  return db.query.discipleshipGroups.findMany()
}

export async function findGroupsByTeacher(teacherId: string) {
  const db = await getDb()
  return db.query.discipleshipGroups.findMany({
    where: eq(discipleshipGroups.teacherId, teacherId),
  })
}

export async function insertAssignment(studentId: string, teacherId: string) {
  const db = await getDb()
  const [row] = await db
    .insert(discipleshipAssignments)
    .values({ studentId, teacherId })
    .returning()
  return row
}

export async function updateAssignmentTeacher(
  studentId: string,
  teacherId: string,
) {
  const db = await getDb()
  await db
    .update(discipleshipAssignments)
    .set({ teacherId, pairId: null, updatedAt: new Date() })
    .where(eq(discipleshipAssignments.studentId, studentId))
}

export async function deleteAssignmentByStudentId(studentId: string) {
  const db = await getDb()
  await db
    .delete(discipleshipAssignments)
    .where(eq(discipleshipAssignments.studentId, studentId))
}

export async function setAssignmentPair(studentId: string, pairId: string) {
  const db = await getDb()
  await db
    .update(discipleshipAssignments)
    .set({ pairId, updatedAt: new Date() })
    .where(eq(discipleshipAssignments.studentId, studentId))
}

export async function clearAssignmentPair(studentId: string) {
  const db = await getDb()
  await db
    .update(discipleshipAssignments)
    .set({ pairId: null, updatedAt: new Date() })
    .where(eq(discipleshipAssignments.studentId, studentId))
}

export async function setAssignmentAnchor(studentId: string, anchorAt: Date) {
  const db = await getDb()
  await db
    .update(discipleshipAssignments)
    .set({ anchorAt, updatedAt: new Date() })
    .where(eq(discipleshipAssignments.studentId, studentId))
}

export async function insertPair(teacherId: string) {
  const db = await getDb()
  const [row] = await db
    .insert(discipleshipPairs)
    .values({ teacherId })
    .returning()
  return row
}

export async function setPairAnchor(pairId: string, anchorAt: Date) {
  const db = await getDb()
  await db
    .update(discipleshipPairs)
    .set({ anchorAt, updatedAt: new Date() })
    .where(eq(discipleshipPairs.id, pairId))
}

// Deleting a pair nulls each member's `pairId` via the FK's ON DELETE SET NULL.
export async function deletePair(pairId: string) {
  const db = await getDb()
  await db.delete(discipleshipPairs).where(eq(discipleshipPairs.id, pairId))
}

export async function upsertGroupAnchor(teacherId: string, anchorAt: Date) {
  const db = await getDb()
  await db
    .insert(discipleshipGroups)
    .values({ teacherId, anchorAt })
    .onConflictDoUpdate({
      target: discipleshipGroups.teacherId,
      set: { anchorAt, updatedAt: new Date() },
    })
}

/* v8 ignore end */

import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { discipleshipAssignments } from '@/db/schema'

/* v8 ignore start */
export async function findAllDiscipleshipAssignments() {
  const db = await getDb()
  return db.query.discipleshipAssignments.findMany()
}

export async function findDiscipleshipAssignmentsByTeacher(teacherId: string) {
  const db = await getDb()
  return db.query.discipleshipAssignments.findMany({
    where: eq(discipleshipAssignments.teacherId, teacherId),
  })
}

export async function findDiscipleshipAssignmentByStudentId(studentId: string) {
  const db = await getDb()
  return db.query.discipleshipAssignments.findFirst({
    where: eq(discipleshipAssignments.studentId, studentId),
  })
}

export async function findDiscipleshipAssignmentsByPairId(pairId: string) {
  const db = await getDb()
  return db.query.discipleshipAssignments.findMany({
    where: eq(discipleshipAssignments.pairId, pairId),
  })
}

export async function findDiscipleshipTeacherIdByStudentId(studentId: string) {
  const db = await getDb()
  return db.query.discipleshipAssignments.findFirst({
    where: eq(discipleshipAssignments.studentId, studentId),
    columns: { teacherId: true },
  })
}

export async function insertDiscipleshipAssignment(
  studentId: string,
  teacherId: string,
) {
  const db = await getDb()
  const [row] = await db
    .insert(discipleshipAssignments)
    .values({ studentId, teacherId })
    .returning()
  return row
}

export async function updateDiscipleshipAssignmentTeacher(
  studentId: string,
  teacherId: string,
) {
  const db = await getDb()
  await db
    .update(discipleshipAssignments)
    .set({ teacherId, pairId: null, updatedAt: new Date() })
    .where(eq(discipleshipAssignments.studentId, studentId))
}

export async function deleteDiscipleshipAssignmentByStudentId(
  studentId: string,
) {
  const db = await getDb()
  await db
    .delete(discipleshipAssignments)
    .where(eq(discipleshipAssignments.studentId, studentId))
}

export async function setDiscipleshipAssignmentPair(
  studentId: string,
  pairId: string,
) {
  const db = await getDb()
  await db
    .update(discipleshipAssignments)
    .set({ pairId, updatedAt: new Date() })
    .where(eq(discipleshipAssignments.studentId, studentId))
}

export async function clearDiscipleshipAssignmentPair(studentId: string) {
  const db = await getDb()
  await db
    .update(discipleshipAssignments)
    .set({ pairId: null, updatedAt: new Date() })
    .where(eq(discipleshipAssignments.studentId, studentId))
}

export async function setDiscipleshipAssignmentAnchor(
  studentId: string,
  anchorAt: Date,
) {
  const db = await getDb()
  await db
    .update(discipleshipAssignments)
    .set({ anchorAt, updatedAt: new Date() })
    .where(eq(discipleshipAssignments.studentId, studentId))
}
/* v8 ignore end */

import { and, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'

/* v8 ignore start */
export async function findProfileByEmail(email: string) {
  const db = await getDb()
  return db.query.profiles.findFirst({
    where: eq(profiles.email, email),
  })
}

export async function findProfileById(userId: string) {
  const db = await getDb()
  return db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  })
}

export async function findProfilesByIds(ids: Array<string>) {
  const db = await getDb()
  return db.query.profiles.findMany({
    where: inArray(profiles.id, ids),
  })
}

export async function findAllStudents() {
  const db = await getDb()
  return db.query.profiles.findMany({
    where: eq(profiles.role, 'student'),
    orderBy: (p, { asc }) => [asc(p.fullName)],
  })
}

export async function findStudentById(studentId: string) {
  const db = await getDb()
  return db.query.profiles.findFirst({
    where: and(eq(profiles.id, studentId), eq(profiles.role, 'student')),
  })
}

export async function findAllTeachers() {
  const db = await getDb()
  return db.query.profiles.findMany({
    where: inArray(profiles.role, ['teacher', 'admin']),
    orderBy: (t, { asc }) => [asc(t.fullName)],
  })
}

export async function findAllTeacherIds(): Promise<Array<string>> {
  const db = await getDb()
  const rows = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(inArray(profiles.role, ['teacher', 'admin']))
    .orderBy(profiles.createdAt)
  return rows.map((row) => row.id)
}

export async function insertProfileOnConflict(
  values: Pick<
    typeof profiles.$inferInsert,
    'id' | 'email' | 'fullName' | 'role'
  >,
) {
  const db = await getDb()
  await db
    .insert(profiles)
    .values(values)
    .onConflictDoUpdate({
      target: profiles.id,
      set: { fullName: values.fullName, role: values.role },
    })
}
/* v8 ignore end */

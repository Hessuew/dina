import { and, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'

/* v8 ignore start */
const staffProfileColumns = {
  id: true,
  fullName: true,
  email: true,
  avatarUrl: true,
} as const

const publicProfileColumns = {
  id: true,
  fullName: true,
  avatarUrl: true,
} as const

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
  if (ids.length === 0) return []
  const db = await getDb()
  return db.query.profiles.findMany({
    where: inArray(profiles.id, ids),
  })
}

export async function findStaffProfiles() {
  const db = await getDb()
  return db.query.profiles.findMany({
    where: inArray(profiles.role, ['teacher', 'admin']),
    columns: staffProfileColumns,
    orderBy: (p, { asc }) => [asc(p.fullName)],
  })
}

export async function findStudentProfiles() {
  const db = await getDb()
  return db.query.profiles.findMany({
    where: eq(profiles.role, 'student'),
    columns: staffProfileColumns,
    orderBy: (p, { asc }) => [asc(p.fullName)],
  })
}

export async function findPublicProfileById(profileId: string) {
  const db = await getDb()
  return db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
    columns: publicProfileColumns,
  })
}

export async function findPublicProfilesByIds(ids: Array<string>) {
  if (ids.length === 0) return []
  const db = await getDb()
  return db.query.profiles.findMany({
    where: inArray(profiles.id, ids),
    columns: publicProfileColumns,
    orderBy: (p, { asc }) => [asc(p.fullName)],
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

export async function updateProfileBasic(
  userId: string,
  data: {
    fullName: string
    bio: string | null
  },
) {
  const db = await getDb()
  await db
    .update(profiles)
    .set({
      fullName: data.fullName,
      bio: data.bio,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))
}

export async function findProfileAvatarPath(
  userId: string,
): Promise<string | null | undefined> {
  const db = await getDb()
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  })
  return profile?.avatarUrl
}

export async function updateProfileAvatarPath(
  userId: string,
  avatarPath: string,
): Promise<void> {
  const db = await getDb()
  await db
    .update(profiles)
    .set({ avatarUrl: avatarPath, updatedAt: new Date() })
    .where(eq(profiles.id, userId))
}
/* v8 ignore end */

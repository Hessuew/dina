import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { discipleshipGroups } from '@/db/schema'

/* v8 ignore start */
export async function findAllDiscipleshipGroups() {
  const db = await getDb()
  return db.query.discipleshipGroups.findMany()
}

export async function findDiscipleshipGroupsByTeacher(teacherId: string) {
  const db = await getDb()
  return db.query.discipleshipGroups.findMany({
    where: eq(discipleshipGroups.teacherId, teacherId),
  })
}

export async function upsertDiscipleshipGroupAnchor(
  teacherId: string,
  anchorAt: Date,
) {
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

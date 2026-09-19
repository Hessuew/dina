import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { discipleshipPairs } from '@/db/schema'

/* v8 ignore start */
export async function findAllDiscipleshipPairs() {
  const db = await getDb()
  return db.query.discipleshipPairs.findMany()
}

export async function findDiscipleshipPairsByTeacher(teacherId: string) {
  const db = await getDb()
  return db.query.discipleshipPairs.findMany({
    where: eq(discipleshipPairs.teacherId, teacherId),
  })
}

export async function findDiscipleshipPairById(pairId: string) {
  const db = await getDb()
  return db.query.discipleshipPairs.findFirst({
    where: eq(discipleshipPairs.id, pairId),
  })
}

export async function insertDiscipleshipPair(teacherId: string) {
  const db = await getDb()
  const [row] = await db
    .insert(discipleshipPairs)
    .values({ teacherId })
    .returning()
  return row
}

export async function setDiscipleshipPairAnchor(
  pairId: string,
  anchorAt: Date,
) {
  const db = await getDb()
  await db
    .update(discipleshipPairs)
    .set({ anchorAt, updatedAt: new Date() })
    .where(eq(discipleshipPairs.id, pairId))
}

// Deleting a pair nulls each member's `pairId` via the FK's ON DELETE SET NULL.
export async function deleteDiscipleshipPair(pairId: string) {
  const db = await getDb()
  await db.delete(discipleshipPairs).where(eq(discipleshipPairs.id, pairId))
}
/* v8 ignore end */

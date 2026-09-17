import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { discipleshipGroups, discipleshipPairs } from '@/db/schema'

/* v8 ignore start -- thin DB adapters; logic lives in domain/ */

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

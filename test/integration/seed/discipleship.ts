import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import {
  discipleshipAssignments,
  discipleshipGroups,
  discipleshipPairs,
} from '@/db/schema'

export async function seedDiscipleshipAssignment(overrides: {
  studentId: string
  teacherId: string
  pairId?: string | null
  anchorAt?: Date | null
}): Promise<string> {
  const id = randomUUID()
  const db = await getDb()
  await db.insert(discipleshipAssignments).values({
    id,
    studentId: overrides.studentId,
    teacherId: overrides.teacherId,
    pairId: overrides.pairId ?? null,
    anchorAt: overrides.anchorAt ?? null,
  })
  return id
}

export async function seedDiscipleshipPair(overrides: {
  teacherId: string
  anchorAt?: Date | null
}): Promise<string> {
  const id = randomUUID()
  const db = await getDb()
  await db.insert(discipleshipPairs).values({
    id,
    teacherId: overrides.teacherId,
    anchorAt: overrides.anchorAt ?? null,
  })
  return id
}

export async function seedDiscipleshipGroup(overrides: {
  teacherId: string
  anchorAt?: Date | null
}): Promise<string> {
  const id = randomUUID()
  const db = await getDb()
  await db.insert(discipleshipGroups).values({
    id,
    teacherId: overrides.teacherId,
    anchorAt: overrides.anchorAt ?? null,
  })
  return id
}

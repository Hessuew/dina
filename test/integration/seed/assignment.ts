import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import type { assignmentStatusEnum } from '@/db/schema'
import { assignments } from '@/db/schema'

type AssignmentStatus = (typeof assignmentStatusEnum.enumValues)[number]

export async function seedAssignment(overrides: {
  id?: string
  lessonId: string
  title?: string
  dueDate?: Date
  maxGrade?: number
  status?: AssignmentStatus
  description?: string
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(assignments).values({
    id,
    lessonId: overrides.lessonId,
    title: overrides.title ?? 'Test Assignment',
    dueDate: overrides.dueDate ?? new Date(),
    ...(overrides.maxGrade !== undefined
      ? { maxGrade: overrides.maxGrade }
      : {}),
    ...(overrides.status !== undefined ? { status: overrides.status } : {}),
    ...(overrides.description !== undefined
      ? { description: overrides.description }
      : {}),
  })
  return id
}

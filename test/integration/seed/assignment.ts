import { randomUUID } from 'node:crypto'
import type { AssignmentInsert } from '@/utils/repository'
import { insertAssignment } from '@/utils/repository'

export async function seedAssignment(overrides: {
  id?: string
  lessonId: string
  title?: string
  dueDate?: Date
  maxGrade?: AssignmentInsert['maxGrade']
  status?: AssignmentInsert['status']
  description?: string
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const assignment = await insertAssignment({
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
  return assignment.id
}

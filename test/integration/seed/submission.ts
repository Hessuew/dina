import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import type { SubmissionStatus } from '@/types/database.types'
import { submissions } from '@/db/schema'

export async function seedSubmission(overrides: {
  id?: string
  assignmentId: string
  studentId: string
  status?: SubmissionStatus
  grade?: number
  submittedAt?: Date
  feedback?: string
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(submissions).values({
    id,
    assignmentId: overrides.assignmentId,
    studentId: overrides.studentId,
    ...(overrides.status ? { status: overrides.status } : {}),
    ...(overrides.grade !== undefined ? { grade: overrides.grade } : {}),
    ...(overrides.submittedAt ? { submittedAt: overrides.submittedAt } : {}),
    ...(overrides.feedback !== undefined
      ? { feedback: overrides.feedback }
      : {}),
  })
  return id
}

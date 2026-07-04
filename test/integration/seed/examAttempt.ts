import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import type { examAttemptStatusEnum } from '@/db/schema'
import { examAttempts } from '@/db/schema'

type ExamAttemptStatus = (typeof examAttemptStatusEnum.enumValues)[number]

export async function seedExamAttempt(overrides: {
  id?: string
  examId: string
  studentId: string
  status?: ExamAttemptStatus
  startedAt?: Date
  deadlineAt?: Date
  submittedAt?: Date
  autoScore?: number
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(examAttempts).values({
    id,
    examId: overrides.examId,
    studentId: overrides.studentId,
    startedAt: overrides.startedAt ?? new Date(),
    deadlineAt: overrides.deadlineAt ?? new Date(Date.now() + 30 * 60_000),
    ...(overrides.status !== undefined ? { status: overrides.status } : {}),
    ...(overrides.submittedAt !== undefined
      ? { submittedAt: overrides.submittedAt }
      : {}),
    ...(overrides.autoScore !== undefined
      ? { autoScore: overrides.autoScore }
      : {}),
  })
  return id
}

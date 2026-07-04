import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import type { examQuestionTypeEnum, examStatusEnum } from '@/db/schema'
import { examQuestionOptions, examQuestions, exams } from '@/db/schema'

type ExamStatus = (typeof examStatusEnum.enumValues)[number]
type ExamQuestionType = (typeof examQuestionTypeEnum.enumValues)[number]

export async function seedExam(overrides: {
  id?: string
  createdBy: string
  title?: string
  durationMinutes?: number
  opensAt?: Date
  closesAt?: Date
  status?: ExamStatus
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(exams).values({
    id,
    createdBy: overrides.createdBy,
    title: overrides.title ?? 'Test Exam',
    opensAt: overrides.opensAt ?? new Date(Date.now() - 60_000),
    closesAt: overrides.closesAt ?? new Date(Date.now() + 60 * 60_000),
    ...(overrides.durationMinutes !== undefined
      ? { durationMinutes: overrides.durationMinutes }
      : {}),
    ...(overrides.status !== undefined ? { status: overrides.status } : {}),
  })
  return id
}

export async function seedExamQuestion(overrides: {
  id?: string
  examId: string
  type?: ExamQuestionType
  prompt?: string
  orderIndex: number
  points?: number
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(examQuestions).values({
    id,
    examId: overrides.examId,
    type: overrides.type ?? 'multiple_choice',
    prompt: overrides.prompt ?? 'Test question?',
    orderIndex: overrides.orderIndex,
    ...(overrides.points !== undefined ? { points: overrides.points } : {}),
  })
  return id
}

export async function seedExamOption(overrides: {
  id?: string
  questionId: string
  label?: string
  orderIndex: number
  isCorrect?: boolean
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(examQuestionOptions).values({
    id,
    questionId: overrides.questionId,
    label: overrides.label ?? `Option ${overrides.orderIndex + 1}`,
    orderIndex: overrides.orderIndex,
    ...(overrides.isCorrect !== undefined
      ? { isCorrect: overrides.isCorrect }
      : {}),
  })
  return id
}

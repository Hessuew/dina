import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb } from 'test/integration/db'
import {
  seedExam,
  seedExamAttempt,
  seedExamOption,
  seedExamQuestion,
  seedProfile,
} from '@/../test/integration/seed'
import { examAnswers, examAttempts } from '@/db/schema'
import {
  createExamService,
  finalizeGradingService,
  getAttemptForGradingService,
  getAttemptForTakingService,
  getExamsForStudentService,
  gradeOpenAnswerService,
  listAttemptsForGradingService,
  publishExamService,
  saveAnswerService,
  startAttemptService,
  submitAttemptService,
  updateExamService,
  upsertQuestionService,
} from '@/utils/exam/service/exam.service'
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors'

const HOUR_MS = 60 * 60_000

function containsKeyDeep(value: unknown, key: string): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsKeyDeep(item, key))
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const record = value as Record<string, unknown>
    return (
      key in record ||
      Object.values(record).some((nested) => containsKeyDeep(nested, key))
    )
  }
  return false
}

async function seedPublishedMcExam(teacherId: string) {
  const examId = await seedExam({ createdBy: teacherId, status: 'published' })
  const mcQuestionId = await seedExamQuestion({
    examId,
    orderIndex: 0,
    points: 2,
  })
  const correctOptionId = await seedExamOption({
    questionId: mcQuestionId,
    orderIndex: 0,
    isCorrect: true,
  })
  const wrongOptionId = await seedExamOption({
    questionId: mcQuestionId,
    orderIndex: 1,
  })
  const openQuestionId = await seedExamQuestion({
    examId,
    type: 'open_ended',
    orderIndex: 1,
    points: 5,
  })
  return { examId, mcQuestionId, correctOptionId, wrongOptionId, openQuestionId }
}

describe('exam authoring (integration)', () => {
  it('creates a draft, adds questions, publishes; drafts stay hidden from students', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })
    const exam = await createExamService(
      {
        title: 'Midterm',
        opensAt: new Date(Date.now() - 60_000).toISOString(),
        closesAt: new Date(Date.now() + HOUR_MS).toISOString(),
      },
      teacherId,
    )
    expect(exam.status).toBe('draft')
    expect(exam.durationMinutes).toBe(30)

    const question = await upsertQuestionService(
      {
        examId: exam.id,
        type: 'multiple_choice',
        prompt: 'Pick A',
        orderIndex: 0,
        options: [
          { label: 'A', orderIndex: 0, isCorrect: true },
          { label: 'B', orderIndex: 1, isCorrect: false },
        ],
      },
      teacherId,
    )
    expect(question.examId).toBe(exam.id)

    expect(await getExamsForStudentService(studentId)).toEqual([])
    await publishExamService({ examId: exam.id }, teacherId)
    const studentList = await getExamsForStudentService(studentId)
    expect(studentList.map((item) => item.exam.id)).toEqual([exam.id])

    await expect(
      updateExamService({ examId: exam.id, title: 'Changed' }, teacherId),
    ).rejects.toThrow(ConflictError)
  })

  it('rejects publishing invalid multiple choice and edits by non-creator teachers', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const otherTeacherId = await seedProfile({ role: 'teacher' })
    const examId = await seedExam({ createdBy: teacherId })
    await seedExamQuestion({ examId, orderIndex: 0 })

    await expect(
      publishExamService({ examId }, teacherId),
    ).rejects.toThrow(ValidationError)

    await expect(
      updateExamService({ examId, title: 'Hijacked' }, otherTeacherId),
    ).rejects.toThrow(AuthorizationError)

    const adminId = await seedProfile({ role: 'admin' })
    const updated = await updateExamService(
      { examId, title: 'Admin edit' },
      adminId,
    )
    expect(updated.title).toBe('Admin edit')
  })
})

describe('exam taking (integration)', () => {
  it('starts within the window with a correct deadline; restart resumes the same attempt', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })
    const { examId } = await seedPublishedMcExam(teacherId)

    const payload = await startAttemptService({ examId }, studentId)
    expect(payload.attempt.status).toBe('in_progress')
    expect(
      payload.attempt.deadlineAt.getTime() -
        payload.attempt.startedAt.getTime(),
    ).toBe(30 * 60_000)

    const again = await startAttemptService({ examId }, studentId)
    expect(again.attempt.id).toBe(payload.attempt.id)
  })

  it('rejects starting outside the window and starting as a teacher', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })
    const closedExamId = await seedExam({
      createdBy: teacherId,
      status: 'published',
      opensAt: new Date(Date.now() - 2 * HOUR_MS),
      closesAt: new Date(Date.now() - HOUR_MS),
    })
    await expect(
      startAttemptService({ examId: closedExamId }, studentId),
    ).rejects.toThrow(ValidationError)

    const { examId } = await seedPublishedMcExam(teacherId)
    await expect(
      startAttemptService({ examId }, teacherId),
    ).rejects.toThrow(AuthorizationError)
  })

  it('upserts autosaved answers and never leaks isCorrect to students', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })
    const { examId, mcQuestionId, correctOptionId, wrongOptionId } =
      await seedPublishedMcExam(teacherId)
    const payload = await startAttemptService({ examId }, studentId)
    expect(containsKeyDeep(payload, 'isCorrect')).toBe(false)

    await saveAnswerService(
      {
        attemptId: payload.attempt.id,
        questionId: mcQuestionId,
        selectedOptionId: wrongOptionId,
      },
      studentId,
    )
    await saveAnswerService(
      {
        attemptId: payload.attempt.id,
        questionId: mcQuestionId,
        selectedOptionId: correctOptionId,
      },
      studentId,
    )
    const db = await getDb()
    const rows = await db
      .select()
      .from(examAnswers)
      .where(eq(examAnswers.attemptId, payload.attempt.id))
    expect(rows).toHaveLength(1)
    expect(rows[0].selectedOptionId).toBe(correctOptionId)
  })

  it('rejects mismatched answer shapes and foreign options', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })
    const { examId, mcQuestionId, openQuestionId, correctOptionId } =
      await seedPublishedMcExam(teacherId)
    const payload = await startAttemptService({ examId }, studentId)

    await expect(
      saveAnswerService(
        {
          attemptId: payload.attempt.id,
          questionId: mcQuestionId,
          textAnswer: 'not an option',
        },
        studentId,
      ),
    ).rejects.toThrow(ValidationError)
    await expect(
      saveAnswerService(
        {
          attemptId: payload.attempt.id,
          questionId: openQuestionId,
          selectedOptionId: correctOptionId,
        },
        studentId,
      ),
    ).rejects.toThrow(ValidationError)
  })

  it('rejects saves past deadline + grace and lazily finalizes the attempt', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })
    const { examId, mcQuestionId, correctOptionId } =
      await seedPublishedMcExam(teacherId)
    const deadlineAt = new Date(Date.now() - 60_000)
    const attemptId = await seedExamAttempt({
      examId,
      studentId,
      startedAt: new Date(Date.now() - 31 * 60_000),
      deadlineAt,
    })

    await expect(
      saveAnswerService(
        { attemptId, questionId: mcQuestionId, selectedOptionId: correctOptionId },
        studentId,
      ),
    ).rejects.toThrow(ValidationError)

    const db = await getDb()
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
    expect(attempt.status).toBe('submitted')
    expect(attempt.submittedAt).toEqual(deadlineAt)
  })

  it('lazily finalizes an expired attempt on resume read with submittedAt = deadlineAt', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })
    const { examId } = await seedPublishedMcExam(teacherId)
    const deadlineAt = new Date(Date.now() - 5 * 60_000)
    await seedExamAttempt({ examId, studentId, deadlineAt })

    const payload = await getAttemptForTakingService({ examId }, studentId)
    expect(payload.attempt.status).toBe('submitted')
    expect(payload.attempt.submittedAt).toEqual(deadlineAt)
    expect(payload.attempt.totalScore).toBeNull()
  })

  it('submit auto-grades multiple choice and double submit is idempotent', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })
    const { examId, mcQuestionId, correctOptionId, openQuestionId } =
      await seedPublishedMcExam(teacherId)
    const payload = await startAttemptService({ examId }, studentId)
    await saveAnswerService(
      {
        attemptId: payload.attempt.id,
        questionId: mcQuestionId,
        selectedOptionId: correctOptionId,
      },
      studentId,
    )
    await saveAnswerService(
      { attemptId: payload.attempt.id, questionId: openQuestionId, textAnswer: 'essay' },
      studentId,
    )

    const submitted = await submitExamAndReturn(payload.attempt.id, studentId)
    expect(submitted.status).toBe('submitted')
    expect(submitted.totalScore).toBeNull()

    const again = await submitExamAndReturn(payload.attempt.id, studentId)
    expect(again.status).toBe('submitted')
    expect(again.submittedAt).toEqual(submitted.submittedAt)

    const db = await getDb()
    const [row] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, payload.attempt.id))
    expect(row.autoScore).toBe(2)
  })
})

function submitExamAndReturn(attemptId: string, userId: string) {
  return submitAttemptService({ attemptId }, userId)
}

describe('exam grading (integration)', () => {
  async function submitFullAttempt(teacherId: string) {
    const studentId = await seedProfile({ role: 'student' })
    const seeded = await seedPublishedMcExam(teacherId)
    const payload = await startAttemptService({ examId: seeded.examId }, studentId)
    await saveAnswerService(
      {
        attemptId: payload.attempt.id,
        questionId: seeded.mcQuestionId,
        selectedOptionId: seeded.correctOptionId,
      },
      studentId,
    )
    await saveAnswerService(
      {
        attemptId: payload.attempt.id,
        questionId: seeded.openQuestionId,
        textAnswer: 'my essay',
      },
      studentId,
    )
    await submitAttemptService({ attemptId: payload.attempt.id }, studentId)
    return { ...seeded, studentId, attemptId: payload.attempt.id }
  }

  it('blocks students from grading surfaces', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const { examId, attemptId, studentId } = await submitFullAttempt(teacherId)
    await expect(
      listAttemptsForGradingService({ examId }, studentId),
    ).rejects.toThrow(AuthorizationError)
    await expect(
      getAttemptForGradingService({ attemptId }, studentId),
    ).rejects.toThrow(AuthorizationError)
  })

  it('grades open answers, blocks finalize until done, then reveals scores to the student', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const { examId, attemptId, studentId, openQuestionId } =
      await submitFullAttempt(teacherId)

    await expect(
      finalizeGradingService({ attemptId }, teacherId),
    ).rejects.toThrow(ValidationError)

    const grading = await getAttemptForGradingService({ attemptId }, teacherId)
    const openAnswer = grading.answers.find(
      (answer) => answer.questionId === openQuestionId,
    )
    expect(openAnswer).toBeDefined()

    await expect(
      gradeOpenAnswerService(
        { answerId: openAnswer!.id, awardedPoints: 99 },
        teacherId,
      ),
    ).rejects.toThrow(ValidationError)

    await gradeOpenAnswerService(
      { answerId: openAnswer!.id, awardedPoints: 4 },
      teacherId,
    )
    await finalizeGradingService({ attemptId }, teacherId)

    const result = await getAttemptForTakingService({ examId }, studentId)
    expect(result.attempt.status).toBe('graded')
    expect(result.attempt.autoScore).toBe(2)
    expect(result.attempt.manualScore).toBe(4)
    expect(result.attempt.totalScore).toBe(6)
  })

  it('rejects grading a multiple-choice answer manually and double finalize', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const { attemptId, mcQuestionId, openQuestionId } =
      await submitFullAttempt(teacherId)
    const grading = await getAttemptForGradingService({ attemptId }, teacherId)
    const mcAnswer = grading.answers.find(
      (answer) => answer.questionId === mcQuestionId,
    )
    await expect(
      gradeOpenAnswerService({ answerId: mcAnswer!.id, awardedPoints: 1 }, teacherId),
    ).rejects.toThrow(ValidationError)

    const openAnswer = grading.answers.find(
      (answer) => answer.questionId === openQuestionId,
    )
    await gradeOpenAnswerService(
      { answerId: openAnswer!.id, awardedPoints: 3 },
      teacherId,
    )
    await finalizeGradingService({ attemptId }, teacherId)
    await expect(
      finalizeGradingService({ attemptId }, teacherId),
    ).rejects.toThrow(ConflictError)
  })

  it('finalizes expired attempts when listing for grading', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })
    const { examId } = await seedPublishedMcExam(teacherId)
    await seedExamAttempt({
      examId,
      studentId,
      deadlineAt: new Date(Date.now() - 5 * 60_000),
    })
    const attempts = await listAttemptsForGradingService({ examId }, teacherId)
    expect(attempts).toHaveLength(1)
    expect(attempts[0].status).toBe('submitted')
  })

  it('404s for a missing attempt', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    await expect(
      getAttemptForGradingService(
        { attemptId: '00000000-0000-0000-0000-000000000000' },
        teacherId,
      ),
    ).rejects.toThrow(NotFoundError)
  })
})

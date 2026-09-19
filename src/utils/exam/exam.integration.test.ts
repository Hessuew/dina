import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthorizationService } from '@/utils/authz/types'
import {
  DefaultAuthorizationService,
  setAuthorizationService,
} from '@/utils/authz'
import {
  seedExam,
  seedExamAttempt,
  seedExamOption,
  seedExamQuestion,
  seedProfile,
} from '@/../test/integration/seed'
import {
  createExamService,
  finalizeGradingService,
  getAttemptForGradingService,
  getAttemptForTakingService,
  getExamForAuthorService,
  getExamForStudentService,
  getExamsForStudentService,
  getExamsForTeacherService,
  gradeOpenAnswerService,
  listAttemptsForGradingService,
  publishExamService,
  saveAnswerService,
  saveExamChangesService,
  startAttemptService,
  submitAttemptService,
} from '@/utils/exam/service/exam.service'
import * as sharedRepository from '@/utils/repository'
import { withObservabilityRequest } from '@/utils/observability/request-context'
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
  return {
    examId,
    mcQuestionId,
    correctOptionId,
    wrongOptionId,
    openQuestionId,
  }
}

describe('exam authoring (integration)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a draft, adds questions, publishes; drafts stay hidden from students', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
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
    expect(exam.durationMinutes).toBe(45)

    await saveExamChangesService(
      {
        examId: exam.id,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        opensAt: exam.opensAt.toISOString(),
        closesAt: exam.closesAt.toISOString(),
        questions: [
          {
            type: 'multiple_choice',
            prompt: 'Pick A',
            orderIndex: 0,
            options: [
              { label: 'A', orderIndex: 0, isCorrect: true },
              { label: 'B', orderIndex: 1, isCorrect: false },
            ],
          },
        ],
        deletedQuestionIds: [],
      },
      teacherId,
    )
    const [question] = await sharedRepository.findExamQuestionsByExamId(exam.id)
    const questionOptions =
      await sharedRepository.findExamQuestionOptionsByQuestionIds([question.id])

    expect(await getExamsForStudentService(studentId)).toEqual([])
    expect(
      await getExamForStudentService({ examId: exam.id }, studentId),
    ).toBeNull()
    await publishExamService({ examId: exam.id }, teacherId)
    const studentList = await getExamsForStudentService(studentId)
    expect(studentList.map((item) => item.exam.id)).toEqual([exam.id])
    expect(studentList[0]?.exam.totalPoints).toBe(1)
    expect(
      await getExamForStudentService({ examId: exam.id }, studentId),
    ).toMatchObject({ exam: { id: exam.id, totalPoints: 1 }, attempt: null })

    await expect(
      saveExamChangesService(
        {
          examId: exam.id,
          title: 'Changed',
          durationMinutes: exam.durationMinutes,
          opensAt: exam.opensAt.toISOString(),
          closesAt: exam.closesAt.toISOString(),
          questions: [],
          deletedQuestionIds: [],
        },
        teacherId,
      ),
    ).rejects.toThrow(ConflictError)

    const adminId = await seedProfile({ role: 'admin' })
    await saveExamChangesService(
      {
        examId: exam.id,
        title: 'Admin Fixed Title',
        durationMinutes: exam.durationMinutes,
        opensAt: exam.opensAt.toISOString(),
        closesAt: exam.closesAt.toISOString(),
        questions: [
          {
            questionId: question.id,
            type: 'multiple_choice',
            prompt: 'Pick A (fixed typo)',
            orderIndex: 0,
            points: question.points,
            options: questionOptions.map((option) => ({
              id: option.id,
              label: option.label,
              orderIndex: option.orderIndex,
              isCorrect: option.isCorrect,
            })),
          },
        ],
        deletedQuestionIds: [],
      },
      adminId,
    )
    const updatedQuestion = (
      await sharedRepository.findExamQuestionsByExamId(exam.id)
    ).find((candidate) => candidate.id === question.id)!
    const updatedExam = (await sharedRepository.findExamById(exam.id))!
    expect(updatedExam.title).toBe('Admin Fixed Title')
    expect(updatedQuestion.prompt).toBe('Pick A (fixed typo)')

    const lines = infoSpy.mock.calls.map(([line]) => String(line))
    const events = lines.map((line) => JSON.parse(line))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'exam_created',
          path: 'serverFn:createExam',
          actorId: teacherId,
          examId: exam.id,
          examStatus: 'draft',
          status: 'success',
        }),
        expect.objectContaining({
          event: 'exam_updated',
          path: 'serverFn:saveExamChanges',
          actorId: teacherId,
          examId: exam.id,
          examStatus: 'draft',
          questionCount: 1,
          status: 'success',
        }),
        expect.objectContaining({
          event: 'exam_published',
          path: 'serverFn:publishExam',
          actorId: teacherId,
          examId: exam.id,
          examStatus: 'published',
          questionCount: 1,
          status: 'success',
        }),
      ]),
    )
    expect(events.every((event) => typeof event.durationMs === 'number')).toBe(
      true,
    )
    expect(lines.join('\n')).not.toContain('Midterm')
    expect(lines.join('\n')).not.toContain('Pick A')
    expect(lines.join('\n')).not.toContain('Admin Fixed Title')
  })

  it('rejects publishing invalid multiple choice and edits by non-creator teachers', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const otherTeacherId = await seedProfile({ role: 'teacher' })
    const examId = await seedExam({ createdBy: teacherId })
    await seedExamQuestion({ examId, orderIndex: 0 })

    await expect(publishExamService({ examId }, teacherId)).rejects.toThrow(
      ValidationError,
    )

    await expect(
      saveExamChangesService(
        {
          examId,
          title: 'Hijacked',
          durationMinutes: 45,
          opensAt: new Date(Date.now() - 60_000).toISOString(),
          closesAt: new Date(Date.now() + HOUR_MS).toISOString(),
          questions: [],
          deletedQuestionIds: [],
        },
        otherTeacherId,
      ),
    ).rejects.toThrow(AuthorizationError)

    const adminId = await seedProfile({ role: 'admin' })
    await saveExamChangesService(
      {
        examId,
        title: 'Admin edit',
        durationMinutes: 45,
        opensAt: new Date(Date.now() - 60_000).toISOString(),
        closesAt: new Date(Date.now() + HOUR_MS).toISOString(),
        questions: [],
        deletedQuestionIds: [],
      },
      adminId,
    )
    const updated = (await sharedRepository.findExamById(examId))!
    expect(updated.title).toBe('Admin edit')
  })

  it('logs stable authoring persistence failures without raw database details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const examId = await seedExam({ createdBy: teacherId })
    const questionId = await seedExamQuestion({ examId, orderIndex: 0 })
    await seedExamOption({ questionId, orderIndex: 0, isCorrect: true })
    await seedExamOption({ questionId, orderIndex: 1 })
    vi.spyOn(sharedRepository, 'setExamStatus').mockRejectedValueOnce(
      new Error('database connection secret'),
    )

    await expect(publishExamService({ examId }, teacherId)).rejects.toThrow(
      'database connection secret',
    )

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    const event = JSON.parse(line)
    expect(event).toMatchObject({
      event: 'exam_publish_failed',
      path: 'serverFn:publishExam',
      actorId: teacherId,
      examId,
      status: 'failure',
      errorCategory: 'exam_persistence',
    })
    expect(line).not.toContain('database connection secret')
  })

  it('saves exam details, question edits, additions, and deletions together', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const examId = await seedExam({ createdBy: teacherId })
    const keptQuestionId = await seedExamQuestion({ examId, orderIndex: 0 })
    const keptOptionId = await seedExamOption({
      questionId: keptQuestionId,
      orderIndex: 0,
      isCorrect: true,
    })
    const deletedQuestionId = await seedExamQuestion({
      examId,
      orderIndex: 1,
    })

    await saveExamChangesService(
      {
        examId,
        title: 'Updated exam',
        durationMinutes: 60,
        opensAt: new Date('2026-07-04T10:00:00.000Z').toISOString(),
        closesAt: new Date('2026-07-04T12:00:00.000Z').toISOString(),
        questions: [
          {
            questionId: keptQuestionId,
            type: 'multiple_choice',
            prompt: 'Updated prompt',
            orderIndex: 0,
            points: 3,
            options: [
              {
                id: keptOptionId,
                label: 'Updated option',
                orderIndex: 0,
                isCorrect: true,
              },
              {
                label: 'New option',
                orderIndex: 1,
                isCorrect: false,
              },
            ],
          },
          {
            type: 'open_ended',
            prompt: 'Explain your answer',
            orderIndex: 1,
            points: 4,
          },
        ],
        deletedQuestionIds: [deletedQuestionId],
      },
      teacherId,
    )

    const exam = (await sharedRepository.findExamById(examId))!
    const savedQuestions =
      await sharedRepository.findExamQuestionsByExamId(examId)
    const savedOptions =
      await sharedRepository.findExamQuestionOptionsByQuestionIds([
        keptQuestionId,
      ])

    expect(exam.title).toBe('Updated exam')
    expect(exam.durationMinutes).toBe(60)
    expect(savedQuestions).toHaveLength(2)
    expect(savedQuestions.map((question) => question.prompt)).toEqual([
      'Updated prompt',
      'Explain your answer',
    ])
    expect(savedOptions.map((option) => option.label)).toEqual([
      'Updated option',
      'New option',
    ])
  })
})

describe('exam reads (integration)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs safe telemetry for author, catalog, and attempt reads', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })
    const { examId } = await seedPublishedMcExam(teacherId)

    await getExamForAuthorService({ examId }, teacherId)
    await getExamsForTeacherService(teacherId)
    await getExamsForStudentService(studentId)
    await getExamForStudentService({ examId }, studentId)
    const taking = await startAttemptService({ examId }, studentId)
    await getAttemptForTakingService({ examId }, studentId)
    await listAttemptsForGradingService({ examId }, teacherId)
    await getAttemptForGradingService(
      { attemptId: taking.attempt.id },
      teacherId,
    )

    const lines = infoSpy.mock.calls.map(([line]) => String(line))
    const events = lines
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((event) => event.event === 'exam_read_loaded')
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'serverFn:getExamForAuthor',
          actorId: teacherId,
          examId,
          role: 'teacher',
          examStatus: 'published',
          questionCount: 2,
          optionCount: 2,
          attemptCount: 0,
          canEdit: false,
        }),
        expect.objectContaining({
          path: 'serverFn:getExamsForTeacher',
          actorId: teacherId,
          role: 'teacher',
          examCount: 1,
        }),
        expect.objectContaining({
          path: 'serverFn:getExamsForStudent',
          actorId: studentId,
          role: 'student',
          examCount: 1,
          attemptedCount: 0,
        }),
        expect.objectContaining({
          path: 'serverFn:getExamForStudent',
          actorId: studentId,
          examId,
          role: 'student',
          examCount: 1,
          attemptedCount: 0,
        }),
        expect.objectContaining({
          path: 'serverFn:getExamAttemptForTaking',
          actorId: studentId,
          examId,
          attemptId: taking.attempt.id,
          role: 'student',
          attemptStatus: 'in_progress',
          questionCount: 2,
          answerCount: 0,
        }),
        expect.objectContaining({
          path: 'serverFn:listExamAttemptsForGrading',
          actorId: teacherId,
          examId,
          role: 'teacher',
          attemptCount: 1,
        }),
        expect.objectContaining({
          path: 'serverFn:getExamAttemptForGrading',
          actorId: teacherId,
          examId,
          attemptId: taking.attempt.id,
          role: 'teacher',
          attemptStatus: 'in_progress',
          questionCount: 2,
          optionCount: 2,
          answerCount: 0,
        }),
      ]),
    )
    expect(events.every((event) => typeof event.durationMs === 'number')).toBe(
      true,
    )
    expect(lines.join('\n')).not.toContain('Test Exam')
    expect(lines.join('\n')).not.toContain('Test question?')
    expect(lines.join('\n')).not.toContain('Option 1')
  })

  it('logs stable read failures without raw persistence details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const examId = await seedExam({
      createdBy: teacherId,
      title: 'Private exam title',
      status: 'published',
    })
    vi.spyOn(
      sharedRepository,
      'findExamQuestionsByExamId',
    ).mockRejectedValueOnce(new Error('exam prompt database secret'))

    await expect(
      getExamForAuthorService({ examId }, teacherId),
    ).rejects.toThrow('exam prompt database secret')

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(JSON.parse(line)).toMatchObject({
      event: 'exam_read_failed',
      path: 'serverFn:getExamForAuthor',
      actorId: teacherId,
      examId,
      role: 'teacher',
      status: 'failure',
      errorCategory: 'exam_read_persistence',
    })
    expect(line).not.toContain('exam prompt database secret')
  })
})

describe('exam authoring authorization preflight telemetry (integration)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    setAuthorizationService(new DefaultAuthorizationService())
  })

  it.each([
    {
      name: 'create',
      event: 'exam_create_failed',
      path: 'serverFn:createExam',
      run: (userId: string): Promise<unknown> =>
        createExamService(
          {
            title: 'Private exam title',
            opensAt: new Date(Date.now() - 60_000).toISOString(),
            closesAt: new Date(Date.now() + HOUR_MS).toISOString(),
          },
          userId,
        ),
    },
    {
      name: 'save',
      event: 'exam_update_failed',
      path: 'serverFn:saveExamChanges',
      run: (userId: string): Promise<unknown> =>
        saveExamChangesService(
          {
            examId: randomUUID(),
            title: 'Private exam title',
            durationMinutes: 45,
            opensAt: new Date(Date.now() - 60_000).toISOString(),
            closesAt: new Date(Date.now() + HOUR_MS).toISOString(),
            questions: [],
            deletedQuestionIds: [],
          },
          userId,
        ),
    },
    {
      name: 'publish',
      event: 'exam_publish_failed',
      path: 'serverFn:publishExam',
      run: (userId: string): Promise<unknown> =>
        publishExamService({ examId: randomUUID() }, userId),
    },
  ])(
    'logs unexpected author-role persistence failures for $name without raw details',
    async ({ event, path, run }) => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const repositoryError = new Error(
        'exam role connectionString=secret; email=exam-author@test.dev',
      )
      setAuthorizationService({
        getRole: vi.fn().mockRejectedValue(repositoryError),
      } as unknown as AuthorizationService)

      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org/exams', {
            headers: { 'x-request-id': 'exam-author-role-failure' },
          }),
          () => run(randomUUID()),
        ),
      ).rejects.toBe(repositoryError)

      const line = String(errorSpy.mock.calls.at(-1)?.[0])
      expect(JSON.parse(line)).toMatchObject({
        event,
        path,
        requestId: 'exam-author-role-failure',
        status: 'failure',
        errorCategory: 'exam_authorization_persistence',
        durationMs: expect.any(Number),
      })
      expect(line).not.toContain('connectionString')
      expect(line).not.toContain('exam-author@test.dev')
    },
  )

  it.each([
    {
      name: 'create',
      run: (userId: string): Promise<unknown> =>
        createExamService(
          {
            title: 'Denied exam',
            opensAt: new Date(Date.now() - 60_000).toISOString(),
            closesAt: new Date(Date.now() + HOUR_MS).toISOString(),
          },
          userId,
        ),
    },
    {
      name: 'save',
      run: (userId: string): Promise<unknown> =>
        saveExamChangesService(
          {
            examId: randomUUID(),
            title: 'Denied exam',
            durationMinutes: 45,
            opensAt: new Date(Date.now() - 60_000).toISOString(),
            closesAt: new Date(Date.now() + HOUR_MS).toISOString(),
            questions: [],
            deletedQuestionIds: [],
          },
          userId,
        ),
    },
    {
      name: 'publish',
      run: (userId: string): Promise<unknown> =>
        publishExamService({ examId: randomUUID() }, userId),
    },
  ])('keeps expected $name author-role denials quiet', async ({ run }) => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const denial = new AuthorizationError('teacher or admin access required')
    setAuthorizationService({
      getRole: vi.fn().mockRejectedValue(denial),
    } as unknown as AuthorizationService)

    await expect(run(randomUUID())).rejects.toBe(denial)
    expect(errorSpy).not.toHaveBeenCalled()
  })
})

describe('exam grading authorization preflight telemetry (integration)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    setAuthorizationService(new DefaultAuthorizationService())
  })

  it.each([
    {
      name: 'open-answer grading',
      event: 'exam_open_answer_grade_failed',
      path: 'serverFn:gradeOpenAnswer',
      run: (userId: string): Promise<unknown> =>
        gradeOpenAnswerService(
          { answerId: randomUUID(), awardedPoints: 1 },
          userId,
        ),
    },
    {
      name: 'grading finalization',
      event: 'exam_grading_finalize_failed',
      path: 'serverFn:finalizeGrading',
      run: (userId: string): Promise<unknown> =>
        finalizeGradingService({ attemptId: randomUUID() }, userId),
    },
  ])(
    'logs unexpected grader-role persistence failures for $name without raw details',
    async ({ event, path, run }) => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const repositoryError = new Error(
        'grader role connectionString=secret; email=grader@test.dev',
      )
      setAuthorizationService({
        getRole: vi.fn().mockRejectedValue(repositoryError),
      } as unknown as AuthorizationService)

      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org/exams', {
            headers: { 'x-request-id': 'exam-grader-role-failure' },
          }),
          () => run(randomUUID()),
        ),
      ).rejects.toBe(repositoryError)

      const line = String(errorSpy.mock.calls.at(-1)?.[0])
      expect(JSON.parse(line)).toMatchObject({
        event,
        path,
        requestId: 'exam-grader-role-failure',
        status: 'failure',
        errorCategory: 'exam_grading_authorization_persistence',
        durationMs: expect.any(Number),
      })
      expect(line).not.toContain('connectionString')
      expect(line).not.toContain('grader@test.dev')
    },
  )

  it.each([
    (userId: string): Promise<unknown> =>
      gradeOpenAnswerService(
        { answerId: randomUUID(), awardedPoints: 1 },
        userId,
      ),
    (userId: string): Promise<unknown> =>
      finalizeGradingService({ attemptId: randomUUID() }, userId),
  ])('keeps expected grader-role denials quiet', async (run) => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const denial = new AuthorizationError('teacher or admin access required')
    setAuthorizationService({
      getRole: vi.fn().mockRejectedValue(denial),
    } as unknown as AuthorizationService)

    await expect(run(randomUUID())).rejects.toBe(denial)
    expect(errorSpy).not.toHaveBeenCalled()
  })
})

describe('exam taking (integration)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts within the window with a correct deadline; restart resumes the same attempt', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })
    const { examId } = await seedPublishedMcExam(teacherId)

    const payload = await startAttemptService({ examId }, studentId)
    expect(payload.attempt.status).toBe('in_progress')
    expect(
      payload.attempt.deadlineAt.getTime() -
        payload.attempt.startedAt.getTime(),
    ).toBe(45 * 60_000)

    const again = await startAttemptService({ examId }, studentId)
    expect(again.attempt.id).toBe(payload.attempt.id)

    const events = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .filter((entry) =>
        ['exam_attempt_started', 'exam_attempt_resumed'].includes(
          String(entry.event),
        ),
      )
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'exam_attempt_started',
          path: 'serverFn:startExamAttempt',
          studentId,
          examId,
          attemptId: payload.attempt.id,
          status: 'started',
          attemptStatus: 'in_progress',
        }),
        expect.objectContaining({
          event: 'exam_attempt_resumed',
          path: 'serverFn:startExamAttempt',
          studentId,
          examId,
          attemptId: payload.attempt.id,
          status: 'resumed',
          attemptStatus: 'in_progress',
        }),
      ]),
    )
    expect(events.every((event) => typeof event.durationMs === 'number')).toBe(
      true,
    )
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
    await expect(startAttemptService({ examId }, teacherId)).rejects.toThrow(
      AuthorizationError,
    )
  })

  it('rejects unknown callers from student exam surfaces', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const { examId } = await seedPublishedMcExam(teacherId)
    const unknownCallerId = randomUUID()

    await expect(getExamsForStudentService(unknownCallerId)).rejects.toThrow(
      AuthorizationError,
    )
    await expect(
      getExamForStudentService({ examId }, unknownCallerId),
    ).rejects.toThrow(AuthorizationError)
    await expect(
      startAttemptService({ examId }, unknownCallerId),
    ).rejects.toThrow(AuthorizationError)
  })

  it('logs exam lookup failures before starting an attempt', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })
    const { examId } = await seedPublishedMcExam(teacherId)
    const repositoryError = new Error('exam lookup database secret')
    vi.spyOn(sharedRepository, 'findExamById').mockRejectedValueOnce(
      repositoryError,
    )

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org/exams/start', {
          headers: { 'x-request-id': 'exam-start-preflight' },
        }),
        () => startAttemptService({ examId }, studentId),
      ),
    ).rejects.toBe(repositoryError)

    const serialized = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(JSON.parse(serialized)).toMatchObject({
      event: 'exam_attempt_start_failed',
      path: 'serverFn:startExamAttempt',
      requestId: 'exam-start-preflight',
      studentId,
      examId,
      status: 'failure',
      errorCategory: 'exam_attempt_persistence',
      durationMs: expect.any(Number),
    })
    expect(serialized).not.toContain('exam lookup database secret')
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
    const rows = await sharedRepository.findExamAnswersByAttempt(
      payload.attempt.id,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].selectedOptionId).toBe(correctOptionId)
  })

  it('logs answer saves without answer values and redacts persistence failures', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
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
      {
        attemptId: payload.attempt.id,
        questionId: openQuestionId,
        textAnswer: 'private exam response',
      },
      studentId,
    )
    const answerEvents = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .filter((entry) => entry.event === 'exam_answer_saved')
    expect(answerEvents).toHaveLength(2)
    expect(answerEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'serverFn:saveExamAnswer',
          studentId,
          attemptId: payload.attempt.id,
          examId,
          questionId: mcQuestionId,
          questionType: 'multiple_choice',
          status: 'saved',
        }),
        expect.objectContaining({
          questionId: openQuestionId,
          questionType: 'open_ended',
        }),
      ]),
    )
    expect(JSON.stringify(answerEvents)).not.toContain(correctOptionId)
    expect(JSON.stringify(answerEvents)).not.toContain('private exam response')

    vi.spyOn(sharedRepository, 'upsertExamAnswer').mockRejectedValueOnce(
      new Error('answer database secret'),
    )
    await expect(
      saveAnswerService(
        {
          attemptId: payload.attempt.id,
          questionId: mcQuestionId,
          selectedOptionId: correctOptionId,
        },
        studentId,
      ),
    ).rejects.toThrow('answer database secret')
    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(JSON.parse(line)).toMatchObject({
      event: 'exam_answer_save_failed',
      path: 'serverFn:saveExamAnswer',
      studentId,
      attemptId: payload.attempt.id,
      examId,
      status: 'failure',
      errorCategory: 'exam_answer_persistence',
    })
    expect(line).not.toContain('answer database secret')
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
        {
          attemptId,
          questionId: mcQuestionId,
          selectedOptionId: correctOptionId,
        },
        studentId,
      ),
    ).rejects.toThrow(ValidationError)

    const attempt = (await sharedRepository.findAttemptById(attemptId))!
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
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
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
      {
        attemptId: payload.attempt.id,
        questionId: openQuestionId,
        textAnswer: 'essay',
      },
      studentId,
    )

    const submitted = await submitExamAndReturn(payload.attempt.id, studentId)
    expect(submitted.status).toBe('submitted')
    expect(submitted.totalScore).toBeNull()

    const again = await submitExamAndReturn(payload.attempt.id, studentId)
    expect(again.status).toBe('submitted')
    expect(again.submittedAt).toEqual(submitted.submittedAt)

    const row = (await sharedRepository.findAttemptById(payload.attempt.id))!
    expect(row.autoScore).toBe(2)

    const events = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .filter((entry) =>
        [
          'exam_attempt_submitted',
          'exam_attempt_submission_ignored',
          'exam_attempt_submission_failed',
        ].includes(String(entry.event)),
      )
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'exam_attempt_submitted',
          path: 'serverFn:submitExamAttempt',
          status: 'submitted',
          attemptId: payload.attempt.id,
          examId,
          studentId,
          submissionMode: 'manual',
        }),
        expect.objectContaining({
          event: 'exam_attempt_submission_ignored',
          path: 'serverFn:submitExamAttempt',
          status: 'already_finalized',
          attemptId: payload.attempt.id,
          examId,
          studentId,
        }),
      ]),
    )
    expect(events.every((event) => typeof event.durationMs === 'number')).toBe(
      true,
    )
    expect(events.every((event) => !('textAnswer' in event))).toBe(true)
  })

  it('logs attempt lookup failures before submitting', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const studentId = await seedProfile({ role: 'student' })
    const attemptId = randomUUID()
    const repositoryError = new Error('attempt lookup database secret')
    vi.spyOn(sharedRepository, 'findAttemptById').mockRejectedValueOnce(
      repositoryError,
    )

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org/exams/submit', {
          headers: { 'x-request-id': 'exam-submit-preflight' },
        }),
        () => submitExamAndReturn(attemptId, studentId),
      ),
    ).rejects.toBe(repositoryError)

    const serialized = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(JSON.parse(serialized)).toMatchObject({
      event: 'exam_attempt_submission_failed',
      path: 'serverFn:submitExamAttempt',
      requestId: 'exam-submit-preflight',
      studentId,
      attemptId,
      status: 'failure',
      errorCategory: 'exam_attempt_persistence',
    })
    expect(serialized).not.toContain('attempt lookup database secret')
  })
})

function submitExamAndReturn(attemptId: string, userId: string) {
  return submitAttemptService({ attemptId }, userId)
}

describe('exam grading (integration)', () => {
  async function submitFullAttempt(teacherId: string) {
    const studentId = await seedProfile({ role: 'student' })
    const seeded = await seedPublishedMcExam(teacherId)
    const payload = await startAttemptService(
      { examId: seeded.examId },
      studentId,
    )
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
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const {
      examId,
      attemptId,
      studentId,
      mcQuestionId,
      correctOptionId,
      openQuestionId,
    } = await submitFullAttempt(teacherId)

    const submittedView = await getAttemptForTakingService(
      { examId },
      studentId,
    )
    expect(
      submittedView.options.find((option) => option.id === correctOptionId),
    ).not.toHaveProperty('isCorrect')
    expect(
      submittedView.answers.find((answer) => answer.questionId === mcQuestionId)
        ?.isCorrect,
    ).toBeNull()

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

    const gradingEvents = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .filter((entry) =>
        ['exam_open_answer_graded', 'exam_grading_finalized'].includes(
          String(entry.event),
        ),
      )
    expect(gradingEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'exam_open_answer_graded',
          path: 'serverFn:gradeOpenAnswer',
          graderId: teacherId,
          answerId: openAnswer!.id,
          attemptId,
          examId,
          questionId: openQuestionId,
          questionType: 'open_ended',
          status: 'graded',
        }),
        expect.objectContaining({
          event: 'exam_grading_finalized',
          path: 'serverFn:finalizeGrading',
          graderId: teacherId,
          attemptId,
          examId,
          status: 'graded',
        }),
      ]),
    )
    expect(
      gradingEvents.every((event) => typeof event.durationMs === 'number'),
    ).toBe(true)
    expect(
      gradingEvents.every(
        (event) =>
          !('awardedPoints' in event) &&
          !('autoScore' in event) &&
          !('manualScore' in event) &&
          !('totalScore' in event) &&
          !('textAnswer' in event),
      ),
    ).toBe(true)

    const result = await getAttemptForTakingService({ examId }, studentId)
    expect(result.attempt.status).toBe('graded')
    expect(result.attempt.autoScore).toBe(2)
    expect(result.attempt.manualScore).toBe(4)
    expect(result.attempt.totalScore).toBe(6)
    expect(
      result.options.find((option) => option.id === correctOptionId)?.isCorrect,
    ).toBe(true)
    expect(
      result.answers.find((answer) => answer.questionId === mcQuestionId),
    ).toMatchObject({ isCorrect: true, awardedPoints: 2 })
  })

  it('logs grading persistence failures without scores or raw errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const { examId, attemptId, openQuestionId } =
      await submitFullAttempt(teacherId)
    const grading = await getAttemptForGradingService({ attemptId }, teacherId)
    const openAnswer = grading.answers.find(
      (answer) => answer.questionId === openQuestionId,
    )
    expect(openAnswer).toBeDefined()

    vi.spyOn(sharedRepository, 'updateExamAnswerGrade').mockRejectedValueOnce(
      new Error('grading database secret'),
    )
    await expect(
      gradeOpenAnswerService(
        { answerId: openAnswer!.id, awardedPoints: 4 },
        teacherId,
      ),
    ).rejects.toThrow('grading database secret')

    const gradeFailureLine = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(JSON.parse(gradeFailureLine)).toMatchObject({
      event: 'exam_open_answer_grade_failed',
      path: 'serverFn:gradeOpenAnswer',
      graderId: teacherId,
      answerId: openAnswer!.id,
      attemptId,
      examId,
      questionId: openQuestionId,
      status: 'failure',
      errorCategory: 'exam_grading_persistence',
    })
    expect(gradeFailureLine).not.toContain('grading database secret')

    await gradeOpenAnswerService(
      { answerId: openAnswer!.id, awardedPoints: 4 },
      teacherId,
    )
    vi.spyOn(sharedRepository, 'markAttemptGraded').mockRejectedValueOnce(
      new Error('finalize database secret'),
    )
    await expect(
      finalizeGradingService({ attemptId }, teacherId),
    ).rejects.toThrow('finalize database secret')

    const finalizeFailureLine = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(JSON.parse(finalizeFailureLine)).toMatchObject({
      event: 'exam_grading_finalize_failed',
      path: 'serverFn:finalizeGrading',
      graderId: teacherId,
      attemptId,
      examId,
      status: 'failure',
      errorCategory: 'exam_grading_persistence',
    })
    expect(finalizeFailureLine).not.toContain('finalize database secret')
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
      gradeOpenAnswerService(
        { answerId: mcAnswer!.id, awardedPoints: 1 },
        teacherId,
      ),
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
    const studentId = await seedProfile({
      role: 'student',
      fullName: 'Student Name',
    })
    const { examId } = await seedPublishedMcExam(teacherId)
    await seedExamAttempt({
      examId,
      studentId,
      deadlineAt: new Date(Date.now() - 5 * 60_000),
    })
    const attempts = await listAttemptsForGradingService({ examId }, teacherId)
    expect(attempts).toHaveLength(1)
    expect(attempts[0].status).toBe('submitted')
    expect(attempts[0].studentName).toBe('Student Name')
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

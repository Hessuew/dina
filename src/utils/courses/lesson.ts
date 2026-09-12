import { createServerFn } from '@tanstack/react-start'
import {
  completeLessonService,
  createLessonService,
  deleteLessonService,
  getUpcomingLessonsService,
  updateLessonService,
} from './service/lesson.service'
import {
  completeLessonSchema,
  createLessonSchema,
  deleteLessonSchema,
  updateLessonSchema,
} from '@/schemas/lesson.schema'
import { getCurrentUser } from '@/utils/auth/auth'

export const createLesson = createServerFn({ method: 'POST' })
  .inputValidator(createLessonSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return createLessonService(data, user.id)
  })

export const completeLesson = createServerFn({ method: 'POST' })
  .inputValidator(completeLessonSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return completeLessonService(data, user.id)
  })

export const updateLesson = createServerFn({ method: 'POST' })
  .inputValidator(updateLessonSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return updateLessonService(data, user.id)
  })

export const deleteLesson = createServerFn({ method: 'POST' })
  .inputValidator(deleteLessonSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return deleteLessonService(data, user.id)
  })

export const getUpcomingLessons = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()
    return getUpcomingLessonsService(user.id)
  },
)

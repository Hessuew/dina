import { createServerFn } from '@tanstack/react-start'
import {
  createCourseService,
  deleteCourseService,
  getCourseService,
  getCoursesService,
  updateCourseService,
} from './service/course.service'
import {
  createCourseSchema,
  deleteCourseSchema,
  getCourseSchema,
  updateCourseSchema,
} from '@/schemas/course.schema'
import { getCurrentUser } from '@/utils/auth/auth'

export const getCourses = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()
    return getCoursesService(user.id)
  },
)

export const getCourse = createServerFn({ method: 'POST' })
  .validator(getCourseSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const result = await getCourseService(data, user.id)
    return { ...result, user }
  })

export const createCourse = createServerFn({ method: 'POST' })
  .validator(createCourseSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return createCourseService(data, user.id)
  })

export const updateCourse = createServerFn({ method: 'POST' })
  .validator(updateCourseSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return updateCourseService(data, user.id)
  })

export const deleteCourse = createServerFn({ method: 'POST' })
  .validator(deleteCourseSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return deleteCourseService(data, user.id)
  })

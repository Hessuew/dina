import { createServerFn } from '@tanstack/react-start'
import {
  getCourseTeachersService,
  updateCourseTeachersService,
} from './service/teacher-assignment.service'
import {
  getCourseTeachersSchema,
  updateCourseTeachersSchema,
} from '@/schemas/course.schema'
import { getCurrentUser } from '@/utils/auth/auth'

export const getCourseTeachers = createServerFn({ method: 'POST' })
  .inputValidator(getCourseTeachersSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getCourseTeachersService(data, user.id)
  })

export const updateCourseTeachers = createServerFn({ method: 'POST' })
  .inputValidator(updateCourseTeachersSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return updateCourseTeachersService(data, user.id)
  })

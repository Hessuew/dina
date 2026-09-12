import { createServerFn } from '@tanstack/react-start'
import {
  getStudentDetailService,
  getStudentsService,
} from './service/student.service'
import { getStudentDetailSchema } from '@/schemas/student.schema'
import { getCurrentUser } from '@/utils/auth/auth'

export const getStudents = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()
    return getStudentsService(user.id)
  },
)

export const getStudentDetail = createServerFn({ method: 'POST' })
  .inputValidator(getStudentDetailSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getStudentDetailService(data, user.id)
  })

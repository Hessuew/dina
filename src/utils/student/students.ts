import { createServerFn } from '@tanstack/react-start'
import {
  getStudentDetailService,
  getStudentsService,
} from './service/student.service'
import { getStudentDetailSchema } from '@/schemas/student.schema'

export const getStudents = createServerFn({ method: 'POST' }).handler(
  async () => getStudentsService(),
)

export const getStudentDetail = createServerFn({ method: 'POST' })
  .inputValidator(getStudentDetailSchema)
  .handler(async ({ data }) => getStudentDetailService(data))

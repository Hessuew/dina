import { createServerFn } from '@tanstack/react-start'
import {
  getStudentDetailService,
  getStudentsService,
} from './service/student.service'
import { getStudentDetailSchema } from '@/schemas/student.schema'
import { getCurrentUser } from '@/utils/auth/auth'
import { resolveAdminOrTeacherAccess } from '@/utils/authz'
import { AuthorizationError } from '@/utils/errors'

async function assertTeacherOrAdminAccess(): Promise<void> {
  const user = await getCurrentUser()
  const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(user.id)

  if (!isAdmin && !isTeacher) {
    throw new AuthorizationError()
  }
}

export const getStudents = createServerFn({ method: 'POST' }).handler(
  async () => {
    await assertTeacherOrAdminAccess()
    return getStudentsService()
  },
)

export const getStudentDetail = createServerFn({ method: 'POST' })
  .inputValidator(getStudentDetailSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(user.id)
    if (!isAdmin && !isTeacher) {
      throw new AuthorizationError()
    }
    return getStudentDetailService(data, user.id)
  })

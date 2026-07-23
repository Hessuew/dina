import { createServerFn } from '@tanstack/react-start'
import { getCurrentUser } from '@/utils/auth/auth'
import { withRequestCache } from '@/utils/authz'
import {
  closeAttendanceSchema,
  courseIdSchema,
  markPresentSchema,
  setStudentPresentSchema,
  startAttendanceSchema,
} from '@/schemas/attendance.schema'
import {
  closeAttendanceService,
  getCourseAttendanceStateService,
  listOpenAttendanceForStudentService,
  markPresentService,
  setStudentPresentService,
  startOrReopenAttendanceService,
} from '@/utils/attendance/service/attendance.service'

export const getCourseAttendanceState = createServerFn({ method: 'POST' })
  .inputValidator(courseIdSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return withRequestCache(() =>
      getCourseAttendanceStateService(data, user.id),
    )
  })

export const startOrReopenAttendance = createServerFn({ method: 'POST' })
  .inputValidator(startAttendanceSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return withRequestCache(() => startOrReopenAttendanceService(data, user.id))
  })

export const closeAttendance = createServerFn({ method: 'POST' })
  .inputValidator(closeAttendanceSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return withRequestCache(() => closeAttendanceService(data, user.id))
  })

export const markPresent = createServerFn({ method: 'POST' })
  .inputValidator(markPresentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return withRequestCache(() => markPresentService(data, user.id))
  })

export const listOpenAttendanceForStudent = createServerFn({
  method: 'POST',
}).handler(async () => {
  const user = await getCurrentUser()
  return withRequestCache(() => listOpenAttendanceForStudentService(user.id))
})

export const setStudentPresent = createServerFn({ method: 'POST' })
  .inputValidator(setStudentPresentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return withRequestCache(() => setStudentPresentService(data, user.id))
  })

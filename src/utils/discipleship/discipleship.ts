import { createServerFn } from '@tanstack/react-start'
import { getCurrentUser } from '@/utils/auth/auth'
import {
  assignStudentToTeacherSchema,
  pairStudentsSchema,
  setGroupScheduleSchema,
  setIndividualScheduleSchema,
  setPairScheduleSchema,
  unassignStudentSchema,
  unpairStudentSchema,
} from '@/schemas/discipleship.schema'
import {
  assignStudentToTeacherService,
  getDiscipleshipBoardService,
  getStudentDiscipleshipViewService,
  pairStudentsService,
  setGroupScheduleService,
  setIndividualScheduleService,
  setPairScheduleService,
  unassignStudentService,
  unpairStudentService,
} from '@/utils/discipleship/service/discipleship.service'

export const getDiscipleshipBoard = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()
    return getDiscipleshipBoardService(user.id)
  },
)

export const getStudentDiscipleshipView = createServerFn({
  method: 'POST',
}).handler(async () => {
  const user = await getCurrentUser()
  return getStudentDiscipleshipViewService(user.id)
})

export const assignStudentToTeacher = createServerFn({ method: 'POST' })
  .inputValidator(assignStudentToTeacherSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return assignStudentToTeacherService(data, user.id)
  })

export const unassignStudent = createServerFn({ method: 'POST' })
  .inputValidator(unassignStudentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return unassignStudentService(data, user.id)
  })

export const pairStudents = createServerFn({ method: 'POST' })
  .inputValidator(pairStudentsSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return pairStudentsService(data, user.id)
  })

export const unpairStudent = createServerFn({ method: 'POST' })
  .inputValidator(unpairStudentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return unpairStudentService(data, user.id)
  })

export const setIndividualSchedule = createServerFn({ method: 'POST' })
  .inputValidator(setIndividualScheduleSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return setIndividualScheduleService(data, user.id)
  })

export const setPairSchedule = createServerFn({ method: 'POST' })
  .inputValidator(setPairScheduleSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return setPairScheduleService(data, user.id)
  })

export const setGroupSchedule = createServerFn({ method: 'POST' })
  .inputValidator(setGroupScheduleSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return setGroupScheduleService(data, user.id)
  })

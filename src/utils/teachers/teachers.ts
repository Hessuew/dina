import { createServerFn } from '@tanstack/react-start'
import {
  getAllTeachersService,
  getTeachersService,
} from './service/teachers.service'
import { getCurrentUser } from '@/utils/auth/auth'

export const getTeachers = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()
    return getTeachersService(user.id)
  },
)

export const getAllTeachers = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()
    return getAllTeachersService(user.id)
  },
)

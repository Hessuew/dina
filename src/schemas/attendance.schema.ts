import { z } from 'zod'

export const courseIdSchema = z.object({
  courseId: z.string().uuid(),
})

export const startAttendanceSchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid(),
})

export const closeAttendanceSchema = z.object({
  courseId: z.string().uuid(),
})

export const markPresentSchema = z.object({
  courseId: z.string().uuid(),
})

export type CourseIdInput = z.infer<typeof courseIdSchema>
export type StartAttendanceInput = z.infer<typeof startAttendanceSchema>
export type CloseAttendanceInput = z.infer<typeof closeAttendanceSchema>
export type MarkPresentInput = z.infer<typeof markPresentSchema>

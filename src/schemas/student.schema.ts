import { z } from 'zod'

export const getStudentDetailSchema = z.object({
  studentId: z.uuid('Invalid student ID'),
})

export type GetStudentDetailInput = z.infer<typeof getStudentDetailSchema>

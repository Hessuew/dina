import { z } from 'zod'

export const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  thumbnailUrl: z.url('Invalid URL').optional(),
  teacher1Id: z.uuid('Invalid teacher ID').optional(),
  teacher2Id: z.uuid('Invalid teacher ID').optional(),
  orderIndex: z.number().int().min(0).default(0),
})

export const updateCourseSchema = z.object({
  courseId: z.uuid('Invalid course ID'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  thumbnailUrl: z.url('Invalid URL').optional(),
  isPublished: z.boolean().optional(),
  teacher1Id: z.uuid('Invalid teacher ID').optional(),
  teacher2Id: z.uuid('Invalid teacher ID').optional(),
  orderIndex: z.number().int().min(0).optional(),
})

export const deleteCourseSchema = z.object({
  courseId: z.uuid('Invalid course ID'),
})

export const getCourseSchema = z.object({
  courseId: z.uuid('Invalid course ID'),
})

export type GetCourseInput = z.infer<typeof getCourseSchema>
export type CreateCourseInput = z.infer<typeof createCourseSchema>
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>
export type DeleteCourseInput = z.infer<typeof deleteCourseSchema>
export type GetCourseTeachersInput = {
  courseId: string
}
export type UpdateCourseTeachersInput = {
  courseId: string
  teacher1Id: string
  teacher2Id: string
}

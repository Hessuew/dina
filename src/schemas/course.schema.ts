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

export const getCourseTeachersSchema = z.object({
  courseId: z.uuid('Invalid course ID'),
})

export const updateCourseTeachersSchema = z.object({
  courseId: z.uuid('Invalid course ID'),
  teacher1Id: z.uuid('Invalid teacher ID'),
  teacher2Id: z.uuid('Invalid teacher ID'),
})

export type CreateCourseInput = z.infer<typeof createCourseSchema>
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>
export type DeleteCourseInput = z.infer<typeof deleteCourseSchema>
export type GetCourseTeachersInput = z.infer<typeof getCourseTeachersSchema>
export type UpdateCourseTeachersInput = z.infer<
  typeof updateCourseTeachersSchema
>

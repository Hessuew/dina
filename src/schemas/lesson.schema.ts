import { z } from 'zod'

export const createLessonSchema = z.object({
  courseId: z.uuid('Invalid course ID'),
  title: z.string().min(1, 'Title is required'),
  content: z.string().optional(),
  videoUrl: z.url('Invalid video URL').optional(),
  thumbnailUrl: z.url('Invalid thumbnail URL').optional(),
  scheduledTime: z.coerce.date().optional(),
  duration: z.number().int().positive('Duration must be positive').optional(),
  orderIndex: z.number().int().min(0),
  isPublished: z.boolean().optional(),
})

export const updateLessonSchema = z.object({
  lessonId: z.uuid('Invalid lesson ID'),
  courseId: z.uuid('Invalid course ID'),
  title: z.string().min(1, 'Title is required'),
  content: z.string().optional(),
  videoUrl: z.url('Invalid video URL').optional(),
  thumbnailUrl: z.url('Invalid thumbnail URL').optional(),
  scheduledTime: z.coerce.date().optional(),
  duration: z.number().int().positive('Duration must be positive').optional(),
  orderIndex: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
})

export const deleteLessonSchema = z.object({
  lessonId: z.uuid('Invalid lesson ID'),
  courseId: z.uuid('Invalid course ID'),
})

export const getLessonSchema = z.object({
  lessonId: z.uuid('Invalid lesson ID'),
})

export type CreateLessonInput = z.infer<typeof createLessonSchema>
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>
export type DeleteLessonInput = z.infer<typeof deleteLessonSchema>
export type GetLessonInput = z.infer<typeof getLessonSchema>

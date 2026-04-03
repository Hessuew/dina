import { z } from 'zod'

export const createAssignmentSchema = z.object({
  lessonId: z.uuid('Invalid lesson ID'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  maxGrade: z.number().int().positive('Max grade must be positive').optional(),
})

export const updateAssignmentSchema = z.object({
  assignmentId: z.uuid('Invalid assignment ID'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  maxGrade: z.number().int().positive('Max grade must be positive').optional(),
  status: z.enum(['draft', 'published', 'closed']).optional(),
})

export const deleteAssignmentSchema = z.object({
  assignmentId: z.uuid('Invalid assignment ID'),
})

export const getAssignmentSchema = z.object({
  assignmentId: z.uuid('Invalid assignment ID'),
})

export const getAssignmentsByLessonSchema = z.object({
  lessonId: z.uuid('Invalid lesson ID'),
})

export const getAssignmentSubmissionCountSchema = z.object({
  assignmentId: z.uuid('Invalid assignment ID'),
})

export const createOrUpdateSubmissionSchema = z.object({
  assignmentId: z.uuid('Invalid assignment ID'),
  content: z.string().optional(),
  fileUrl: z.url('Invalid file URL').optional(),
  submit: z.boolean().optional(),
})

export const getSubmissionSchema = z.object({
  assignmentId: z.uuid('Invalid assignment ID'),
})

export const gradeSubmissionSchema = z.object({
  submissionId: z.uuid('Invalid submission ID'),
  assignmentId: z.uuid('Invalid assignment ID'),
  grade: z.number().min(0, 'Grade must be non-negative'),
  feedback: z.string().optional(),
})

export const getAssignmentSubmissionsSchema = z.object({
  assignmentId: z.uuid('Invalid assignment ID'),
})

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>
export type DeleteAssignmentInput = z.infer<typeof deleteAssignmentSchema>
export type GetAssignmentInput = z.infer<typeof getAssignmentSchema>
export type GetAssignmentsByLessonInput = z.infer<
  typeof getAssignmentsByLessonSchema
>
export type GetAssignmentSubmissionCountInput = z.infer<
  typeof getAssignmentSubmissionCountSchema
>
export type CreateOrUpdateSubmissionInput = z.infer<
  typeof createOrUpdateSubmissionSchema
>
export type GetSubmissionInput = z.infer<typeof getSubmissionSchema>
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>
export type GetAssignmentSubmissionsInput = z.infer<
  typeof getAssignmentSubmissionsSchema
>

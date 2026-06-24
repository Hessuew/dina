import { z } from 'zod'

export const assignStudentToTeacherSchema = z.object({
  studentId: z.uuid('Invalid student ID'),
  teacherId: z.uuid('Invalid teacher ID'),
})
export type AssignStudentToTeacherInput = z.infer<
  typeof assignStudentToTeacherSchema
>

export const unassignStudentSchema = z.object({
  studentId: z.uuid('Invalid student ID'),
})
export type UnassignStudentInput = z.infer<typeof unassignStudentSchema>

export const pairStudentsSchema = z.object({
  studentIdA: z.uuid('Invalid student ID'),
  studentIdB: z.uuid('Invalid student ID'),
  teacherId: z.uuid('Invalid teacher ID'),
})
export type PairStudentsInput = z.infer<typeof pairStudentsSchema>

export const unpairStudentSchema = z.object({
  studentId: z.uuid('Invalid student ID'),
})
export type UnpairStudentInput = z.infer<typeof unpairStudentSchema>

export const setIndividualScheduleSchema = z.object({
  studentId: z.uuid('Invalid student ID'),
  anchorAt: z.coerce.date(),
})
export type SetIndividualScheduleInput = z.infer<
  typeof setIndividualScheduleSchema
>

export const setPairScheduleSchema = z.object({
  pairId: z.uuid('Invalid pair ID'),
  anchorAt: z.coerce.date(),
})
export type SetPairScheduleInput = z.infer<typeof setPairScheduleSchema>

export const setGroupScheduleSchema = z.object({
  teacherId: z.uuid('Invalid teacher ID'),
  anchorAt: z.coerce.date(),
})
export type SetGroupScheduleInput = z.infer<typeof setGroupScheduleSchema>

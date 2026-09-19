import { buildCompletedLessonIds } from '../domain/lesson-completion.domain'
import {
  findPublishedAssignmentsByLessonIds,
  findStudentSubmissionGrades,
} from '@/utils/repository'

export async function findCompletedLessonIdsForStudent(
  studentId: string,
  lessonIds: Array<string>,
): Promise<Array<string>> {
  if (lessonIds.length === 0) return []

  const assignments = await findPublishedAssignmentsByLessonIds(lessonIds)
  const submissions = await findStudentSubmissionGrades(
    studentId,
    assignments.map((assignment) => assignment.id),
  )
  return buildCompletedLessonIds(lessonIds, assignments, submissions)
}

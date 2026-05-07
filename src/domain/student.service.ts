import { calculateAverageGrade } from './grade.service'
import type { submissions } from '@/db/schema'

type Submission = typeof submissions.$inferSelect

/**
 * Calculates course-level statistics for a student
 */
export function calculateCourseStats(
  courseSubmissions: Array<Submission>,
  courseAssignments: Array<{ id: string; maxGrade?: number }>,
): {
  totalAssignments: number
  submittedAssignments: number
  averageGrade: number | null
} {
  const submitted = courseSubmissions.filter((s) => s.status !== 'draft').length
  const assignmentMap = new Map(
    courseAssignments.map((a) => [a.id, a.maxGrade ?? 100]),
  )

  const gradesInCourse = courseSubmissions
    .filter((sub) => sub.grade !== null)
    .map((sub) => ({
      grade: sub.grade!,
      maxGrade: assignmentMap.get(sub.assignmentId) ?? 100,
    }))

  const averageGrade =
    gradesInCourse.length > 0 ? calculateAverageGrade(gradesInCourse) : null

  return {
    totalAssignments: courseAssignments.length,
    submittedAssignments: submitted,
    averageGrade,
  }
}

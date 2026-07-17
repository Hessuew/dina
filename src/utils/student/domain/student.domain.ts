import type { StudentWithStats } from '@/types/student'
import type { SubmissionStatus } from '@/types/database.types'
import { calculateAverageGrade } from '@/domain/grade.service'

type CourseBasic = { id: string; title: string }

type SubmissionWithCourse = {
  status: SubmissionStatus
  grade: number | null
  assignment: {
    maxGrade: number | null
    lesson: { course: { id: string } }
  }
}

type AssignmentRow = {
  assignmentId: string
  assignmentTitle: string
  assignmentDueDate: Date
  assignmentMaxGrade: number | null
  courseId: string
  courseTitle: string
  lessonId: string
  lessonTitle: string
}

type SubmissionRow = {
  id: string
  assignmentId: string
  status: SubmissionStatus
  grade: number | null
  submittedAt: Date | null
  gradedAt: Date | null
  feedback: string | null
}

type StudentProfile = {
  id: string
  fullName: string
  email: string
  avatarUrl: string | null
  createdAt: Date
}

export function buildAverageGradeByCourse(
  courseList: Array<CourseBasic>,
  submissions: Array<SubmissionWithCourse>,
): StudentWithStats['assignmentStats']['averageGradeByCourse'] {
  return courseList
    .map((course) => {
      const grades = submissions
        .filter(
          (sub) =>
            sub.assignment.lesson.course.id === course.id && sub.grade !== null,
        )
        .map((sub) => ({
          grade: sub.grade!,
          maxGrade: sub.assignment.maxGrade ?? 100,
        }))
      if (grades.length === 0) return null
      return {
        courseId: course.id,
        courseTitle: course.title,
        averageGrade: calculateAverageGrade(grades),
        maxGrade: 100,
      }
    })
    .filter((g): g is NonNullable<typeof g> => g !== null)
}

export function buildStudentWithStats(
  student: StudentProfile,
  courseList: Array<CourseBasic>,
  submissions: Array<SubmissionWithCourse>,
  totalAssignmentCount: number,
  attendanceByCourse: StudentWithStats['attendanceByCourse'] = [],
): StudentWithStats {
  return {
    id: student.id,
    fullName: student.fullName,
    email: student.email,
    avatarUrl: student.avatarUrl,
    createdAt: student.createdAt,
    enrollmentCount: courseList.length,
    assignmentStats: {
      totalAssignments: totalAssignmentCount,
      submittedAssignments: submissions.filter((s) => s.status !== 'draft')
        .length,
      averageGradeByCourse: buildAverageGradeByCourse(courseList, submissions),
    },
    attendanceByCourse,
  }
}

export function buildAssignmentsWithSubmissions(
  assignmentRows: Array<AssignmentRow>,
  submissions: Array<SubmissionRow>,
) {
  const submissionsMap = new Map(submissions.map((s) => [s.assignmentId, s]))
  return assignmentRows
    .map((a) => {
      const sub = submissionsMap.get(a.assignmentId)
      if (!sub) return null
      return {
        id: a.assignmentId,
        title: a.assignmentTitle,
        dueDate: a.assignmentDueDate,
        maxGrade: a.assignmentMaxGrade,
        courseId: a.courseId,
        courseTitle: a.courseTitle,
        lessonId: a.lessonId,
        lessonTitle: a.lessonTitle,
        submission: {
          id: sub.id,
          status: sub.status,
          grade: sub.grade,
          submittedAt: sub.submittedAt,
          gradedAt: sub.gradedAt,
          feedback: sub.feedback,
        },
      }
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)
}

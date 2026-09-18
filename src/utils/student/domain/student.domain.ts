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

type SubmissionStatsRow = {
  assignmentId: string
  status: SubmissionStatus
  grade: number | null
}

type AssignmentStatsRow = {
  id: string
  lessonId: string
  maxGrade: number | null
}

type LessonStatsRow = {
  id: string
  courseId: string
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

type AssignmentRecord = {
  id: string
  title: string
  dueDate: Date
  maxGrade: number | null
  lessonId: string
}

type LessonRecord = {
  id: string
  title: string
  courseId: string
}

type CourseRecord = {
  id: string
  title: string
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

export function buildSubmissionStats(
  submissions: Array<SubmissionStatsRow>,
  assignments: Array<AssignmentStatsRow>,
  lessons: Array<LessonStatsRow>,
): Array<SubmissionWithCourse> {
  const assignmentsById = new Map(assignments.map((a) => [a.id, a]))
  const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]))

  return submissions.flatMap((submission) => {
    const assignment = assignmentsById.get(submission.assignmentId)
    const lesson = assignment ? lessonsById.get(assignment.lessonId) : undefined
    if (!assignment || !lesson) return []
    return [
      {
        status: submission.status,
        grade: submission.grade,
        assignment: {
          maxGrade: assignment.maxGrade,
          lesson: { course: { id: lesson.courseId } },
        },
      },
    ]
  })
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

export function buildAssignmentDetails(
  assignments: Array<AssignmentRecord>,
  lessons: Array<LessonRecord>,
  courses: Array<CourseRecord>,
): Array<AssignmentRow> {
  const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  const coursesById = new Map(courses.map((course) => [course.id, course]))

  return assignments
    .flatMap((assignment) => {
      const lesson = lessonsById.get(assignment.lessonId)
      const course = lesson ? coursesById.get(lesson.courseId) : undefined
      if (!lesson || !course) return []
      return [
        {
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          assignmentDueDate: assignment.dueDate,
          assignmentMaxGrade: assignment.maxGrade,
          courseId: course.id,
          courseTitle: course.title,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
        },
      ]
    })
    .sort(
      (first, second) =>
        first.assignmentDueDate.getTime() - second.assignmentDueDate.getTime(),
    )
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

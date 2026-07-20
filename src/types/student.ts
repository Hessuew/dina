import type { SubmissionStatus } from './database.types'

export type CourseAttendanceScore = {
  courseId: string
  courseTitle: string
  present: number
  totalLessons: number
  /** Detail loader only: actor may toggle Present on this course. */
  canManageAttendance?: boolean
  lessons: Array<{
    lessonId: string
    lessonTitle: string
    orderIndex: number
    present: boolean
  }>
}

export type StudentWithStats = {
  id: string
  fullName: string
  email: string
  avatarUrl: string | null
  createdAt: Date
  enrollmentCount: number
  assignmentStats: {
    totalAssignments: number
    submittedAssignments: number
    averageGradeByCourse: Array<{
      courseId: string
      courseTitle: string
      averageGrade: number
      maxGrade: number
    }>
  }
  attendanceByCourse: Array<CourseAttendanceScore>
}

export type StudentDetailWithAssignments = {
  id: string
  fullName: string
  email: string
  bio: string | null
  avatarUrl: string | null
  createdAt: Date
  enrollments: Array<{
    id: string
    status: 'pending' | 'active' | 'completed' | 'dropped'
    courseId: string
    courseTitle: string
  }>
  assignments: Array<{
    id: string
    title: string
    dueDate: Date
    maxGrade: number | null
    courseId: string
    courseTitle: string
    lessonId: string
    lessonTitle: string
    submission: {
      id: string
      status: SubmissionStatus
      grade: number | null
      submittedAt: Date | null
      gradedAt: Date | null
      feedback: string | null
    } | null
  }>
  attendanceByCourse: Array<CourseAttendanceScore>
}

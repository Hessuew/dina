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
      status: 'draft' | 'submitted' | 'graded' | 'returned'
      grade: number | null
      submittedAt: Date | null
      gradedAt: Date | null
      feedback: string | null
    } | null
  }>
}

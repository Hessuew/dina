import type { userRoleEnum } from '@/db/schema/enums.schema'

type CourseCardCourse = {
  description: string | null
  lessons: Array<{ id: string }>
  submittedAssignments?: number
  gradedAssignments?: number
  totalAssignments?: number
}

export type CourseCardRole = (typeof userRoleEnum.enumValues)[number]
export type CourseCardVariant = 'light' | 'dark'

export type CourseCardViewModel = {
  isTeacher: boolean
  lessonCount: number
  submittedCount: number
  gradedCount: number
  totalAssignments: number
  isDark: boolean
  hasDescription: boolean
  showProgress: boolean
}

export function buildCourseCardViewModel({
  course,
  role,
  variant = 'dark',
}: {
  course: CourseCardCourse
  role: CourseCardRole
  variant?: CourseCardVariant
}): CourseCardViewModel {
  const isTeacher = role === 'teacher' || role === 'admin'

  return {
    isTeacher,
    lessonCount: course.lessons.length,
    submittedCount: course.submittedAssignments ?? 0,
    gradedCount: course.gradedAssignments ?? 0,
    totalAssignments: course.totalAssignments ?? 0,
    isDark: variant === 'dark',
    hasDescription: Boolean(course.description),
    showProgress: !isTeacher && course.totalAssignments !== undefined,
  }
}

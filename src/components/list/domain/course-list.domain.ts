export type CourseListRole = 'student' | 'teacher' | 'admin'

export type CourseListViewModel = {
  isAdmin: boolean
  isTeacher: boolean
  emptyHeading: string
  emptyDescription: string
}

export function buildCourseListViewModel(
  role: CourseListRole,
): CourseListViewModel {
  const isAdmin = role === 'admin'
  const isTeacher = role === 'teacher' || role === 'admin'
  return {
    isAdmin,
    isTeacher,
    emptyHeading: isTeacher ? 'No courses yet' : 'No enrolled courses',
    emptyDescription: isTeacher
      ? 'Create your first course to get started'
      : 'You are not enrolled in any courses yet',
  }
}

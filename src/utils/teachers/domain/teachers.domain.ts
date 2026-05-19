type TeacherWithCourse = {
  id: string
  fullName: string
  email: string
  bio: string | null
  avatarUrl: string | null
  createdAt: Date
  course?: {
    id: string
    title: string
    description: string | null
    isPublished: boolean | null
    createdAt: Date
    orderIndex: number | null
  } | null
}

/**
 * Sorts teachers with the following precedence:
 * 1. Both have a course → ascending by course orderIndex
 * 2. Only a has a course → a comes first
 * 3. Only b has a course → b comes first
 * 4. Neither has a course → ascending by teacher createdAt
 */
export function sortTeachers<T extends TeacherWithCourse>(teachers: T[]): T[] {
  return [...teachers].sort((a, b) => {
    const aIdx = a.course?.orderIndex ?? null
    const bIdx = b.course?.orderIndex ?? null

    if (aIdx !== null && bIdx !== null) return aIdx - bIdx
    if (aIdx !== null) return -1
    if (bIdx !== null) return 1
    return a.createdAt.getTime() - b.createdAt.getTime()
  })
}

export type Teacher = {
  id: string
  fullName: string
  email: string
  bio: string | null
  avatarUrl: string | null
  createdAt: Date
}

export type TeacherCourse = {
  id: string
  title: string
  description: string | null
  isPublished: boolean | null
}

export type TeacherWithCourses = Teacher & {
  courses: Array<TeacherCourse>
  courseCount: number
}

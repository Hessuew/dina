export type Teacher = {
  id: string
  fullName: string
  email: string
  bio: string | null
  lecturerTitle: string | null
  gemstone: string | null
  avatarUrl: string | null
  createdAt: Date
}

export type TeacherCourse = {
  id: string
  title: string
  description: string | null
  isPublished: boolean | null
  createdAt: Date
  orderIndex: number | null
}

export type TeacherWithCourse = Teacher & {
  course?: TeacherCourse | null
}

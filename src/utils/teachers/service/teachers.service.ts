import { sortTeachers } from '@/utils/teachers/domain/teachers.domain'
import {
  findAllTeachers,
  findAllTeachersSimple,
  findCourseAssignmentsForTeachers,
  findCourseTeacher,
} from '@/utils/teachers/repository'
import { authz } from '@/utils/authz'
import { signAvatarRows } from '@/utils/storage/service/private-storage.service'

export async function getTeachersService() {
  const teachers = await signAvatarRows(await findAllTeachers())

  const teacherIds = teachers.map((t) => t.id)
  const allAssignments = await findCourseAssignmentsForTeachers(teacherIds)

  // Results are ordered by createdAt desc; first occurrence per teacher = most recent.
  const assignmentByTeacher = new Map<string, (typeof allAssignments)[number]>()
  for (const a of allAssignments) {
    if (!assignmentByTeacher.has(a.teacherId)) {
      assignmentByTeacher.set(a.teacherId, a)
    }
  }

  const teachersWithCourses = teachers.map((teacher) => ({
    id: teacher.id,
    fullName: teacher.fullName,
    email: teacher.email,
    bio: teacher.bio,
    avatarUrl: teacher.avatarUrl,
    createdAt: teacher.createdAt,
    course: assignmentByTeacher.get(teacher.id)?.course,
    lecturerTitle: teacher.lecturerTitle,
    gemstone: teacher.gemstone ?? null,
  }))

  return { teachers: sortTeachers(teachersWithCourses) }
}

export async function getAllTeachersService(userId: string) {
  await authz(userId).hasRole('admin')

  const teachers = await signAvatarRows(await findAllTeachersSimple())

  return { teachers }
}

export async function isCourseTeacherService(courseId: string, userId: string) {
  const assignment = await findCourseTeacher(courseId, userId)
  return { isCourseTeacher: Boolean(assignment) }
}

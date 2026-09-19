import { insertCourseTeacherAssignments } from '@/utils/repository'

export async function seedCourseTeacher(
  courseId: string,
  teacherId: string,
): Promise<void> {
  await insertCourseTeacherAssignments(courseId, [teacherId])
}

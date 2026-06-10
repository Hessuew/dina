import { getDb } from 'test/integration/db'
import { courseTeachers } from '@/db/schema'

export async function seedCourseTeacher(
  courseId: string,
  teacherId: string,
): Promise<void> {
  const db = await getDb()
  await db.insert(courseTeachers).values({ courseId, teacherId })
}

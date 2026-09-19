import { getDb } from '@/db'
import {
  insertCourse,
  insertCourseTeacherAssignments,
} from '@/utils/repository'

/* v8 ignore start */
type CourseInsertValues = Parameters<typeof insertCourse>[0]

/** Creates a course and its optional teacher assignments atomically. */
export async function createCourseWithTeachers(
  values: CourseInsertValues,
  teacherIds?: [string, string],
) {
  const db = await getDb()
  return db.transaction(async (tx) => {
    const course = await insertCourse(values, tx)
    if (teacherIds) {
      await insertCourseTeacherAssignments(course.id, teacherIds, tx)
    }
    return course
  })
}
/* v8 ignore end */

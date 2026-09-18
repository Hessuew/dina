import { getDb } from '@/db'
import {
  insertCourseInTransaction,
  insertCourseTeacherAssignmentsInTransaction,
} from '@/utils/repository'

/* v8 ignore start */
type CourseInsertValues = Parameters<typeof insertCourseInTransaction>[1]

/** Creates a course and its optional teacher assignments atomically. */
export async function createCourseWithTeachers(
  values: CourseInsertValues,
  teacherIds?: [string, string],
) {
  const db = await getDb()
  return db.transaction(async (tx) => {
    const course = await insertCourseInTransaction(tx, values)
    if (teacherIds) {
      await insertCourseTeacherAssignmentsInTransaction(
        tx,
        course.id,
        teacherIds,
      )
    }
    return course
  })
}
/* v8 ignore end */

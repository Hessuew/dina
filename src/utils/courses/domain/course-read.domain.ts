import type {
  courseTeachers,
  courses,
  lessons,
  mediaLibrary,
  profiles,
} from '@/db/schema'

export type CourseRow = typeof courses.$inferSelect
export type CourseTeacherRow = typeof courseTeachers.$inferSelect
export type LessonRow = typeof lessons.$inferSelect
export type MediaRow = typeof mediaLibrary.$inferSelect
export type ProfileRow = typeof profiles.$inferSelect

type CourseTeacherWithProfile = CourseTeacherRow & { teacher: ProfileRow }

export type CourseCatalogRow = CourseRow & {
  courseTeachers: Array<CourseTeacherWithProfile>
  lessons: Array<LessonRow>
}

export type CourseDetailRow = CourseCatalogRow & {
  mediaFiles: Array<MediaRow>
}

function composeCourseTeachers(
  rows: ReadonlyArray<CourseTeacherRow>,
  profiles: ReadonlyArray<ProfileRow>,
): Array<CourseTeacherWithProfile> {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
  return rows.flatMap((row) => {
    const teacher = profilesById.get(row.teacherId)
    return teacher ? [{ ...row, teacher }] : []
  })
}

export function composeCourseCatalog(
  courses: ReadonlyArray<CourseRow>,
  courseTeachers: ReadonlyArray<CourseTeacherRow>,
  profiles: ReadonlyArray<ProfileRow>,
  lessons: ReadonlyArray<LessonRow>,
): Array<CourseCatalogRow> {
  return courses.map((course) => ({
    ...course,
    courseTeachers: composeCourseTeachers(
      courseTeachers.filter((row) => row.courseId === course.id),
      profiles,
    ),
    lessons: lessons.filter((lesson) => lesson.courseId === course.id),
  }))
}

export function composeCourseDetail(
  course: CourseRow,
  courseTeachers: ReadonlyArray<CourseTeacherRow>,
  profiles: ReadonlyArray<ProfileRow>,
  lessons: ReadonlyArray<LessonRow>,
  mediaFiles: ReadonlyArray<MediaRow>,
): CourseDetailRow {
  const [catalog] = composeCourseCatalog(
    [course],
    courseTeachers,
    profiles,
    lessons,
  )
  return {
    ...catalog,
    mediaFiles: mediaFiles.filter((media) => media.courseId === course.id),
  }
}

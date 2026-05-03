/**
 * Checks if the current user is a teacher of the course
 * @param course - The course object
 * @param userId - The user ID
 * @returns True if the user is a teacher of the course, false otherwise
 */
export const isUserCourseTeacher = (course: any, userId: string) => {
  return course.teacher1Id === userId || course.teacher2Id === userId
}

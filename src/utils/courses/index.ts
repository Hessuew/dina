// Course aggregate
export {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
} from './course'

// Lesson aggregate
export {
  createLesson,
  updateLesson,
  deleteLesson,
  getUpcomingLessons,
  getCalendarEvents,
} from './lesson'

// Teacher-course relationship management
export { getCourseTeachers, updateCourseTeachers } from './teacher-assignment'
export {
  validateTeacherPair,
  assignTeachersToCourse,
} from './service/teacher-assignment.service'

// Re-export getAllTeachers from teachers.ts for backward compatibility
export { getAllTeachers } from '@/utils/teachers/teachers'

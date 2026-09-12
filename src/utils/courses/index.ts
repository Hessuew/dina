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
  completeLesson,
  createLesson,
  updateLesson,
  deleteLesson,
  getUpcomingLessons,
} from './lesson'

// Teacher-course relationship management
// Re-export getAllTeachers from teachers.ts for backward compatibility
export { getAllTeachers } from '@/utils/teachers/teachers'

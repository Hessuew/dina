export const USER_ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
} as const

export const ENROLLMENT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  DROPPED: 'dropped',
} as const

export const INQUIRY_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const

export const ASSIGNMENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const

export const SUBMISSION_STATUS = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  GRADED: 'graded',
  LATE: 'late',
} as const

export const ANNOUNCEMENT_TYPE = {
  COURSE: 'course',
  SYSTEM: 'system',
} as const

export const MEDIA_TYPE = {
  VIDEO: 'video',
  DOCUMENT: 'document',
  IMAGE: 'image',
  AUDIO: 'audio',
  OTHER: 'other',
} as const

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  LOGOUT: '/logout',
  
  STUDENT: {
    DASHBOARD: '/student/dashboard',
    COURSES: '/student/courses',
    COURSE_DETAIL: '/student/courses/$courseId',
    LESSON: '/student/courses/$courseId/lesson/$lessonId',
    INQUIRIES: '/student/inquiries',
    CALENDAR: '/student/calendar',
    PROFILE: '/student/profile',
  },
  
  TEACHER: {
    DASHBOARD: '/teacher/dashboard',
    COURSES: '/teacher/courses',
    COURSE_MANAGE: '/teacher/courses/$courseId/manage',
    INQUIRIES: '/teacher/inquiries',
    MEDIA: '/teacher/media',
    STUDENTS: '/teacher/students',
    ANALYTICS: '/teacher/analytics',
  },
  
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    COURSES: '/admin/courses',
    CONTENT: '/admin/content',
    ANALYTICS: '/admin/analytics',
    SETTINGS: '/admin/settings',
  },
} as const

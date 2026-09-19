import { describe, expect, it } from 'vitest'
import { composeCourseCatalog, composeCourseDetail } from './course-read.domain'
import type {
  CourseRow,
  CourseTeacherRow,
  LessonRow,
  MediaRow,
  ProfileRow,
} from './course-read.domain'

const course = {
  id: 'course-1',
  title: 'Course 1',
  description: 'Description',
  thumbnailUrl: null,
  isPublished: true,
  orderIndex: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
} satisfies CourseRow

const teacher = {
  id: 'teacher-1',
  email: 'teacher@example.com',
  fullName: 'Teacher One',
  role: 'teacher',
  bio: null,
  lecturerTitle: null,
  gemstone: null,
  avatarUrl: null,
  emailNotifications: true,
  notifyNewAssignments: true,
  notifyGrades: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
} satisfies ProfileRow

const courseTeacher = {
  id: 'course-teacher-1',
  courseId: 'course-1',
  teacherId: 'teacher-1',
  createdAt: new Date('2024-01-01'),
} satisfies CourseTeacherRow

const lesson = {
  id: 'lesson-1',
  courseId: 'course-1',
  title: 'Lesson 1',
  content: null,
  videoUrl: null,
  thumbnailUrl: null,
  duration: null,
  orderIndex: 0,
  isPublished: true,
  zoomMeetingId: null,
  zoomPassword: null,
  scheduledTime: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
} satisfies LessonRow

const media = {
  id: 'media-1',
  uploaderId: 'teacher-1',
  courseId: 'course-1',
  title: 'Media 1',
  category: 'General',
  description: null,
  externalUrl: 'https://example.com/media',
  filePath: null,
  fileType: 'video',
  fileSize: null,
  thumbnailUrl: null,
  isPublished: true,
  allowsDownload: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
} satisfies MediaRow

describe('composeCourseCatalog', () => {
  it('attaches lessons and teacher profiles to each course', () => {
    expect(
      composeCourseCatalog([course], [courseTeacher], [teacher], [lesson]),
    ).toEqual([
      {
        ...course,
        courseTeachers: [{ ...courseTeacher, teacher }],
        lessons: [lesson],
      },
    ])
  })

  it('omits course-teacher rows whose profile is unavailable', () => {
    expect(composeCourseCatalog([course], [courseTeacher], [], [])).toEqual([
      { ...course, courseTeachers: [], lessons: [] },
    ])
  })
})

describe('composeCourseDetail', () => {
  it('attaches matching media rows to the course detail', () => {
    expect(
      composeCourseDetail(
        course,
        [courseTeacher],
        [teacher],
        [lesson],
        [media],
      ),
    ).toEqual({
      ...course,
      courseTeachers: [{ ...courseTeacher, teacher }],
      lessons: [lesson],
      mediaFiles: [media],
    })
  })
})

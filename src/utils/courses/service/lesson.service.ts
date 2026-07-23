import type {
  CreateLessonInput,
  DeleteLessonInput,
  UpdateLessonInput,
} from '@/schemas/lesson.schema'
import {
  deleteLessonById,
  findAllCourseIds,
  findAssignmentCalendarEvents,
  findLessonCalendarEvents,
  findUpcomingLessons,
  insertLesson,
  updateLessonById,
} from '@/utils/courses/repository'
import { buildCourseCalendarEvents } from '@/utils/courses/domain/course.domain'
import { getUserProfile } from '@/utils/auth/auth'
import { authz } from '@/utils/authz'

export async function createLessonService(
  data: CreateLessonInput,
  userId: string,
) {
  await authz(userId).perform('createLesson').on('course', data.courseId)

  const lesson = await insertLesson({
    courseId: data.courseId,
    title: data.title,
    content: data.content || null,
    videoUrl: data.videoUrl || null,
    thumbnailUrl: data.thumbnailUrl || null,
    scheduledTime: data.scheduledTime || null,
    duration: data.duration || null,
    orderIndex: data.orderIndex,
    isPublished: data.isPublished ?? false,
  })

  return { lesson }
}

export async function updateLessonService(
  data: UpdateLessonInput,
  userId: string,
) {
  await authz(userId).perform('editLesson').on('course', data.courseId)

  const lesson = await updateLessonById(data.lessonId, {
    title: data.title,
    content: data.content || null,
    videoUrl: data.videoUrl || null,
    thumbnailUrl: data.thumbnailUrl || null,
    scheduledTime: data.scheduledTime || null,
    duration: data.duration || null,
    orderIndex: data.orderIndex,
    isPublished: data.isPublished,
    updatedAt: new Date(),
  })

  return { lesson }
}

export async function deleteLessonService(
  data: DeleteLessonInput,
  userId: string,
) {
  await authz(userId).perform('deleteLesson').on('course', data.courseId)
  await deleteLessonById(data.lessonId)

  return { success: true, lessonId: data.lessonId }
}

export async function getUpcomingLessonsService(userId: string) {
  await getUserProfile(userId)

  const upcomingLessons = await findUpcomingLessons(new Date())

  return {
    lessons: upcomingLessons.map((l) => ({
      id: l.id,
      title: l.title,
      scheduledTime: l.scheduledTime!,
      thumbnailUrl: l.thumbnailUrl,
      courseId: l.courseId,
      courseName: l.courseName,
    })),
  }
}

export async function getCalendarEventsService(userId: string) {
  await getUserProfile(userId)

  const courseIds = await findAllCourseIds()
  if (courseIds.length === 0) return { events: [] }

  const [lessonEvents, assignmentEvents] = await Promise.all([
    findLessonCalendarEvents(courseIds),
    findAssignmentCalendarEvents(courseIds),
  ])

  return { events: buildCourseCalendarEvents(lessonEvents, assignmentEvents) }
}

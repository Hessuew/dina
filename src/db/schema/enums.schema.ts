import { pgEnum } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', ['student', 'teacher', 'admin'])
export const submissionStatusEnum = pgEnum('submission_status', [
  'draft',
  'submitted',
  'graded',
  'returned',
])
export const mediaTypeEnum = pgEnum('media_type', [
  'video',
  'video_file',
  'audio',
  'document',
  'image',
  'other',
])
export const notificationTypeEnum = pgEnum('notification_type', [
  'announcement',
  'assignment',
  'grade',
  'system',
])
export const postNotificationEventEnum = pgEnum('post_notification_event', [
  'post_created',
  'comment_created',
])
export const assignmentStatusEnum = pgEnum('assignment_status', [
  'draft',
  'published',
  'closed',
])
export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',
  'accepted',
  'revoked',
])
export const calendarEventCategoryEnum = pgEnum('calendar_event_category', [
  'exam',
  'chapel',
  'personal',
])
export const zoomLinkSectionEnum = pgEnum('zoom_link_section', [
  'general_class_lecture',
  'teacher',
])

export const enrollmentStatusEnum = pgEnum('enrollment_status', [
  'pending',
  'under_review',
  'awaiting_approval',
  'approved',
  'rejected',
  'waitlisted',
  'withdrawn',
  'deferred',
])

export const enrollmentAdmissionCategoryEnum = pgEnum(
  'enrollment_admission_category',
  ['new', 'emerging', 'established'],
)

export const enrollmentGenderEnum = pgEnum('enrollment_gender', [
  'male',
  'female',
])

// Extensible for delivery webhooks later ('delivered', 'read' can be appended).
export const whatsappMessageStatusEnum = pgEnum('whatsapp_message_status', [
  'sent',
  'failed',
])

export const emailTypeEnum = pgEnum('email_type', ['invitation'])

export const emailMessageStatusEnum = pgEnum('email_message_status', [
  'sent',
  'failed',
])

export const examStatusEnum = pgEnum('exam_status', ['draft', 'published'])

export const examQuestionTypeEnum = pgEnum('exam_question_type', [
  'multiple_choice',
  'open_ended',
])

export const examAttemptStatusEnum = pgEnum('exam_attempt_status', [
  'in_progress',
  'submitted',
  'graded',
])

export const gemstoneEnum = pgEnum('gemstone', [
  'jasper',
  'sapphire',
  'chalcedony',
  'emerald',
  'sardonyx',
  'sardius',
  'chrysolite',
  'beryl',
  'topaz',
  'chrysoprasus',
  'jacinth',
  'amethyst',
])

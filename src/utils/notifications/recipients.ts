import type {
  CommentCreatedEvent,
  NotificationEvent,
  PostCreatedEvent,
  RecipientResult,
} from './types'
import {
  findProfileIdsByRolesExcluding,
  findTeacherIdsByCourseId,
} from '@/utils/repository'

async function addStudentRecipients(
  recipients: Set<string>,
  actorId: string,
): Promise<void> {
  const studentIds = await findProfileIdsByRolesExcluding(['student'], actorId)

  for (const studentId of studentIds) {
    recipients.add(studentId)
  }
}

async function addStaffRecipients(
  recipients: Set<string>,
  actorId: string,
): Promise<void> {
  const staffIds = await findProfileIdsByRolesExcluding(
    ['teacher', 'admin'],
    actorId,
  )

  for (const staffId of staffIds) {
    recipients.add(staffId)
  }
}

async function addCourseTeacherRecipients(
  recipients: Set<string>,
  courseId: string,
  actorId: string,
): Promise<void> {
  const teacherIds = await findTeacherIdsByCourseId(courseId)

  for (const teacherId of teacherIds) {
    if (teacherId !== actorId) {
      recipients.add(teacherId)
    }
  }
}

async function getRecipientsForPostCreated(
  event: PostCreatedEvent,
): Promise<RecipientResult> {
  const recipients = new Set<string>()
  const { actorId, courseId, canModerate } = event

  if (canModerate) {
    await addStudentRecipients(recipients, actorId)

    if (courseId === null) {
      await addStaffRecipients(recipients, actorId)
    }
  }

  if (courseId) {
    await addCourseTeacherRecipients(recipients, courseId, actorId)
  }

  return { recipientIds: Array.from(recipients) }
}

function getRecipientsForCommentCreated(
  event: CommentCreatedEvent,
): RecipientResult {
  const { actorId, postAuthorId } = event

  if (postAuthorId !== actorId) {
    return { recipientIds: [postAuthorId] }
  }

  return { recipientIds: [] }
}

export async function getRecipients(
  event: PostCreatedEvent | CommentCreatedEvent,
): Promise<RecipientResult> {
  switch (event.type) {
    case 'post_created':
      return getRecipientsForPostCreated(event)
    case 'comment_created':
      return getRecipientsForCommentCreated(event)
    default: {
      const _exhaustive: never = event
      throw new Error(
        `Unhandled notification event type: ${(_exhaustive as NotificationEvent).type}`,
      )
    }
  }
}

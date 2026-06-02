import { eq, sql } from 'drizzle-orm'
import type {
  CommentCreatedEvent,
  NotificationEvent,
  PostCreatedEvent,
  RecipientResult,
} from './types'
import { getDb } from '@/db'
import { courseTeachers, profiles } from '@/db/schema'

async function addStudentRecipients(
  db: Awaited<ReturnType<typeof getDb>>,
  recipients: Set<string>,
  actorId: string,
): Promise<void> {
  const studentRows = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(sql`${profiles.role} = 'student' AND ${profiles.id} <> ${actorId}`)

  for (const row of studentRows) {
    recipients.add(row.id)
  }
}

async function addStaffRecipients(
  db: Awaited<ReturnType<typeof getDb>>,
  recipients: Set<string>,
  actorId: string,
): Promise<void> {
  const staffRows = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(
      sql`${profiles.role} IN ('teacher','admin') AND ${profiles.id} <> ${actorId}`,
    )

  for (const row of staffRows) {
    recipients.add(row.id)
  }
}

async function addCourseTeacherRecipients(
  db: Awaited<ReturnType<typeof getDb>>,
  recipients: Set<string>,
  courseId: string,
  actorId: string,
): Promise<void> {
  const teacherRows = await db
    .select({ id: courseTeachers.teacherId })
    .from(courseTeachers)
    .where(eq(courseTeachers.courseId, courseId))

  for (const row of teacherRows) {
    if (row.id !== actorId) {
      recipients.add(row.id)
    }
  }
}

export async function getRecipientsForPostCreated(
  event: PostCreatedEvent,
): Promise<RecipientResult> {
  const db = await getDb()
  const recipients = new Set<string>()
  const { actorId, courseId, canModerate } = event

  if (canModerate) {
    await addStudentRecipients(db, recipients, actorId)

    if (courseId === null) {
      await addStaffRecipients(db, recipients, actorId)
    }
  }

  if (courseId) {
    await addCourseTeacherRecipients(db, recipients, courseId, actorId)
  }

  return { recipientIds: Array.from(recipients) }
}

export function getRecipientsForCommentCreated(
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

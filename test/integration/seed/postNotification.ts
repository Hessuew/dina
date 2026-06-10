import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import { postNotifications } from '@/db/schema'

export async function seedPostNotification(overrides: {
  id?: string
  userId: string
  postId: string
  event: 'post_created' | 'comment_created'
  actorId?: string
  commentId?: string
  isRead?: boolean
  createdAt?: Date
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(postNotifications).values({
    id,
    userId: overrides.userId,
    postId: overrides.postId,
    event: overrides.event,
    actorId: overrides.actorId ?? randomUUID(),
    ...(overrides.commentId !== undefined
      ? { commentId: overrides.commentId }
      : {}),
    ...(overrides.isRead !== undefined ? { isRead: overrides.isRead } : {}),
    ...(overrides.createdAt !== undefined
      ? { createdAt: overrides.createdAt }
      : {}),
  })
  return id
}

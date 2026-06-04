import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { courses, postNotifications, posts, profiles } from '@/db/schema'

/* v8 ignore start */

export async function findNotificationGroups(userId: string, limit: number) {
  const db = await getDb()
  return db
    .select({
      event: postNotifications.event,
      postId: postNotifications.postId,
      lastActivityAt: sql<Date>`max(${postNotifications.createdAt})`,
      unreadCount: sql<number>`sum(case when ${postNotifications.isRead} = false then 1 else 0 end)::int`,
    })
    .from(postNotifications)
    .where(eq(postNotifications.userId, userId))
    .groupBy(postNotifications.event, postNotifications.postId)
    .orderBy(desc(sql`max(${postNotifications.createdAt})`))
    .limit(limit)
}

export async function findUnreadGroupCount(userId: string): Promise<number> {
  const db = await getDb()
  const rows = await db
    .select({
      event: postNotifications.event,
      postId: postNotifications.postId,
    })
    .from(postNotifications)
    .where(
      and(
        eq(postNotifications.userId, userId),
        eq(postNotifications.isRead, false),
      ),
    )
    .groupBy(postNotifications.event, postNotifications.postId)

  return rows.length
}

export async function findPostsForNotifications(postIds: Array<string>) {
  if (postIds.length === 0) return []

  const db = await getDb()
  return db
    .select({
      id: posts.id,
      content: posts.content,
      courseId: posts.courseId,
      courseTitle: courses.title,
      authorName: profiles.fullName,
    })
    .from(posts)
    .leftJoin(courses, eq(posts.courseId, courses.id))
    .innerJoin(profiles, eq(posts.authorId, profiles.id))
    .where(and(inArray(posts.id, postIds), isNull(posts.deletedAt)))
}

export async function markNotificationGroupRead(
  userId: string,
  event: string,
  postId: string,
): Promise<void> {
  const db = await getDb()
  await db
    .update(postNotifications)
    .set({ isRead: true })
    .where(
      and(
        eq(postNotifications.userId, userId),
        eq(
          postNotifications.event,
          event as 'post_created' | 'comment_created',
        ),
        eq(postNotifications.postId, postId),
      ),
    )
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const db = await getDb()
  await db
    .update(postNotifications)
    .set({ isRead: true })
    .where(eq(postNotifications.userId, userId))
}

/* v8 ignore end */

import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { courses, postNotifications, posts, profiles } from '@/db/schema'
import {
  getPostNotificationsSummarySchema,
  markPostNotificationGroupReadSchema,
} from '@/schemas/postNotifications.schema'
import { getCurrentUser } from '@/utils/auth'

export type PostNotificationEvent = 'post_created' | 'comment_created'

export type PostNotificationGroup = {
  event: PostNotificationEvent
  postId: string
  courseId: string | null
  courseTitle: string | null
  postAuthorName: string
  postExcerpt: string
  unreadCount: number
  lastActivityAt: Date
}

function buildPostExcerpt(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 72) return normalized
  return `${normalized.slice(0, 72)}…`
}

export const getPostNotificationsSummary = createServerFn({ method: 'POST' })
  .inputValidator(getPostNotificationsSummarySchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    const limit = data.limit ?? 25

    const grouped = await db
      .select({
        event: postNotifications.event,
        postId: postNotifications.postId,
        lastActivityAt: sql<Date>`max(${postNotifications.createdAt})`,
        unreadCount: sql<number>`sum(case when ${postNotifications.isRead} = false then 1 else 0 end)::int`,
      })
      .from(postNotifications)
      .where(eq(postNotifications.userId, user.id))
      .groupBy(postNotifications.event, postNotifications.postId)
      .orderBy(desc(sql`max(${postNotifications.createdAt})`))
      .limit(limit)

    const unreadGroups = await db
      .select({
        event: postNotifications.event,
        postId: postNotifications.postId,
      })
      .from(postNotifications)
      .where(
        and(
          eq(postNotifications.userId, user.id),
          eq(postNotifications.isRead, false),
        ),
      )
      .groupBy(postNotifications.event, postNotifications.postId)

    const unreadGroupCount = unreadGroups.length

    const postIds = grouped.map((g) => g.postId)
    const postsById: Record<
      string,
      | {
          courseId: string | null
          courseTitle: string | null
          authorName: string
          content: string
        }
      | undefined
    > = {}

    if (postIds.length > 0) {
      const rows = await db
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

      for (const row of rows) {
        postsById[row.id] = {
          courseId: row.courseId ?? null,
          courseTitle: row.courseTitle ?? null,
          authorName: row.authorName,
          content: row.content,
        }
      }
    }

    const groups: Array<PostNotificationGroup> = grouped
      .map((g) => {
        const post = postsById[g.postId]
        if (!post) return null
        return {
          event: g.event as PostNotificationEvent,
          postId: g.postId,
          courseId: post.courseId,
          courseTitle: post.courseTitle,
          postAuthorName: post.authorName,
          postExcerpt: buildPostExcerpt(post.content),
          unreadCount: g.unreadCount,
          lastActivityAt: g.lastActivityAt,
        }
      })
      .filter((g): g is PostNotificationGroup => Boolean(g))

    return { groups, unreadGroupCount }
  })

export const markPostNotificationGroupRead = createServerFn({ method: 'POST' })
  .inputValidator(markPostNotificationGroupReadSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    await db
      .update(postNotifications)
      .set({ isRead: true })
      .where(
        and(
          eq(postNotifications.userId, user.id),
          eq(postNotifications.event, data.event),
          eq(postNotifications.postId, data.postId),
        ),
      )

    return { success: true }
  })

export const markAllPostNotificationsRead = createServerFn({
  method: 'POST',
}).handler(async () => {
  const user = await getCurrentUser()
  const db = await getDb()

  await db
    .update(postNotifications)
    .set({ isRead: true })
    .where(eq(postNotifications.userId, user.id))

  return { success: true }
})

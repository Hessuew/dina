import type {
  GetPostNotificationsSummaryInput,
  MarkPostNotificationGroupReadInput,
} from '@/schemas/postNotifications.schema'
import type {
  PostNotificationEvent,
  PostNotificationGroup,
} from '@/utils/post/notifications/domain/notification.domain'
import { buildPostExcerpt } from '@/utils/post/notifications/domain/notification.domain'
import {
  findNotificationGroups,
  findPostsForNotifications,
  findUnreadGroupCount,
  markAllNotificationsRead,
  markNotificationGroupRead,
} from '@/utils/post/notifications/repository/notification.repository'

export async function getPostNotificationsSummaryService(
  data: GetPostNotificationsSummaryInput,
  userId: string,
): Promise<{
  groups: Array<PostNotificationGroup>
  unreadGroupCount: number
}> {
  const limit = data.limit ?? 25
  const [grouped, unreadGroupCount] = await Promise.all([
    findNotificationGroups(userId, limit),
    findUnreadGroupCount(userId),
  ])

  const postIds = grouped.map((g) => g.postId)
  const postRows = await findPostsForNotifications(postIds)

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

  for (const row of postRows) {
    postsById[row.id] = {
      courseId: row.courseId ?? null,
      courseTitle: row.courseTitle ?? null,
      authorName: row.authorName,
      content: row.content,
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
}

export async function markPostNotificationGroupReadService(
  data: MarkPostNotificationGroupReadInput,
  userId: string,
): Promise<{ success: true }> {
  await markNotificationGroupRead(userId, data.event, data.postId)
  return { success: true }
}

export async function markAllPostNotificationsReadService(
  userId: string,
): Promise<{ success: true }> {
  await markAllNotificationsRead(userId)
  return { success: true }
}

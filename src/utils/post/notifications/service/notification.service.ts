import type {
  GetPostNotificationsSummaryInput,
  MarkPostNotificationGroupReadInput,
} from '@/schemas/postNotifications.schema'
import type { LogLevel } from '@/utils/observability/logger'
import type {
  PostNotificationEvent,
  PostNotificationGroup,
} from '@/utils/post/notifications/domain/notification.domain'
import { buildPostExcerpt } from '@/utils/post/notifications/domain/notification.domain'
import { getUserProfile } from '@/utils/auth/auth'
import { isAppError } from '@/utils/errors'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'
import {
  findNotificationGroups,
  findPostsForNotifications,
  findUnreadGroupCount,
  markAllNotificationsRead,
  markNotificationGroupRead,
} from '@/utils/post/notifications/repository/notification.repository'

type NotificationReadLogContext = {
  action: 'markPostNotificationGroupRead' | 'markAllPostNotificationsRead'
  actorId: string
  postId?: string
  notificationEvent?: string
  startedAt: number
}

type NotificationSummaryLogContext = {
  action: 'getPostNotificationsSummary'
  actorId: string
  limit: number
  startedAt: number
}

type NotificationSummaryResult = {
  groups: Array<PostNotificationGroup>
  unreadGroupCount: number
}

async function requireNotificationActor(userId: string): Promise<void> {
  await getUserProfile(userId)
}

function logNotificationReadEvent(
  level: LogLevel,
  event: string,
  context: NotificationReadLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    postId: context.postId,
    notificationEvent: context.notificationEvent,
    ...fields,
  })
}

function logNotificationSummaryEvent(
  level: LogLevel,
  event: string,
  context: NotificationSummaryLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    limit: context.limit,
    ...fields,
  })
}

function shouldLogNotificationSummaryFailure(error: unknown): boolean {
  return !isAppError(error) || error.status >= 500
}

async function withNotificationSummaryTelemetry<T>(args: {
  context: NotificationSummaryLogContext
  read: () => Promise<T>
  fields: (result: T) => Record<string, unknown>
}): Promise<T> {
  try {
    const result = await args.read()
    logNotificationSummaryEvent(
      'info',
      'notification_summary_loaded',
      args.context,
      args.fields(result),
    )
    return result
  } catch (error) {
    if (shouldLogNotificationSummaryFailure(error)) {
      logNotificationSummaryEvent(
        'error',
        'notification_summary_load_failed',
        args.context,
        { errorCategory: 'notification_summary_read_persistence' },
      )
    }
    throw error
  }
}

async function readNotificationSummary(
  userId: string,
  limit: number,
): Promise<NotificationSummaryResult> {
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

export async function getPostNotificationsSummaryService(
  data: GetPostNotificationsSummaryInput,
  userId: string,
): Promise<NotificationSummaryResult> {
  await requireNotificationActor(userId)
  const limit = data.limit ?? 25
  const context: NotificationSummaryLogContext = {
    action: 'getPostNotificationsSummary',
    actorId: userId,
    limit,
    startedAt: performance.now(),
  }

  return withNotificationSummaryTelemetry({
    context,
    read: () => readNotificationSummary(userId, limit),
    fields: (result) => ({
      groupCount: result.groups.length,
      unreadGroupCount: result.unreadGroupCount,
    }),
  })
}

export async function markPostNotificationGroupReadService(
  data: MarkPostNotificationGroupReadInput,
  userId: string,
): Promise<{ success: true }> {
  await requireNotificationActor(userId)
  const context: NotificationReadLogContext = {
    action: 'markPostNotificationGroupRead',
    actorId: userId,
    postId: data.postId,
    notificationEvent: data.event,
    startedAt: performance.now(),
  }

  try {
    await markNotificationGroupRead(userId, data.event, data.postId)
    logNotificationReadEvent('info', 'notification_group_marked_read', context)
    return { success: true }
  } catch (error) {
    logNotificationReadEvent(
      'error',
      'notification_read_state_failed',
      context,
      {
        errorCategory: 'notification_read_state_persistence',
        readScope: 'group',
      },
    )
    throw error
  }
}

export async function markAllPostNotificationsReadService(
  userId: string,
): Promise<{ success: true }> {
  await requireNotificationActor(userId)
  const context: NotificationReadLogContext = {
    action: 'markAllPostNotificationsRead',
    actorId: userId,
    startedAt: performance.now(),
  }

  try {
    await markAllNotificationsRead(userId)
    logNotificationReadEvent('info', 'notifications_marked_read', context, {
      readScope: 'all',
    })
    return { success: true }
  } catch (error) {
    logNotificationReadEvent(
      'error',
      'notification_read_state_failed',
      context,
      {
        errorCategory: 'notification_read_state_persistence',
        readScope: 'all',
      },
    )
    throw error
  }
}

import { describe, expect, it } from 'vitest'
import {
  getPostNotificationsSummaryService,
  markAllPostNotificationsReadService,
  markPostNotificationGroupReadService,
} from '@/utils/post/notifications/service/notification.service'
import {
  seedPost,
  seedPostNotification,
  seedProfile,
} from '@/../test/integration/seed'

// Notification services read/aggregate post_notifications directly (no external
// IO). We seed notifications rather than emit events, so the summary + mark-read
// services are exercised in isolation against a real DB (PGlite via `@/db`).
// See docs/TESTING_GUIDE.md / ADR 0009.

describe('getPostNotificationsSummaryService (integration)', () => {
  it('returns empty results when the user has no notifications', async () => {
    const userId = await seedProfile({ role: 'student' })

    const result = await getPostNotificationsSummaryService({}, userId)

    expect(result.groups).toEqual([])
    expect(result.unreadGroupCount).toBe(0)
  })

  it('groups notifications by event and post with unread counts and an excerpt', async () => {
    const userId = await seedProfile({ role: 'student' })
    const authorId = await seedProfile({ role: 'teacher' })
    const postId = await seedPost({
      authorId,
      content: 'A reasonably interesting announcement',
    })
    await seedPostNotification({ userId, postId, event: 'post_created' })
    await seedPostNotification({ userId, postId, event: 'comment_created' })
    await seedPostNotification({ userId, postId, event: 'comment_created' })

    const result = await getPostNotificationsSummaryService({}, userId)

    expect(result.groups).toHaveLength(2)
    expect(result.unreadGroupCount).toBe(2)
    const commentGroup = result.groups.find(
      (g) => g.event === 'comment_created',
    )
    expect(commentGroup?.unreadCount).toBe(2)
    expect(commentGroup?.postExcerpt).toBe(
      'A reasonably interesting announcement',
    )
  })

  it('drops groups whose post is soft-deleted while still counting them as unread', async () => {
    const userId = await seedProfile({ role: 'student' })
    const authorId = await seedProfile({ role: 'teacher' })
    const deletedPostId = await seedPost({ authorId, deletedAt: new Date() })
    await seedPostNotification({
      userId,
      postId: deletedPostId,
      event: 'post_created',
    })
    const livePostId = await seedPost({ authorId, content: 'live' })
    await seedPostNotification({
      userId,
      postId: livePostId,
      event: 'post_created',
    })

    const result = await getPostNotificationsSummaryService({}, userId)

    // findPostsForNotifications filters out the soft-deleted post, so only the
    // live group is returned; unread count still reflects both groups.
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].postId).toBe(livePostId)
    expect(result.unreadGroupCount).toBe(2)
  })
})

describe('markPostNotificationGroupReadService (integration)', () => {
  it('marks only the matching event+post group as read', async () => {
    const userId = await seedProfile({ role: 'student' })
    const authorId = await seedProfile({ role: 'teacher' })
    const postId = await seedPost({ authorId })
    await seedPostNotification({ userId, postId, event: 'post_created' })
    await seedPostNotification({ userId, postId, event: 'comment_created' })

    await markPostNotificationGroupReadService(
      { event: 'post_created', postId },
      userId,
    )

    const result = await getPostNotificationsSummaryService({}, userId)
    expect(result.unreadGroupCount).toBe(1)
    const remaining = result.groups.find((g) => g.unreadCount > 0)
    expect(remaining?.event).toBe('comment_created')
  })
})

describe('markAllPostNotificationsReadService (integration)', () => {
  it('marks every notification for the user as read', async () => {
    const userId = await seedProfile({ role: 'student' })
    const authorId = await seedProfile({ role: 'teacher' })
    const postId = await seedPost({ authorId })
    await seedPostNotification({ userId, postId, event: 'post_created' })
    await seedPostNotification({ userId, postId, event: 'comment_created' })

    await markAllPostNotificationsReadService(userId)

    const result = await getPostNotificationsSummaryService({}, userId)
    expect(result.unreadGroupCount).toBe(0)
  })
})

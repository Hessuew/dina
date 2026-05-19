import { createServerFn } from '@tanstack/react-start'
import {
  getPostNotificationsSummarySchema,
  markPostNotificationGroupReadSchema,
} from '@/schemas/postNotifications.schema'
import { getCurrentUser } from '@/utils/auth/auth'
import {
  getPostNotificationsSummaryService,
  markAllPostNotificationsReadService,
  markPostNotificationGroupReadService,
} from '@/utils/post/notifications/service/notification.service'

export type {
  PostNotificationEvent,
  PostNotificationGroup,
} from '@/utils/post/notifications/domain/notification.domain'

export const getPostNotificationsSummary = createServerFn({ method: 'POST' })
  .inputValidator(getPostNotificationsSummarySchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getPostNotificationsSummaryService(data, user.id)
  })

export const markPostNotificationGroupRead = createServerFn({ method: 'POST' })
  .inputValidator(markPostNotificationGroupReadSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return markPostNotificationGroupReadService(data, user.id)
  })

export const markAllPostNotificationsRead = createServerFn({
  method: 'POST',
}).handler(async () => {
  const user = await getCurrentUser()
  return markAllPostNotificationsReadService(user.id)
})

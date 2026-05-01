import { z } from 'zod'

export const getPostNotificationsSummarySchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
})

export const markPostNotificationGroupReadSchema = z.object({
  event: z.enum(['post_created', 'comment_created']),
  postId: z.uuid('Invalid post ID'),
})

export type GetPostNotificationsSummaryInput = z.infer<
  typeof getPostNotificationsSummarySchema
>
export type MarkPostNotificationGroupReadInput = z.infer<
  typeof markPostNotificationGroupReadSchema
>

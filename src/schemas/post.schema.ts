import { z } from 'zod'

export const REACTION_EMOJIS = [
  '👍',
  '❤️',
  '😂',
  '😮',
  '😢',
  '😡',
  '🎉',
  '👏',
  '🔥',
  '❤️‍🔥',
] as const

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number]

export const createPostSchema = z.object({
  courseId: z.string().uuid().nullable().optional(),
  content: z.string().min(1, 'Post cannot be empty').max(5000),
})

export const updatePostSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().min(1, 'Post cannot be empty').max(5000),
})

export const deletePostSchema = z.object({
  postId: z.string().uuid(),
})

export const toggleReactionSchema = z.object({
  postId: z.string().uuid(),
  emoji: z
    .string()
    .refine((val) => (REACTION_EMOJIS as ReadonlyArray<string>).includes(val), {
      message: 'Invalid reaction emoji',
    }),
})

export const toggleCommentReactionSchema = z.object({
  commentId: z.string().uuid(),
  emoji: z
    .string()
    .refine((val) => (REACTION_EMOJIS as ReadonlyArray<string>).includes(val), {
      message: 'Invalid reaction emoji',
    }),
})

export const createCommentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
})

export const updateCommentSchema = z.object({
  commentId: z.string().uuid(),
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
})

export const deleteCommentSchema = z.object({
  commentId: z.string().uuid(),
})

export const getPostsSchema = z.object({
  courseId: z.string().uuid().nullable().optional(),
  limit: z.number().int().min(1).max(50).default(10),
  cursor: z
    .object({
      createdAt: z.string(),
      id: z.string().uuid(),
    })
    .optional(),
})

export const getCommentsSchema = z.object({
  postId: z.string().uuid(),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z
    .object({
      createdAt: z.string(),
      id: z.string().uuid(),
    })
    .optional(),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>
export type DeletePostInput = z.infer<typeof deletePostSchema>
export type ToggleReactionInput = z.infer<typeof toggleReactionSchema>
export type ToggleCommentReactionInput = z.infer<
  typeof toggleCommentReactionSchema
>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>
export type GetPostsInput = z.infer<typeof getPostsSchema>
export type GetCommentsInput = z.infer<typeof getCommentsSchema>

import { createServerFn } from '@tanstack/react-start'
import {
  createCommentSchema,
  createPostSchema,
  deleteCommentSchema,
  deletePostSchema,
  getCommentsSchema,
  getPostByIdSchema,
  getPostsSchema,
  toggleCommentReactionSchema,
  toggleReactionSchema,
  updateCommentSchema,
  updatePostSchema,
} from '@/schemas/post.schema'
import { getCurrentUser } from '@/utils/auth/auth'
import { withRequestCache } from '@/utils/authz'
import {
  createCommentWithNotification,
  createPostWithNotification,
} from '@/utils/post/application/post.application'
import {
  deleteCommentService,
  deletePostService,
  getCommentsService,
  getPostByIdService,
  getPostChannelsService,
  getPostsService,
  toggleCommentReactionService,
  togglePostReactionService,
  updateCommentService,
  updatePostService,
} from '@/utils/post/service/post.service'

export const getPostChannels = createServerFn({ method: 'POST' }).handler(
  async () => {
    return withRequestCache(async () => {
      await getCurrentUser()
      return getPostChannelsService()
    })
  },
)

export const getPosts = createServerFn({ method: 'POST' })
  .inputValidator(getPostsSchema)
  .handler(async ({ data }) => {
    return withRequestCache(async () => {
      await getCurrentUser()
      return getPostsService(data)
    })
  })

export const createPost = createServerFn({ method: 'POST' })
  .inputValidator(createPostSchema)
  .handler(async ({ data }) => {
    return withRequestCache(async () => {
      const user = await getCurrentUser()
      return createPostWithNotification(data, user.id)
    })
  })

export const getPostById = createServerFn({ method: 'POST' })
  .inputValidator(getPostByIdSchema)
  .handler(async ({ data }) => {
    return withRequestCache(async () => {
      // Auth boundary: prevents unauthenticated access to post content
      await getCurrentUser()
      return getPostByIdService(data)
    })
  })

export const updatePost = createServerFn({ method: 'POST' })
  .inputValidator(updatePostSchema)
  .handler(async ({ data }) => {
    return withRequestCache(async () => {
      const user = await getCurrentUser()
      return updatePostService(data, user.id)
    })
  })

export const deletePost = createServerFn({ method: 'POST' })
  .inputValidator(deletePostSchema)
  .handler(async ({ data }) => {
    return withRequestCache(async () => {
      const user = await getCurrentUser()
      return deletePostService(data, user.id)
    })
  })

export const toggleReaction = createServerFn({ method: 'POST' })
  .inputValidator(toggleReactionSchema)
  .handler(async ({ data }) => {
    return withRequestCache(async () => {
      const user = await getCurrentUser()
      return togglePostReactionService(data, user.id)
    })
  })

export const toggleCommentReaction = createServerFn({ method: 'POST' })
  .inputValidator(toggleCommentReactionSchema)
  .handler(async ({ data }) => {
    return withRequestCache(async () => {
      const user = await getCurrentUser()
      return toggleCommentReactionService(data, user.id)
    })
  })

export const getComments = createServerFn({ method: 'POST' })
  .inputValidator(getCommentsSchema)
  .handler(async ({ data }) => {
    return withRequestCache(async () => {
      await getCurrentUser()
      return getCommentsService(data)
    })
  })

export const createComment = createServerFn({ method: 'POST' })
  .inputValidator(createCommentSchema)
  .handler(async ({ data }) => {
    return withRequestCache(async () => {
      const user = await getCurrentUser()
      return createCommentWithNotification(data, user.id)
    })
  })

export const updateComment = createServerFn({ method: 'POST' })
  .inputValidator(updateCommentSchema)
  .handler(async ({ data }) => {
    return withRequestCache(async () => {
      const user = await getCurrentUser()
      return updateCommentService(data, user.id)
    })
  })

export const deleteComment = createServerFn({ method: 'POST' })
  .inputValidator(deleteCommentSchema)
  .handler(async ({ data }) => {
    return withRequestCache(async () => {
      const user = await getCurrentUser()
      return deleteCommentService(data, user.id)
    })
  })

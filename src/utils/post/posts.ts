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
    await getCurrentUser()
    return withRequestCache(() => getPostChannelsService())
  },
)

export const getPosts = createServerFn({ method: 'POST' })
  .inputValidator(getPostsSchema)
  .handler(async ({ data }) => {
    await getCurrentUser()
    return withRequestCache(() => getPostsService(data))
  })

export const createPost = createServerFn({ method: 'POST' })
  .inputValidator(createPostSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return withRequestCache(() => createPostWithNotification(data, user.id))
  })

export const getPostById = createServerFn({ method: 'POST' })
  .inputValidator(getPostByIdSchema)
  .handler(async ({ data }) => {
    // TODO: is this needed?
    await getCurrentUser()
    return withRequestCache(() => getPostByIdService(data))
  })

export const updatePost = createServerFn({ method: 'POST' })
  .inputValidator(updatePostSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return withRequestCache(() => updatePostService(data, user.id))
  })

export const deletePost = createServerFn({ method: 'POST' })
  .inputValidator(deletePostSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return withRequestCache(() => deletePostService(data, user.id))
  })

export const toggleReaction = createServerFn({ method: 'POST' })
  .inputValidator(toggleReactionSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return withRequestCache(() => togglePostReactionService(data, user.id))
  })

export const toggleCommentReaction = createServerFn({ method: 'POST' })
  .inputValidator(toggleCommentReactionSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return withRequestCache(() => toggleCommentReactionService(data, user.id))
  })

export const getComments = createServerFn({ method: 'POST' })
  .inputValidator(getCommentsSchema)
  .handler(async ({ data }) => {
    await getCurrentUser()
    return withRequestCache(() => getCommentsService(data))
  })

export const createComment = createServerFn({ method: 'POST' })
  .inputValidator(createCommentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return withRequestCache(() => createCommentWithNotification(data, user.id))
  })

export const updateComment = createServerFn({ method: 'POST' })
  .inputValidator(updateCommentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return withRequestCache(() => updateCommentService(data, user.id))
  })

export const deleteComment = createServerFn({ method: 'POST' })
  .inputValidator(deleteCommentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return withRequestCache(() => deleteCommentService(data, user.id))
  })

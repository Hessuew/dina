export type PostChannel =
  | { id: 'general'; name: 'General'; courseId: null }
  | { id: string; name: string; courseId: string }

export type PostAuthor = {
  id: string
  fullName: string
  avatarUrl: string | null
}

export type PostReaction = { id: string; emoji: string; userId: string }

export type PostSource = {
  id: string
  authorId: string
  courseId: string | null
  content: string
  createdAt: Date
  updatedAt: Date
}

export type PostCourseSource = { id: string; title: string }

export type PostProfileSource = {
  id: string
  fullName: string
  avatarUrl: string | null
}

export type PostReactionSource = PostReaction & { postId: string }

export type PostCommentSource = {
  id: string
  postId: string
  authorId: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export type PostCommentReactionSource = PostReaction & { commentId: string }

export type RawComment = {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
  author: PostAuthor
  reactions: Array<PostReaction>
}

export type PostWithDetails = {
  id: string
  course: { id: string; title: string } | null
  content: string
  createdAt: Date
  updatedAt: Date
  author: PostAuthor
  reactions: Array<PostReaction>
  commentCount: number
  previewComments: Array<RawComment>
}

export type RawPostWithDetails = {
  id: string
  course: { id: string; title: string } | null
  content: string
  createdAt: Date
  updatedAt: Date
  author: PostAuthor
  reactions: Array<PostReaction>
  comments: Array<RawComment>
}

export type CommentWithAuthor = RawComment

export type ReactionAction = 'added' | 'updated' | 'removed'

export function composePostWithDetails(
  post: PostSource,
  courses: ReadonlyArray<PostCourseSource>,
  profiles: ReadonlyArray<PostProfileSource>,
  postReactions: ReadonlyArray<PostReactionSource>,
  comments: ReadonlyArray<PostCommentSource>,
  commentReactions: ReadonlyArray<PostCommentReactionSource>,
): RawPostWithDetails | undefined {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
  const author = profilesById.get(post.authorId)
  if (!author) return undefined

  const course = post.courseId
    ? (courses.find((candidate) => candidate.id === post.courseId) ?? null)
    : null
  const reactions = postReactions
    .filter((reaction) => reaction.postId === post.id)
    .map(({ id, emoji, userId }) => ({ id, emoji, userId }))
  const rawComments = comments
    .filter((comment) => comment.postId === post.id)
    .flatMap((comment) => {
      const commentAuthor = profilesById.get(comment.authorId)
      if (!commentAuthor) return []
      return [
        {
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          author: commentAuthor,
          reactions: commentReactions
            .filter((reaction) => reaction.commentId === comment.id)
            .map(({ id, emoji, userId }) => ({ id, emoji, userId })),
        },
      ]
    })

  return {
    id: post.id,
    course,
    content: post.content,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author,
    reactions,
    comments: rawComments,
  }
}

export function composePostsWithDetails(
  posts: ReadonlyArray<PostSource>,
  courses: ReadonlyArray<PostCourseSource>,
  profiles: ReadonlyArray<PostProfileSource>,
  postReactions: ReadonlyArray<PostReactionSource>,
  comments: ReadonlyArray<PostCommentSource>,
  commentReactions: ReadonlyArray<PostCommentReactionSource>,
): Array<RawPostWithDetails> {
  return posts.flatMap((post) => {
    const composed = composePostWithDetails(
      post,
      courses,
      profiles,
      postReactions,
      comments,
      commentReactions,
    )
    return composed ? [composed] : []
  })
}

export function transformPostWithDetails(
  post: RawPostWithDetails,
  commentCount: number,
): PostWithDetails {
  return {
    id: post.id,
    course: post.course,
    content: post.content,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: post.author,
    reactions: post.reactions,
    commentCount,
    previewComments: post.comments
      .slice()
      .reverse()
      .map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        author: c.author,
        reactions: c.reactions,
      })),
  }
}

export function transformCommentWithAuthor(
  comment: RawComment,
): CommentWithAuthor {
  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: comment.author,
    reactions: comment.reactions,
  }
}

export function determineReactionAction(
  existing: { emoji: string } | null | undefined,
  emoji: string,
): ReactionAction {
  if (!existing) return 'added'
  if (existing.emoji === emoji) return 'removed'
  return 'updated'
}

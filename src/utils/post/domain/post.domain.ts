export type PostChannel =
  | { id: 'general'; name: 'General'; courseId: null }
  | { id: string; name: string; courseId: string }

export type PostWithDetails = {
  id: string
  course: {
    id: string
    title: string
  } | null
  content: string
  createdAt: Date
  updatedAt: Date
  author: {
    id: string
    fullName: string
    avatarUrl: string | null
  }
  reactions: Array<{
    id: string
    emoji: string
    userId: string
  }>
  commentCount: number
  previewComments: Array<{
    id: string
    content: string
    createdAt: Date
    updatedAt: Date
    author: {
      id: string
      fullName: string
      avatarUrl: string | null
    }
    reactions: Array<{
      id: string
      emoji: string
      userId: string
    }>
  }>
}

export type CommentWithAuthor = {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
  author: {
    id: string
    fullName: string
    avatarUrl: string | null
  }
  reactions: Array<{
    id: string
    emoji: string
    userId: string
  }>
}

export type ReactionAction = 'added' | 'updated' | 'removed'

export function transformPostWithDetails(
  post: {
    id: string
    course: { id: string; title: string } | null
    content: string
    createdAt: Date
    updatedAt: Date
    author: { id: string; fullName: string; avatarUrl: string | null }
    reactions: Array<{ id: string; emoji: string; userId: string }>
    comments: Array<{
      id: string
      content: string
      createdAt: Date
      updatedAt: Date
      author: { id: string; fullName: string; avatarUrl: string | null }
      reactions: Array<{ id: string; emoji: string; userId: string }>
    }>
  },
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

export function transformCommentWithAuthor(comment: {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
  author: { id: string; fullName: string; avatarUrl: string | null }
  reactions: Array<{ id: string; emoji: string; userId: string }>
}): CommentWithAuthor {
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

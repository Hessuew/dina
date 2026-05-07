import { and, inArray, isNull, sql } from 'drizzle-orm'
import { postComments } from '@/db/schema'

// Db type is the Drizzle database instance returned by getDb()
// Using 'any' here is acceptable since the function only uses standard Drizzle query builder methods
// which are type-safe at the call site
type Db = any

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

/**
 * Calculates comment counts for multiple posts
 */
export async function calculateCommentCounts(
  db: Db,
  postIds: Array<string>,
): Promise<Record<string, number>> {
  if (postIds.length === 0) return {}

  const countRows = await db
    .select({
      postId: postComments.postId,
      count: sql<number>`count(*)::int`,
    })
    .from(postComments)
    .where(
      and(
        inArray(postComments.postId, postIds),
        isNull(postComments.deletedAt),
      ),
    )
    .groupBy(postComments.postId)

  return Object.fromEntries(
    countRows.map((r: { postId: string; count: number }) => [
      r.postId,
      r.count,
    ]),
  )
}

/**
 * Transforms database post to PostWithDetails format
 */
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

/**
 * Determines reaction action (added/updated/removed) based on existing reaction
 */
export type ReactionAction = 'added' | 'updated' | 'removed'

export function determineReactionAction(
  existing: { emoji: string } | null | undefined,
  emoji: string,
): ReactionAction {
  if (!existing) return 'added'
  if (existing.emoji === emoji) return 'removed'
  return 'updated'
}

/**
 * Transforms database comment to CommentWithAuthor format
 */
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

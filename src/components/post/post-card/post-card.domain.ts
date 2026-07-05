import type {
  CommentWithAuthor,
  PostReaction,
} from '@/utils/post/domain/post.domain'

/**
 * Optimistically toggles the current user's reaction in a reaction list:
 * same emoji removes it, different emoji replaces it, none adds a temp one.
 */
export function toggleReactionInList(
  reactions: Array<PostReaction>,
  userId: string,
  emoji: string,
  tempId: string,
): Array<PostReaction> {
  const existing = reactions.find((r) => r.userId === userId)
  if (existing && existing.emoji === emoji) {
    return reactions.filter((r) => r.id !== existing.id)
  }
  if (existing) {
    return reactions.map((r) => (r.id === existing.id ? { ...r, emoji } : r))
  }
  return [...reactions, { id: tempId, emoji, userId }]
}

/** True when updatedAt trails createdAt by more than a second. */
export function isEditedTimestamps(createdAt: Date, updatedAt: Date): boolean {
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 1000
}

export function appendToPreview(
  previewComments: Array<CommentWithAuthor>,
  comment: CommentWithAuthor,
): Array<CommentWithAuthor> {
  return [...previewComments.slice(-2), comment]
}

export function removeCommentById(
  comments: Array<CommentWithAuthor>,
  commentId: string,
): Array<CommentWithAuthor> {
  return comments.filter((c) => c.id !== commentId)
}

export function replaceComment(
  comments: Array<CommentWithAuthor>,
  updated: CommentWithAuthor,
): Array<CommentWithAuthor> {
  return comments.map((c) => (c.id === updated.id ? updated : c))
}

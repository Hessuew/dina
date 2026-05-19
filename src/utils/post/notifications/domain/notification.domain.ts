export type PostNotificationEvent = 'post_created' | 'comment_created'

export type PostNotificationGroup = {
  event: PostNotificationEvent
  postId: string
  courseId: string | null
  courseTitle: string | null
  postAuthorName: string
  postExcerpt: string
  unreadCount: number
  lastActivityAt: Date
}

export function buildPostExcerpt(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 72) return normalized
  return `${normalized.slice(0, 72)}…`
}

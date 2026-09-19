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

export type NotificationPostSource = {
  id: string
  content: string
  courseId: string | null
  authorId: string
}

export type NotificationCourseSource = {
  id: string
  title: string
}

export type NotificationAuthorSource = {
  id: string
  fullName: string
}

export type NotificationPostRow = {
  id: string
  content: string
  courseId: string | null
  courseTitle: string | null
  authorName: string
}

export function buildNotificationPostRows(
  posts: Array<NotificationPostSource>,
  courses: Array<NotificationCourseSource>,
  authors: Array<NotificationAuthorSource>,
): Array<NotificationPostRow> {
  const coursesById = new Map(courses.map((course) => [course.id, course]))
  const authorsById = new Map(authors.map((author) => [author.id, author]))

  return posts.flatMap((post) => {
    const author = authorsById.get(post.authorId)
    if (!author) return []
    const course = post.courseId ? coursesById.get(post.courseId) : undefined
    return [
      {
        id: post.id,
        content: post.content,
        courseId: post.courseId,
        courseTitle: course?.title ?? null,
        authorName: author.fullName,
      },
    ]
  })
}

export function buildPostExcerpt(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 72) return normalized
  return `${normalized.slice(0, 72)}…`
}

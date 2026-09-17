import { and, eq, inArray, isNull } from 'drizzle-orm'
import { getDb } from '@/db'
import { courses, posts, profiles } from '@/db/schema'

/* v8 ignore start */

export async function findPostsForNotifications(postIds: Array<string>) {
  if (postIds.length === 0) return []

  const db = await getDb()
  return db
    .select({
      id: posts.id,
      content: posts.content,
      courseId: posts.courseId,
      courseTitle: courses.title,
      authorName: profiles.fullName,
    })
    .from(posts)
    .leftJoin(courses, eq(posts.courseId, courses.id))
    .innerJoin(profiles, eq(posts.authorId, profiles.id))
    .where(and(inArray(posts.id, postIds), isNull(posts.deletedAt)))
}

/* v8 ignore end */

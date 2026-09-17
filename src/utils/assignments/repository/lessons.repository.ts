/* v8 ignore start */
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { lessons } from '@/db/schema'

export async function findLessonWithDetail(lessonId: string) {
  const db = await getDb()
  return db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
    with: {
      course: {
        with: {
          courseTeachers: {
            with: {
              teacher: {
                columns: { avatarUrl: true, id: true, fullName: true },
              },
            },
          },
        },
      },
      assignments: {
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      },
    },
  })
}
/* v8 ignore end */

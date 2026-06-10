import { getDb } from 'test/integration/db'
import { enrollmentReviewerAssignments } from '@/db/schema'

export async function seedReviewerAssignment(
  enrollmentId: string,
  reviewerId: string,
): Promise<void> {
  const db = await getDb()
  await db
    .insert(enrollmentReviewerAssignments)
    .values({ enrollmentId, reviewerId })
}

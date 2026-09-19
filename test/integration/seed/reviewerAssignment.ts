import { bulkAssignEnrollments } from '@/utils/repository'

export async function seedReviewerAssignment(
  enrollmentId: string,
  reviewerId: string,
  courseId?: string,
): Promise<void> {
  await bulkAssignEnrollments([{ enrollmentId, reviewerId, courseId }])
}

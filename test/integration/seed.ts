// Insert helpers for integration tests. Mirror the unit-test `makeX` factory style:
// callers state only the fields relevant to their test, everything else defaults.
import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import type { Role } from '@/utils/authz'
import {
  courses,
  enrollmentReviewerAssignments,
  enrollments,
  profiles,
} from '@/db/schema'

type EnrollmentStatus =
  | 'pending'
  | 'under_review'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'waitlisted'
  | 'withdrawn'
  | 'deferred'

export async function seedProfile(
  overrides: {
    id?: string
    email?: string
    fullName?: string
    role?: Role
  } = {},
): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(profiles).values({
    id,
    email: overrides.email ?? `${id}@test.dev`,
    fullName: overrides.fullName ?? 'Test User',
    role: overrides.role ?? 'student',
  })
  return id
}

export async function seedCourse(
  overrides: { id?: string; title?: string } = {},
): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(courses).values({
    id,
    title: overrides.title ?? 'Test Course',
  })
  return id
}

export async function seedEnrollment(
  overrides: { id?: string; email?: string; status?: EnrollmentStatus } = {},
): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(enrollments).values({
    id,
    fullLegalName: 'Applicant Test',
    email: overrides.email ?? `${id}@test.dev`,
    yearOfBirth: 1995,
    gender: 'female',
    phoneWhatsApp: '+10000000000',
    aboutYourself: 'about',
    expectationsAlignment: 'expectations',
    ...(overrides.status ? { status: overrides.status } : {}),
  })
  return id
}

export async function seedReviewerAssignment(
  enrollmentId: string,
  reviewerId: string,
): Promise<void> {
  const db = await getDb()
  await db
    .insert(enrollmentReviewerAssignments)
    .values({ enrollmentId, reviewerId })
}

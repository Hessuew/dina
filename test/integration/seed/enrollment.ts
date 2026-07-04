import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import { enrollments } from '@/db/schema'

type EnrollmentStatus =
  | 'pending'
  | 'under_review'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'waitlisted'
  | 'withdrawn'
  | 'deferred'

export async function seedEnrollment(
  overrides: {
    id?: string
    email?: string
    status?: EnrollmentStatus
    invitationSent?: boolean
    invitationId?: string | null
  } = {},
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
    ...(overrides.invitationSent !== undefined
      ? { invitationSent: overrides.invitationSent }
      : {}),
    ...(overrides.invitationId !== undefined
      ? { invitationId: overrides.invitationId }
      : {}),
  })
  return id
}

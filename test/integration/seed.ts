// Insert helpers for integration tests. Mirror the unit-test `makeX` factory style:
// callers state only the fields relevant to their test, everything else defaults.
import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import type { Role } from '@/utils/authz'
import type { SubmissionStatus } from '@/types/database.types'
import {
  assignments,
  courseTeachers,
  courses,
  enrollmentReviewerAssignments,
  enrollments,
  lessons,
  profiles,
  submissions,
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

export async function seedCourseTeacher(
  courseId: string,
  teacherId: string,
): Promise<void> {
  const db = await getDb()
  await db.insert(courseTeachers).values({ courseId, teacherId })
}

export async function seedLesson(overrides: {
  id?: string
  courseId: string
  title?: string
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(lessons).values({
    id,
    courseId: overrides.courseId,
    title: overrides.title ?? 'Test Lesson',
  })
  return id
}

export async function seedAssignment(overrides: {
  id?: string
  lessonId: string
  title?: string
  dueDate?: Date
  maxGrade?: number
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(assignments).values({
    id,
    lessonId: overrides.lessonId,
    title: overrides.title ?? 'Test Assignment',
    dueDate: overrides.dueDate ?? new Date(),
    ...(overrides.maxGrade !== undefined ? { maxGrade: overrides.maxGrade } : {}),
  })
  return id
}

export async function seedSubmission(overrides: {
  id?: string
  assignmentId: string
  studentId: string
  status?: SubmissionStatus
  grade?: number
  submittedAt?: Date
  feedback?: string
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(submissions).values({
    id,
    assignmentId: overrides.assignmentId,
    studentId: overrides.studentId,
    ...(overrides.status ? { status: overrides.status } : {}),
    ...(overrides.grade !== undefined ? { grade: overrides.grade } : {}),
    ...(overrides.submittedAt ? { submittedAt: overrides.submittedAt } : {}),
    ...(overrides.feedback !== undefined
      ? { feedback: overrides.feedback }
      : {}),
  })
  return id
}

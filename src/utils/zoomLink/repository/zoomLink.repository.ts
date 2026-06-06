import { asc, eq } from 'drizzle-orm'
import type {
  buildCreateZoomLinkValues,
  buildUpdateZoomLinkValues,
} from '@/utils/zoomLink/domain/zoomLink.domain'
import { getDb } from '@/db'
import { courses, profiles, zoomLinks } from '@/db/schema'

/* v8 ignore start */
export async function findViewerRole(userId: string) {
  const db = await getDb()
  return db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
    columns: { role: true },
  })
}

export async function findZoomLinksWithCourses() {
  const db = await getDb()
  return db
    .select({
      id: zoomLinks.id,
      title: zoomLinks.title,
      description: zoomLinks.description,
      section: zoomLinks.section,
      courseId: zoomLinks.courseId,
      courseTitle: courses.title,
      zoomUrl: zoomLinks.zoomUrl,
      meetingId: zoomLinks.meetingId,
      passcode: zoomLinks.passcode,
      orderIndex: zoomLinks.orderIndex,
      createdAt: zoomLinks.createdAt,
      updatedAt: zoomLinks.updatedAt,
    })
    .from(zoomLinks)
    .leftJoin(courses, eq(zoomLinks.courseId, courses.id))
    .orderBy(
      asc(zoomLinks.section),
      asc(zoomLinks.orderIndex),
      asc(zoomLinks.title),
    )
}

export async function findCoursesForZoomLinks() {
  const db = await getDb()
  return db.query.courses.findMany({
    columns: { id: true, title: true },
    orderBy: (course, order) => [
      order.asc(course.orderIndex),
      order.asc(course.title),
    ],
  })
}

export async function insertZoomLink(
  values: ReturnType<typeof buildCreateZoomLinkValues>,
) {
  const db = await getDb()
  const [link] = await db.insert(zoomLinks).values(values).returning()
  return { link }
}

export async function updateZoomLinkById(
  zoomLinkId: string,
  values: ReturnType<typeof buildUpdateZoomLinkValues>,
) {
  const db = await getDb()
  const [link] = await db
    .update(zoomLinks)
    .set(values)
    .where(eq(zoomLinks.id, zoomLinkId))
    .returning()
  return { link }
}

export async function deleteZoomLinkById(zoomLinkId: string) {
  const db = await getDb()
  await db.delete(zoomLinks).where(eq(zoomLinks.id, zoomLinkId))
}
/* v8 ignore end */

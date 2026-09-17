import { asc, eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { profiles, zoomLinks } from '@/db/schema'

/* v8 ignore start */
export async function findZoomLinksWithTeachers() {
  const db = await getDb()
  return db
    .select({
      id: zoomLinks.id,
      title: zoomLinks.title,
      description: zoomLinks.description,
      section: zoomLinks.section,
      teacherId: zoomLinks.teacherId,
      teacherName: profiles.fullName,
      zoomUrl: zoomLinks.zoomUrl,
      meetingId: zoomLinks.meetingId,
      passcode: zoomLinks.passcode,
      orderIndex: zoomLinks.orderIndex,
      createdAt: zoomLinks.createdAt,
      updatedAt: zoomLinks.updatedAt,
    })
    .from(zoomLinks)
    .leftJoin(profiles, eq(zoomLinks.teacherId, profiles.id))
    .orderBy(
      asc(zoomLinks.section),
      asc(zoomLinks.orderIndex),
      asc(zoomLinks.title),
    )
}

/* v8 ignore end */

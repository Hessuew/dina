import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { courses, profiles, zoomLinks } from '@/db/schema'
import {
  createZoomLinkSchema,
  deleteZoomLinkSchema,
  updateZoomLinkSchema,
} from '@/schemas/zoomLink.schema'
import { getCurrentUser } from '@/utils/auth/auth'
import { authz, withRequestCache } from '@/utils/authz'

export type ZoomLinkSection = 'general_class_lecture' | 'discipleship_group'

export type ZoomLinkRow = {
  id: string
  title: string
  description: string | null
  section: ZoomLinkSection
  courseId: string | null
  courseTitle: string | null
  zoomUrl: string
  meetingId: string
  passcode: string
  orderIndex: number
  createdAt: Date
  updatedAt: Date
}

export type ZoomLinksPayload = {
  links: Array<ZoomLinkRow>
  courses: Array<{ id: string; title: string }>
  role: 'student' | 'teacher' | 'admin'
}

async function getViewerProfile(userId: string) {
  const db = await getDb()
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
    columns: { role: true },
  })

  if (!profile) {
    throw new Error('Profile not found')
  }

  return profile
}

export const getZoomLinks = createServerFn({ method: 'POST' }).handler(
  async (): Promise<ZoomLinksPayload> => {
    const user = await getCurrentUser()
    const profile = await getViewerProfile(user.id)
    const db = await getDb()

    const rows = await db
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
    const courseRows = await db.query.courses.findMany({
      columns: { id: true, title: true },
      orderBy: (course, order) => [
        order.asc(course.orderIndex),
        order.asc(course.title),
      ],
    })

    return {
      links: rows.map((row) => ({
        ...row,
        courseTitle: row.courseTitle ?? null,
      })),
      courses: courseRows,
      role: profile.role,
    }
  },
)

export const createZoomLink = createServerFn({ method: 'POST' })
  .inputValidator(createZoomLinkSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      await authz(user.id).hasRole('admin')
      const db = await getDb()

      const [link] = await db
        .insert(zoomLinks)
        .values({
          title: data.title,
          description: data.description || null,
          section: data.section,
          courseId: data.courseId || null,
          zoomUrl: data.zoomUrl,
          meetingId: data.meetingId,
          passcode: data.passcode,
          orderIndex: data.orderIndex ?? 0,
        })
        .returning()

      return { link }
    })
  })

export const updateZoomLink = createServerFn({ method: 'POST' })
  .inputValidator(updateZoomLinkSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      await authz(user.id).hasRole('admin')
      const db = await getDb()

      const [link] = await db
        .update(zoomLinks)
        .set({
          title: data.title,
          description: data.description || null,
          section: data.section,
          courseId: data.courseId || null,
          zoomUrl: data.zoomUrl,
          meetingId: data.meetingId,
          passcode: data.passcode,
          orderIndex: data.orderIndex ?? 0,
          updatedAt: new Date(),
        })
        .where(eq(zoomLinks.id, data.zoomLinkId))
        .returning()

      return { link }
    })
  })

export const deleteZoomLink = createServerFn({ method: 'POST' })
  .inputValidator(deleteZoomLinkSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      await authz(user.id).hasRole('admin')
      const db = await getDb()

      await db.delete(zoomLinks).where(eq(zoomLinks.id, data.zoomLinkId))

      return { error: false }
    })
  })

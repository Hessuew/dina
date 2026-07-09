import type {
  CreateZoomLinkInput,
  UpdateZoomLinkInput,
} from '@/schemas/zoomLink.schema'

export type ZoomLinkSection = CreateZoomLinkInput['section']

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

export function buildZoomLinksPayload(
  rows: Array<ZoomLinkRow>,
  courses: Array<{ id: string; title: string }>,
  role: ZoomLinksPayload['role'],
): ZoomLinksPayload {
  return {
    links: rows.map((row) => ({
      ...row,
      courseTitle: row.courseTitle ?? null,
    })),
    courses,
    role,
  }
}

export function buildCreateZoomLinkValues(data: CreateZoomLinkInput) {
  return {
    title: data.title,
    description: data.description || null,
    section: data.section,
    courseId: data.courseId || null,
    zoomUrl: data.zoomUrl,
    meetingId: data.meetingId,
    passcode: data.passcode,
    orderIndex: data.orderIndex ?? 0,
  }
}

export function buildUpdateZoomLinkValues(
  data: UpdateZoomLinkInput,
  now: Date,
) {
  return {
    title: data.title,
    description: data.description || null,
    section: data.section,
    courseId: data.courseId || null,
    zoomUrl: data.zoomUrl,
    meetingId: data.meetingId,
    passcode: data.passcode,
    orderIndex: data.orderIndex ?? 0,
    updatedAt: now,
  }
}

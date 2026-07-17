import type {
  CreateZoomLinkInput,
  UpdateZoomLinkInput,
  ZoomLinkSection,
} from '@/schemas/zoomLink.schema'
import type { profiles } from '@/db/schema'

export type { ZoomLinkSection } from '@/schemas/zoomLink.schema'
export type ZoomViewerRole = (typeof profiles.$inferSelect)['role']

export type ZoomLinkRow = {
  id: string
  title: string
  description: string | null
  section: ZoomLinkSection
  teacherId: string | null
  teacherName: string | null
  zoomUrl: string
  meetingId: string
  passcode: string
  orderIndex: number
  createdAt: Date
  updatedAt: Date
}

export type ZoomLinksPayload = {
  links: Array<ZoomLinkRow>
  teachers: Array<ZoomTeacherOption>
  role: ZoomViewerRole
}

export type ZoomTeacherOption = { id: string; fullName: string }
export type TeacherZoomGroup = {
  teacherId: string
  teacherName: string
  links: Array<ZoomLinkRow>
}

export function filterVisibleZoomLinks(
  rows: Array<ZoomLinkRow>,
  role: ZoomViewerRole,
  assignedTeacherId: string | null,
): Array<ZoomLinkRow> {
  if (role !== 'student') return rows
  return rows.filter(
    (row) =>
      row.section === 'general_class_lecture' ||
      row.teacherId === assignedTeacherId,
  )
}

export function groupTeacherZoomLinks(
  links: Array<ZoomLinkRow>,
): Array<TeacherZoomGroup> {
  const groups: Array<TeacherZoomGroup> = []
  for (const link of links) {
    if (link.section !== 'teacher' || !link.teacherId || !link.teacherName)
      continue
    const group = groups.find((item) => item.teacherId === link.teacherId)
    if (group) group.links.push(link)
    else
      groups.push({
        teacherId: link.teacherId,
        teacherName: link.teacherName,
        links: [link],
      })
  }
  return groups
}

function compareLinks(a: ZoomLinkRow, b: ZoomLinkRow): number {
  return a.orderIndex - b.orderIndex || a.title.localeCompare(b.title)
}

export function orderZoomLinks(
  rows: Array<ZoomLinkRow>,
  teacherOrder: Array<ZoomTeacherOption>,
): Array<ZoomLinkRow> {
  const ownerIndex = new Map(
    teacherOrder.map((teacher, index) => [teacher.id, index]),
  )
  return [...rows].sort((a, b) => {
    if (a.section !== b.section)
      return a.section === 'general_class_lecture' ? -1 : 1
    if (a.section === 'general_class_lecture') return compareLinks(a, b)
    const ownerDifference =
      (ownerIndex.get(a.teacherId as string) ?? Number.MAX_SAFE_INTEGER) -
      (ownerIndex.get(b.teacherId as string) ?? Number.MAX_SAFE_INTEGER)
    return ownerDifference || compareLinks(a, b)
  })
}

export function buildZoomLinksPayload(
  rows: Array<ZoomLinkRow>,
  teacherOrder: Array<ZoomTeacherOption>,
  role: ZoomViewerRole,
  assignedTeacherId: string | null,
): ZoomLinksPayload {
  return {
    links: orderZoomLinks(
      filterVisibleZoomLinks(rows, role, assignedTeacherId),
      teacherOrder,
    ),
    teachers: role === 'admin' ? teacherOrder : [],
    role,
  }
}

export function buildCreateZoomLinkValues(data: CreateZoomLinkInput) {
  return {
    title: data.title,
    description: data.description || null,
    section: data.section,
    teacherId: data.section === 'teacher' ? data.teacherId : null,
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
    teacherId: data.section === 'teacher' ? data.teacherId : null,
    zoomUrl: data.zoomUrl,
    meetingId: data.meetingId,
    passcode: data.passcode,
    orderIndex: data.orderIndex ?? 0,
    updatedAt: now,
  }
}

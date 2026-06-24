import type { ZoomLinkRow, ZoomLinkSection } from '@/utils/zoomLink'

export type ZoomFormData = {
  title: string
  description: string
  section: string
  courseId: string
  zoomUrl: string
  meetingId: string
  passcode: string
  orderIndex: number
}

export type ZoomLinkDialogState =
  | { mode: 'create' }
  | { mode: 'edit'; link: ZoomLinkRow }
  | null

export const emptyZoomForm: ZoomFormData = {
  title: '',
  description: '',
  section: 'general_class_lecture',
  courseId: 'none',
  zoomUrl: '',
  meetingId: '',
  passcode: '',
  orderIndex: 0,
}

export function resolveZoomLink(
  dialogState: ZoomLinkDialogState,
): ZoomLinkRow | null {
  return dialogState?.mode === 'edit' ? dialogState.link : null
}

export function getZoomLinkDialogConfig(isEdit: boolean): {
  subtitle: string
  title: string
} {
  return {
    subtitle: isEdit ? 'Edit meeting details' : 'New meeting details',
    title: isEdit ? 'Edit Zoom Link' : 'Add Zoom Link',
  }
}

export function getZoomLinkInitialValues(
  dialogState: ZoomLinkDialogState,
): ZoomFormData {
  if (dialogState?.mode === 'edit') {
    const link = dialogState.link
    return {
      title: link.title,
      description: link.description ?? '',
      section: link.section,
      courseId: link.courseId ?? 'none',
      zoomUrl: link.zoomUrl,
      meetingId: link.meetingId,
      passcode: link.passcode,
      orderIndex: link.orderIndex,
    }
  }
  return { ...emptyZoomForm }
}

export type ZoomLinkPayload = {
  title: string
  description: string | undefined
  section: ZoomLinkSection
  courseId: string | undefined
  zoomUrl: string
  meetingId: string
  passcode: string
  orderIndex: number | undefined
}

export function buildZoomLinkPayload(value: ZoomFormData): ZoomLinkPayload {
  return {
    title: value.title,
    description: value.description || undefined,
    section: value.section as ZoomLinkSection,
    courseId: value.courseId === 'none' ? undefined : value.courseId,
    zoomUrl: value.zoomUrl,
    meetingId: value.meetingId,
    passcode: value.passcode,
    orderIndex: Number.isFinite(value.orderIndex)
      ? value.orderIndex
      : undefined,
  }
}

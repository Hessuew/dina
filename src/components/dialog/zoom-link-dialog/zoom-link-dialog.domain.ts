import type { ZoomLinkRow, ZoomLinkSection } from '@/utils/zoomLink'
import type { CreateZoomLinkInput } from '@/schemas/zoomLink.schema'

export type ZoomFormData = {
  title: string
  description: string
  section: string
  teacherId: string
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
  teacherId: 'none',
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
      teacherId: link.teacherId ?? 'none',
      zoomUrl: link.zoomUrl,
      meetingId: link.meetingId,
      passcode: link.passcode,
      orderIndex: link.orderIndex,
    }
  }
  return { ...emptyZoomForm }
}

export type ZoomLinkPayload = CreateZoomLinkInput

export function buildZoomLinkPayload(value: ZoomFormData): ZoomLinkPayload {
  const common = {
    title: value.title,
    description: value.description || undefined,
    zoomUrl: value.zoomUrl,
    meetingId: value.meetingId,
    passcode: value.passcode,
    orderIndex: Number.isFinite(value.orderIndex)
      ? value.orderIndex
      : undefined,
  }
  if ((value.section as ZoomLinkSection) === 'teacher') {
    return { ...common, section: 'teacher', teacherId: value.teacherId }
  }
  return { ...common, section: 'general_class_lecture' }
}

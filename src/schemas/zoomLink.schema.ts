import { z } from 'zod'

const zoomLinkSectionEnum = z.enum([
  'general_class_lecture',
  'discipleship_group',
])
const optionalText = z.string().trim().optional()
const optionalUuid = z.uuid('Invalid course ID').optional()

const zoomLinkFields = {
  title: z.string().trim().min(1, 'Title is required'),
  description: optionalText,
  section: zoomLinkSectionEnum,
  courseId: optionalUuid,
  zoomUrl: z.url('Zoom link must be a valid URL'),
  meetingId: z.string().trim().min(1, 'Meeting ID is required'),
  passcode: z.string().trim().min(1, 'Passcode is required'),
  orderIndex: z.number().int().min(0).optional(),
}

export const createZoomLinkSchema = z.object(zoomLinkFields)

export const updateZoomLinkSchema = z.object({
  zoomLinkId: z.uuid('Invalid Zoom link ID'),
  ...zoomLinkFields,
})

export const deleteZoomLinkSchema = z.object({
  zoomLinkId: z.uuid('Invalid Zoom link ID'),
})

type ZoomLinkSection = z.infer<typeof zoomLinkSectionEnum>
export type CreateZoomLinkInput = z.infer<typeof createZoomLinkSchema>
export type UpdateZoomLinkInput = z.infer<typeof updateZoomLinkSchema>
export type DeleteZoomLinkInput = z.infer<typeof deleteZoomLinkSchema>

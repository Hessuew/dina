import { z } from 'zod'
import { zoomLinkSectionEnum as dbZoomLinkSectionEnum } from '@/db/schema'

const zoomLinkSectionSchema = z.enum(dbZoomLinkSectionEnum.enumValues)
const optionalText = z.string().trim().optional()
const teacherIdSchema = z.uuid('Invalid teacher ID')

const zoomLinkFields = {
  title: z.string().trim().min(1, 'Title is required'),
  description: optionalText,
  zoomUrl: z.url('Zoom link must be a valid URL'),
  meetingId: z.string().trim().min(1, 'Meeting ID is required'),
  passcode: z.string().trim().min(1, 'Passcode is required'),
  orderIndex: z.number().int().min(0).optional(),
}
export const zoomLinkFieldSchemas = zoomLinkFields

const generalZoomLinkSchema = z.object({
  ...zoomLinkFields,
  section: z.literal(zoomLinkSectionSchema.enum.general_class_lecture),
  teacherId: z.undefined().optional(),
})

const teacherZoomLinkSchema = z.object({
  ...zoomLinkFields,
  section: z.literal(zoomLinkSectionSchema.enum.teacher),
  teacherId: teacherIdSchema,
})

export const createZoomLinkSchema = z.discriminatedUnion('section', [
  generalZoomLinkSchema,
  teacherZoomLinkSchema,
])

const zoomLinkIdField = { zoomLinkId: z.uuid('Invalid Zoom link ID') }
export const updateZoomLinkSchema = z.discriminatedUnion('section', [
  generalZoomLinkSchema.extend(zoomLinkIdField),
  teacherZoomLinkSchema.extend(zoomLinkIdField),
])

export const deleteZoomLinkSchema = z.object({
  zoomLinkId: z.uuid('Invalid Zoom link ID'),
})

export type ZoomLinkSection = (typeof dbZoomLinkSectionEnum.enumValues)[number]
export type CreateZoomLinkInput = z.infer<typeof createZoomLinkSchema>
export type UpdateZoomLinkInput = z.infer<typeof updateZoomLinkSchema>
export type DeleteZoomLinkInput = z.infer<typeof deleteZoomLinkSchema>

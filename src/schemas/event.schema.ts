import { z } from 'zod'

const categoryEnum = z.enum(['exam', 'chapel', 'personal'])

export const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  location: z.string().optional(),
  zoomLink: z.string().optional(),
  category: categoryEnum.optional(),
  courseId: z.uuid('Invalid course ID').optional(),
})

export const updateEventSchema = z.object({
  eventId: z.uuid('Invalid event ID'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  location: z.string().optional(),
  zoomLink: z.string().optional(),
  category: categoryEnum.optional(),
  courseId: z.uuid('Invalid course ID').optional(),
})

export const deleteEventSchema = z.object({
  eventId: z.uuid('Invalid event ID'),
})

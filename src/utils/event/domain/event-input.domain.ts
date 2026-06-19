export type EventCategory = 'exam' | 'chapel' | 'personal'

/** Validated event form fields shared by create and update (optionals may be omitted or null). */
export type EventValuesInput = {
  title: string
  description?: string | null
  startTime: Date
  endTime: Date
  location?: string | null
  zoomLink?: string | null
  category?: EventCategory | null
  courseId?: string | null
}

/** Normalized DB column values: every optional collapsed to an explicit null. */
export type EventValues = {
  title: string
  description: string | null
  startTime: Date
  endTime: Date
  location: string | null
  zoomLink: string | null
  category: EventCategory | null
  courseId: string | null
}

/**
 * Map validated event input to its DB column values, normalizing every omitted
 * optional to null. Shared by the create and update handlers so neither holds
 * the `?? null` branching.
 */
export function buildEventValues(data: EventValuesInput): EventValues {
  return {
    title: data.title,
    description: data.description ?? null,
    startTime: data.startTime,
    endTime: data.endTime,
    location: data.location ?? null,
    zoomLink: data.zoomLink ?? null,
    category: data.category ?? null,
    courseId: data.courseId ?? null,
  }
}

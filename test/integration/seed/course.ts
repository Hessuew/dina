import { randomUUID } from 'node:crypto'
import { insertCourse } from '@/utils/repository'

export async function seedCourse(
  overrides: {
    id?: string
    title?: string
    thumbnailUrl?: string
    orderIndex?: number
    isPublished?: boolean
  } = {},
): Promise<string> {
  const id = overrides.id ?? randomUUID()
  await insertCourse({
    id,
    title: overrides.title ?? 'Test Course',
    isPublished: overrides.isPublished ?? true,
    ...(overrides.thumbnailUrl !== undefined
      ? { thumbnailUrl: overrides.thumbnailUrl }
      : {}),
    ...(overrides.orderIndex !== undefined
      ? { orderIndex: overrides.orderIndex }
      : {}),
  })
  return id
}

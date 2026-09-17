import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { zoomLinks } from '@/db/schema'

export type ZoomLinkInsert = typeof zoomLinks.$inferInsert

/* v8 ignore start */
export async function insertZoomLink(values: ZoomLinkInsert) {
  const db = await getDb()
  const [link] = await db.insert(zoomLinks).values(values).returning()
  return { link }
}

export async function updateZoomLinkById(
  zoomLinkId: string,
  values: Partial<ZoomLinkInsert>,
): Promise<{ link: typeof zoomLinks.$inferSelect | undefined }> {
  const db = await getDb()
  const [link] = await db
    .update(zoomLinks)
    .set(values)
    .where(eq(zoomLinks.id, zoomLinkId))
    .returning()
  return { link }
}

export async function deleteZoomLinkById(zoomLinkId: string) {
  const db = await getDb()
  await db.delete(zoomLinks).where(eq(zoomLinks.id, zoomLinkId))
}
/* v8 ignore end */

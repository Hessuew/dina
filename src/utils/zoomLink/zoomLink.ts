import { createServerFn } from '@tanstack/react-start'
import {
  createZoomLinkService,
  deleteZoomLinkService,
  getZoomLinksService,
  updateZoomLinkService,
} from './service/zoomLink.service'
import {
  createZoomLinkSchema,
  deleteZoomLinkSchema,
  updateZoomLinkSchema,
} from '@/schemas/zoomLink.schema'
import { getCurrentUser } from '@/utils/auth/auth'

export type { ZoomLinkRow, ZoomLinkSection } from './domain/zoomLink.domain'

export const getZoomLinks = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()
    return getZoomLinksService(user.id)
  },
)

export const createZoomLink = createServerFn({ method: 'POST' })
  .validator(createZoomLinkSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return createZoomLinkService(data, user.id)
  })

export const updateZoomLink = createServerFn({ method: 'POST' })
  .validator(updateZoomLinkSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return updateZoomLinkService(data, user.id)
  })

export const deleteZoomLink = createServerFn({ method: 'POST' })
  .validator(deleteZoomLinkSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return deleteZoomLinkService(data, user.id)
  })

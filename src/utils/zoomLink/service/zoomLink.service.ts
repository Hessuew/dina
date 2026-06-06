import type {
  CreateZoomLinkInput,
  DeleteZoomLinkInput,
  UpdateZoomLinkInput,
} from '@/schemas/zoomLink.schema'
import {
  buildCreateZoomLinkValues,
  buildUpdateZoomLinkValues,
  buildZoomLinksPayload,
} from '@/utils/zoomLink/domain/zoomLink.domain'
import {
  deleteZoomLinkById,
  findCoursesForZoomLinks,
  findViewerRole,
  findZoomLinksWithCourses,
  insertZoomLink,
  updateZoomLinkById,
} from '@/utils/zoomLink/repository'
import { authz, withRequestCache } from '@/utils/authz'
import { NotFoundError } from '@/utils/errors'

export async function getZoomLinksService(userId: string) {
  const profile = await findViewerRole(userId)
  if (!profile) {
    throw new NotFoundError('Profile not found', {
      details: { userId },
    })
  }

  const rows = await findZoomLinksWithCourses()
  const courseRows = await findCoursesForZoomLinks()

  return buildZoomLinksPayload(rows, courseRows, profile.role)
}

export async function createZoomLinkService(
  data: CreateZoomLinkInput,
  userId: string,
) {
  return withRequestCache(async () => {
    await authz(userId).hasRole('admin')
    return insertZoomLink(buildCreateZoomLinkValues(data))
  })
}

export async function updateZoomLinkService(
  data: UpdateZoomLinkInput,
  userId: string,
) {
  return withRequestCache(async () => {
    await authz(userId).hasRole('admin')
    return updateZoomLinkById(
      data.zoomLinkId,
      buildUpdateZoomLinkValues(data, new Date()),
    )
  })
}

export async function deleteZoomLinkService(
  data: DeleteZoomLinkInput,
  userId: string,
) {
  return withRequestCache(async () => {
    await authz(userId).hasRole('admin')
    await deleteZoomLinkById(data.zoomLinkId)
  })
}

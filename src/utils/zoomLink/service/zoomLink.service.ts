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
  findDiscipleshipTeacherId,
  findViewerRole,
  findZoomLinkOwner,
  findZoomLinksWithTeachers,
  insertZoomLink,
  updateZoomLinkById,
} from '@/utils/zoomLink/repository'
import { authz, withRequestCache } from '@/utils/authz'
import { NotFoundError, ValidationError } from '@/utils/errors'
import { getTeachersService } from '@/utils/teachers/service/teachers.service'

export async function getZoomLinksService(userId: string) {
  const profile = await findViewerRole(userId)
  if (!profile) {
    throw new NotFoundError('Profile not found', {
      details: { userId },
    })
  }

  const rows = await findZoomLinksWithTeachers()
  const assignment =
    profile.role === 'student' ? await findDiscipleshipTeacherId(userId) : null
  const teacherOrder =
    profile.role === 'student'
      ? []
      : (await getTeachersService()).teachers.map(({ id, fullName }) => ({
          id,
          fullName,
        }))

  return buildZoomLinksPayload(
    rows,
    teacherOrder,
    profile.role,
    assignment?.teacherId ?? null,
  )
}

async function validateTeacherOwner(
  data: CreateZoomLinkInput | UpdateZoomLinkInput,
) {
  if (data.section !== 'teacher') return
  const owner = await findZoomLinkOwner(data.teacherId)
  if (owner?.role === 'teacher' || owner?.role === 'admin') return
  throw new ValidationError('Zoom link owner must be a teacher or admin')
}

export async function createZoomLinkService(
  data: CreateZoomLinkInput,
  userId: string,
) {
  return withRequestCache(async () => {
    await authz(userId).hasRole('admin')
    await validateTeacherOwner(data)
    return insertZoomLink(buildCreateZoomLinkValues(data))
  })
}

export async function updateZoomLinkService(
  data: UpdateZoomLinkInput,
  userId: string,
) {
  return withRequestCache(async () => {
    await authz(userId).hasRole('admin')
    await validateTeacherOwner(data)
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

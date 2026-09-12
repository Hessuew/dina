import type {
  CreateZoomLinkInput,
  DeleteZoomLinkInput,
  UpdateZoomLinkInput,
} from '@/schemas/zoomLink.schema'
import type { LogLevel } from '@/utils/observability/logger'
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
import { authz } from '@/utils/authz'
import { NotFoundError, ValidationError } from '@/utils/errors'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'
import { getTeachersService } from '@/utils/teachers/service/teachers.service'

type ZoomLinkMutationAction =
  'createZoomLink' | 'updateZoomLink' | 'deleteZoomLink'

type ZoomLinkMutationContext = {
  action: ZoomLinkMutationAction
  actorId: string
  startedAt: number
  zoomLinkId?: string
}

type ZoomLinkReadContext = {
  actorId: string
  role: string
  startedAt: number
}

function logZoomLinkMutation(
  level: LogLevel,
  event: string,
  context: ZoomLinkMutationContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    zoomLinkId: context.zoomLinkId,
    ...fields,
  })
}

function logZoomLinkFailure(context: ZoomLinkMutationContext): void {
  logZoomLinkMutation('error', 'zoom_link_mutation_failed', context, {
    errorCategory: 'zoom_link_persistence',
  })
}

function logZoomLinkRead(
  level: LogLevel,
  event: string,
  context: ZoomLinkReadContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: 'serverFn:getZoomLinks',
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    role: context.role,
    ...fields,
  })
}

async function withZoomLinkReadTelemetry<T>(
  context: ZoomLinkReadContext,
  read: () => Promise<T>,
  fields: (result: T) => Record<string, unknown>,
): Promise<T> {
  try {
    const result = await read()
    logZoomLinkRead('info', 'zoom_links_loaded', context, fields(result))
    return result
  } catch (error) {
    logZoomLinkRead('error', 'zoom_links_load_failed', context, {
      errorCategory: 'zoom_links_read_persistence',
    })
    throw error
  }
}

export async function getZoomLinksService(userId: string) {
  const profile = await findViewerRole(userId)
  if (!profile) {
    throw new NotFoundError('Profile not found', {
      details: { userId },
    })
  }

  const context: ZoomLinkReadContext = {
    actorId: userId,
    role: profile.role,
    startedAt: performance.now(),
  }

  return withZoomLinkReadTelemetry(
    context,
    async () => {
      const rows = await findZoomLinksWithTeachers()
      const assignment =
        profile.role === 'student'
          ? await findDiscipleshipTeacherId(userId)
          : null
      const teacherOrder =
        profile.role === 'student'
          ? []
          : (await getTeachersService(userId)).teachers.map(
              ({ id, fullName }) => ({ id, fullName }),
            )

      return buildZoomLinksPayload(
        rows,
        teacherOrder,
        profile.role,
        assignment?.teacherId ?? null,
      )
    },
    (result) => ({
      linkCount: result.links.length,
      teacherOptionCount: result.teachers.length,
    }),
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
  await authz(userId).hasRole('admin')
  await validateTeacherOwner(data)
  const context: ZoomLinkMutationContext = {
    action: 'createZoomLink',
    actorId: userId,
    startedAt: performance.now(),
  }

  try {
    const result = await insertZoomLink(buildCreateZoomLinkValues(data))
    context.zoomLinkId = result.link.id
    logZoomLinkMutation('info', 'zoom_link_created', context, {
      section: data.section,
      teacherId: data.section === 'teacher' ? data.teacherId : null,
    })
    return result
  } catch (error) {
    logZoomLinkFailure(context)
    throw error
  }
}

export async function updateZoomLinkService(
  data: UpdateZoomLinkInput,
  userId: string,
) {
  await authz(userId).hasRole('admin')
  await validateTeacherOwner(data)
  const context: ZoomLinkMutationContext = {
    action: 'updateZoomLink',
    actorId: userId,
    zoomLinkId: data.zoomLinkId,
    startedAt: performance.now(),
  }

  try {
    const result = await updateZoomLinkById(
      data.zoomLinkId,
      buildUpdateZoomLinkValues(data, new Date()),
    )
    if (result.link) {
      logZoomLinkMutation('info', 'zoom_link_updated', context, {
        section: data.section,
        teacherId: data.section === 'teacher' ? data.teacherId : null,
      })
    }
    return result
  } catch (error) {
    logZoomLinkFailure(context)
    throw error
  }
}

export async function deleteZoomLinkService(
  data: DeleteZoomLinkInput,
  userId: string,
) {
  await authz(userId).hasRole('admin')
  const context: ZoomLinkMutationContext = {
    action: 'deleteZoomLink',
    actorId: userId,
    zoomLinkId: data.zoomLinkId,
    startedAt: performance.now(),
  }

  try {
    await deleteZoomLinkById(data.zoomLinkId)
    logZoomLinkMutation('info', 'zoom_link_deleted', context)
  } catch (error) {
    logZoomLinkFailure(context)
    throw error
  }
}

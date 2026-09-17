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
import { NotFoundError, ValidationError, isAppError } from '@/utils/errors'
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

function shouldLogZoomLinkFailure(error: unknown): boolean {
  return !isAppError(error) || error.status >= 500
}

async function requireZoomLinkAdmin(
  userId: string,
  context: ZoomLinkMutationContext,
): Promise<void> {
  try {
    await authz(userId).hasRole('admin')
  } catch (error) {
    if (shouldLogZoomLinkFailure(error)) {
      logZoomLinkMutation('error', 'zoom_link_mutation_failed', context, {
        errorCategory: 'zoom_link_authorization_persistence',
      })
    }
    throw error
  }
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
  const context: ZoomLinkReadContext = {
    actorId: userId,
    role: 'unknown',
    startedAt: performance.now(),
  }

  let profile: Awaited<ReturnType<typeof findViewerRole>>
  try {
    profile = await findViewerRole(userId)
  } catch (error) {
    logZoomLinkRead('error', 'zoom_links_load_failed', context, {
      errorCategory: 'zoom_links_read_persistence',
    })
    throw error
  }

  if (!profile) {
    throw new NotFoundError('Profile not found', {
      details: { userId },
    })
  }

  context.role = profile.role

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
  const context: ZoomLinkMutationContext = {
    action: 'createZoomLink',
    actorId: userId,
    startedAt: performance.now(),
  }
  await requireZoomLinkAdmin(userId, context)

  try {
    await validateTeacherOwner(data)
    const result = await insertZoomLink(buildCreateZoomLinkValues(data))
    context.zoomLinkId = result.link.id
    logZoomLinkMutation('info', 'zoom_link_created', context, {
      section: data.section,
      teacherId: data.section === 'teacher' ? data.teacherId : null,
    })
    return result
  } catch (error) {
    if (shouldLogZoomLinkFailure(error)) logZoomLinkFailure(context)
    throw error
  }
}

export async function updateZoomLinkService(
  data: UpdateZoomLinkInput,
  userId: string,
) {
  const context: ZoomLinkMutationContext = {
    action: 'updateZoomLink',
    actorId: userId,
    zoomLinkId: data.zoomLinkId,
    startedAt: performance.now(),
  }
  await requireZoomLinkAdmin(userId, context)

  try {
    await validateTeacherOwner(data)
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
    if (shouldLogZoomLinkFailure(error)) logZoomLinkFailure(context)
    throw error
  }
}

export async function deleteZoomLinkService(
  data: DeleteZoomLinkInput,
  userId: string,
) {
  const context: ZoomLinkMutationContext = {
    action: 'deleteZoomLink',
    actorId: userId,
    zoomLinkId: data.zoomLinkId,
    startedAt: performance.now(),
  }
  await requireZoomLinkAdmin(userId, context)

  try {
    await deleteZoomLinkById(data.zoomLinkId)
    logZoomLinkMutation('info', 'zoom_link_deleted', context)
  } catch (error) {
    logZoomLinkFailure(context)
    throw error
  }
}

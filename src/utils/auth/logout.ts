import type { LogLevel } from '@/utils/observability/logger'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'
import { getSupabaseServerClient } from '@/utils/supabase'

type LogoutLogContext = {
  startedAt: number
}

function logLogoutEvent(
  level: LogLevel,
  context: LogoutLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, 'logout_failed', {
    requestId: getRequestId(),
    path: 'serverFn:logout',
    status: 'failed',
    durationMs: elapsedMs(context.startedAt),
    ...fields,
  })
}

export async function logoutService() {
  const context: LogoutLogContext = { startedAt: performance.now() }

  try {
    const { error } = await getSupabaseServerClient().auth.signOut()

    if (error) {
      logLogoutEvent('error', context, {
        errorCategory: 'auth_sign_out',
        providerCode: error.code ?? 'unknown',
      })
      return { error: true, message: error.message }
    }

    logServerEvent('info', 'logout_succeeded', {
      requestId: getRequestId(),
      path: 'serverFn:logout',
      status: 'success',
      durationMs: elapsedMs(context.startedAt),
    })
  } catch (error) {
    logLogoutEvent('error', context, { errorCategory: 'auth_sign_out' })
    throw error
  }
}

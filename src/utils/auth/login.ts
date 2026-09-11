import type { z } from 'zod'
import type { loginSchema } from '@/schemas/auth.schema'
import type { LogLevel } from '@/utils/observability/logger'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'
import { getSupabaseServerClient } from '@/utils/supabase'

type LoginLogContext = {
  startedAt: number
}

function logLoginEvent(
  level: LogLevel,
  event: string,
  context: LoginLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: 'serverFn:login',
    status: event === 'login_failed' ? 'rejected' : 'success',
    durationMs: elapsedMs(context.startedAt),
    ...fields,
  })
}

export async function loginService(data: z.infer<typeof loginSchema>) {
  const context: LoginLogContext = { startedAt: performance.now() }
  const { data: authData, error } =
    await getSupabaseServerClient().auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

  if (error) {
    logLoginEvent('info', 'login_failed', context, {
      errorCategory: 'auth_sign_in',
      providerCode: error.code ?? 'unknown',
    })
    return { error: true, message: error.message }
  }

  logLoginEvent('info', 'login_succeeded', context, {
    userId: authData.user.id,
  })
}

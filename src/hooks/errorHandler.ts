import * as Sentry from '@sentry/tanstackstart-react'
import { toast } from 'sonner'
import { shouldSuppressFromSentry, toUserError } from '@/utils/errors'

export function reportMutationError(error: unknown): void {
  if (!shouldSuppressFromSentry(error)) {
    // Create a client-bundle frame so router allowUrls accepts serialized
    // server errors whose original stack contains only server-side paths.
    const captureError = new Error(
      error instanceof Error ? error.message : 'Mutation failed',
      { cause: error },
    )
    captureError.name = 'MutationError'
    Sentry.captureException(captureError)
  }
}

export function toastErrorHandler<TError>(error: TError): void {
  toast.error(toUserError(error).message)
}

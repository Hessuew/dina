export type MutationErrorHandlers<TError> = {
  onError?: (ctx: { error: TError }) => void | Promise<void>
  errorHandler?: (error: TError) => void
  fallback: (error: TError) => void
}

/**
 * Decide which handler receives a failed mutation's error: a caller-supplied
 * `onError` (awaited) takes precedence, then a synchronous `errorHandler`, then
 * the `fallback`.
 */
export async function dispatchMutationError<TError>(
  error: TError,
  { onError, errorHandler, fallback }: MutationErrorHandlers<TError>,
): Promise<void> {
  if (onError) {
    await onError({ error })
  } else if (errorHandler) {
    errorHandler(error)
  } else {
    fallback(error)
  }
}

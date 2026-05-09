import * as React from 'react'
import { toastErrorHandler } from './errorHandler'

export function useMutation<TVariables, TData, TError = Error>(opts: {
  fn: (variables: TVariables) => Promise<TData>
  onSuccess?: (ctx: { data: TData }) => void | Promise<void>
  onError?: (ctx: { error: TError }) => void | Promise<void>
  errorHandler?: (error: TError) => void
}) {
  const [submittedAt, setSubmittedAt] = React.useState<number | undefined>()
  const [variables, setVariables] = React.useState<TVariables | undefined>()
  const [error, setError] = React.useState<TError | undefined>()
  const [data, setData] = React.useState<TData | undefined>()
  const [status, setStatus] = React.useState<
    'idle' | 'pending' | 'success' | 'error'
  >('idle')

  const mutate = React.useCallback(
    async (vars: TVariables): Promise<TData | undefined> => {
      setStatus('pending')
      setSubmittedAt(Date.now())
      setVariables(vars)
      setError(undefined)

      try {
        const result = await opts.fn(vars)
        await opts.onSuccess?.({ data: result })
        setStatus('success')
        setData(result)
        return result
      } catch (err) {
        const tError = err as TError
        setStatus('error')
        setError(tError)

        if (opts.onError) {
          await opts.onError({ error: tError })
        } else if (opts.errorHandler) {
          opts.errorHandler(tError)
        } else {
          toastErrorHandler(tError)
        }
      }
    },
    [opts],
  )

  return {
    status,
    variables,
    submittedAt,
    mutate,
    error,
    data,
    isPending: status === 'pending',
  }
}

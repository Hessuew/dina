import * as React from 'react'
import { reportMutationError, toastErrorHandler } from '../errorHandler'
import { dispatchMutationError } from './domain/mutation-error.domain'

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

  // Keep a stable ref to opts so `mutate` never needs to be recreated when
  // callbacks change. Without this, every render produces a new `opts` object
  // → new `mutate` reference → all dependents (useCallback, useEffect) re-run.
  const optsRef = React.useRef(opts)
  optsRef.current = opts

  const mutate = React.useCallback(
    async (vars: TVariables): Promise<TData | undefined> => {
      setStatus('pending')
      setSubmittedAt(Date.now())
      setVariables(vars)
      setError(undefined)

      try {
        const result = await optsRef.current.fn(vars)
        await optsRef.current.onSuccess?.({ data: result })
        setStatus('success')
        setData(result)
        return result
      } catch (err) {
        const tError = err as TError
        setStatus('error')
        setError(tError)
        reportMutationError(tError)

        await dispatchMutationError(tError, {
          onError: optsRef.current.onError,
          errorHandler: optsRef.current.errorHandler,
          fallback: toastErrorHandler,
        })
      }
    },
    [],
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

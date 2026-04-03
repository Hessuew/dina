import * as React from 'react'
import { toast } from 'sonner'

export function useMutation<TVariables, TData, TError = Error>(opts: {
  fn: (variables: TVariables) => Promise<TData>
  onSuccess?: (ctx: { data: TData }) => void | Promise<void>
  onError?: (ctx: { error: TError }) => void | Promise<void>
}) {
  const [submittedAt, setSubmittedAt] = React.useState<number | undefined>()
  const [variables, setVariables] = React.useState<TVariables | undefined>()
  const [error, setError] = React.useState<TError | undefined>()
  const [data, setData] = React.useState<TData | undefined>()
  const [status, setStatus] = React.useState<
    'idle' | 'pending' | 'success' | 'error'
  >('idle')

  const mutate = React.useCallback(
    async (variables: TVariables): Promise<TData | undefined> => {
      setStatus('pending')
      setSubmittedAt(Date.now())
      setVariables(variables)
      setError(undefined)

      try {
        const data = await opts.fn(variables)
        await opts.onSuccess?.({ data })
        setStatus('success')
        setData(data)
        return data
      } catch (err) {
        const error = err as TError
        setStatus('error')
        setError(error)

        if (opts.onError) {
          await opts.onError({ error })
        } else {
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred'
          toast.error(errorMessage)
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
  }
}

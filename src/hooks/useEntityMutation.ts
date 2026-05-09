import * as React from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useMutation } from './useMutation'

type MutationMode = 'create' | 'update' | 'delete'

interface UseEntityMutationOptions<
  TCreateData = unknown,
  TCreateVars = unknown,
  TUpdateData = unknown,
  TUpdateVars = unknown,
  TDeleteData = unknown,
  TDeleteVars = unknown,
> {
  createFn?: (vars: TCreateVars) => Promise<TCreateData>
  updateFn?: (vars: TUpdateVars) => Promise<TUpdateData>
  deleteFn?: (vars: TDeleteVars) => Promise<TDeleteData>
  onSuccessMessage?: (mode: MutationMode) => string
  onSuccess?: (ctx: {
    mode: MutationMode
    data: TCreateData | TUpdateData | TDeleteData
  }) => void | Promise<void>
  invalidateRouter?: boolean
}

interface MutationReturn<TVars> {
  mutate: (vars: TVars) => void
  isPending: boolean
}

interface UseEntityMutationReturn<
  TCreateVars = unknown,
  TUpdateVars = unknown,
  TDeleteVars = unknown,
> {
  createMutation: MutationReturn<TCreateVars>
  updateMutation: MutationReturn<TUpdateVars>
  deleteMutation: MutationReturn<TDeleteVars>
  isAnyPending: boolean
}

const DEFAULT_MESSAGES: Record<MutationMode, string> = {
  create: 'Created successfully',
  update: 'Updated successfully',
  delete: 'Deleted successfully',
}

function createNoOpMutation<TVars = unknown>(): MutationReturn<TVars> {
  return {
    mutate: () => {
      throw new Error('This mutation function was not provided')
    },
    isPending: false,
  }
}

export function useEntityMutation<
  TCreateData = unknown,
  TCreateVars = unknown,
  TUpdateData = unknown,
  TUpdateVars = unknown,
  TDeleteData = unknown,
  TDeleteVars = unknown,
>(
  opts: UseEntityMutationOptions<
    TCreateData,
    TCreateVars,
    TUpdateData,
    TUpdateVars,
    TDeleteData,
    TDeleteVars
  >,
): UseEntityMutationReturn<TCreateVars, TUpdateVars, TDeleteVars> {
  const router = useRouter()
  const invalidateRouter = opts.invalidateRouter ?? true

  const getMessage = React.useCallback(
    (mode: MutationMode): string => {
      return opts.onSuccessMessage?.(mode) ?? DEFAULT_MESSAGES[mode]
    },
    [opts.onSuccessMessage],
  )

  const createMutation = useMutation({
    fn: opts.createFn!,
    onSuccess: async (ctx) => {
      toast.success(getMessage('create'))
      await opts.onSuccess?.({ mode: 'create', data: ctx.data })
      if (invalidateRouter) {
        await router.invalidate()
      }
    },
  })

  const updateMutation = useMutation({
    fn: opts.updateFn!,
    onSuccess: async (ctx) => {
      toast.success(getMessage('update'))
      await opts.onSuccess?.({ mode: 'update', data: ctx.data })
      if (invalidateRouter) {
        await router.invalidate()
      }
    },
  })

  const deleteMutation = useMutation({
    fn: opts.deleteFn!,
    onSuccess: async (ctx) => {
      toast.success(getMessage('delete'))
      await opts.onSuccess?.({ mode: 'delete', data: ctx.data })
      if (invalidateRouter) {
        await router.invalidate()
      }
    },
  })

  const isAnyPending =
    (opts.createFn ? createMutation.status === 'pending' : false) ||
    (opts.updateFn ? updateMutation.status === 'pending' : false) ||
    (opts.deleteFn ? deleteMutation.status === 'pending' : false)

  return {
    createMutation: opts.createFn
      ? {
          mutate: createMutation.mutate,
          isPending: createMutation.status === 'pending',
        }
      : createNoOpMutation<TCreateVars>(),
    updateMutation: opts.updateFn
      ? {
          mutate: updateMutation.mutate,
          isPending: updateMutation.status === 'pending',
        }
      : createNoOpMutation<TUpdateVars>(),
    deleteMutation: opts.deleteFn
      ? {
          mutate: deleteMutation.mutate,
          isPending: deleteMutation.status === 'pending',
        }
      : createNoOpMutation<TDeleteVars>(),
    isAnyPending,
  }
}

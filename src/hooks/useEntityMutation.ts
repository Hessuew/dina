import * as React from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  buildMutationReturn,
  deriveIsAnyPending,
  resolveSuccessMessage,
} from '../utils/mutation/domain/entity-mutation.domain'
import { useMutation } from './useMutation'
import type {
  MutationMode,
  MutationReturn,
} from '../utils/mutation/domain/entity-mutation.domain'

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

  const handleSuccess = React.useCallback(
    async (
      mode: MutationMode,
      data: TCreateData | TUpdateData | TDeleteData,
    ): Promise<void> => {
      toast.success(resolveSuccessMessage(mode, opts.onSuccessMessage))
      await opts.onSuccess?.({ mode, data })
      if (invalidateRouter) {
        await router.invalidate()
      }
    },
    [opts, invalidateRouter, router],
  )

  const createMutation = useMutation({
    fn: opts.createFn!,
    onSuccess: (ctx) => handleSuccess('create', ctx.data),
  })

  const updateMutation = useMutation({
    fn: opts.updateFn!,
    onSuccess: (ctx) => handleSuccess('update', ctx.data),
  })

  const deleteMutation = useMutation({
    fn: opts.deleteFn!,
    onSuccess: (ctx) => handleSuccess('delete', ctx.data),
  })

  const isAnyPending = deriveIsAnyPending({
    hasCreate: !!opts.createFn,
    hasUpdate: !!opts.updateFn,
    hasDelete: !!opts.deleteFn,
    createStatus: createMutation.status,
    updateStatus: updateMutation.status,
    deleteStatus: deleteMutation.status,
  })

  return {
    createMutation: buildMutationReturn<TCreateVars>(
      !!opts.createFn,
      createMutation.mutate,
      createMutation.status,
    ),
    updateMutation: buildMutationReturn<TUpdateVars>(
      !!opts.updateFn,
      updateMutation.mutate,
      updateMutation.status,
    ),
    deleteMutation: buildMutationReturn<TDeleteVars>(
      !!opts.deleteFn,
      deleteMutation.mutate,
      deleteMutation.status,
    ),
    isAnyPending,
  }
}

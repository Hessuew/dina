export type MutationMode = 'create' | 'update' | 'delete'

export type MutationStatus = 'idle' | 'pending' | 'success' | 'error'

export interface MutationReturn<TVars> {
  mutate: (vars: TVars) => void
  isPending: boolean
}

export const DEFAULT_MESSAGES: Record<MutationMode, string> = {
  create: 'Created successfully',
  update: 'Updated successfully',
  delete: 'Deleted successfully',
}

/**
 * Resolve the success toast message for a mutation mode, falling back to the
 * default when the caller did not supply an `onSuccessMessage` resolver.
 */
export function resolveSuccessMessage(
  mode: MutationMode,
  onSuccessMessage?: (mode: MutationMode) => string,
): string {
  return onSuccessMessage?.(mode) ?? DEFAULT_MESSAGES[mode]
}

/**
 * A placeholder mutation used when the corresponding `*Fn` was not provided.
 * Calling `mutate` is a programmer error, so it throws.
 */
export function createNoOpMutation<TVars = unknown>(): MutationReturn<TVars> {
  return {
    mutate: () => {
      throw new Error('This mutation function was not provided')
    },
    isPending: false,
  }
}

/**
 * Build the public mutation handle: the live `{ mutate, isPending }` when the
 * mutation was configured, otherwise a throwing no-op.
 */
export function buildMutationReturn<TVars>(
  provided: boolean,
  mutate: (vars: TVars) => void,
  status: MutationStatus,
): MutationReturn<TVars> {
  if (!provided) {
    return createNoOpMutation<TVars>()
  }
  return {
    mutate,
    isPending: status === 'pending',
  }
}

export interface PendingInput {
  hasCreate: boolean
  hasUpdate: boolean
  hasDelete: boolean
  createStatus: MutationStatus
  updateStatus: MutationStatus
  deleteStatus: MutationStatus
}

/**
 * True when any *provided* mutation is currently pending. A mutation that was
 * not configured never contributes, regardless of its (idle) status.
 */
export function deriveIsAnyPending(input: PendingInput): boolean {
  return (
    (input.hasCreate && input.createStatus === 'pending') ||
    (input.hasUpdate && input.updateStatus === 'pending') ||
    (input.hasDelete && input.deleteStatus === 'pending')
  )
}

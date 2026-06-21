import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_MESSAGES,
  buildMutationReturn,
  createNoOpMutation,
  deriveIsAnyPending,
  resolveSuccessMessage,
} from './entity-mutation.domain'

describe('resolveSuccessMessage', () => {
  it('uses the default message when no resolver is provided', () => {
    expect(resolveSuccessMessage('create')).toBe(DEFAULT_MESSAGES.create)
    expect(resolveSuccessMessage('update')).toBe(DEFAULT_MESSAGES.update)
    expect(resolveSuccessMessage('delete')).toBe(DEFAULT_MESSAGES.delete)
  })

  it('uses the resolver result when it returns a string', () => {
    expect(resolveSuccessMessage('create', (mode) => `did ${mode}`)).toBe(
      'did create',
    )
  })

  it('falls back to the default when the resolver returns a nullish value', () => {
    expect(
      resolveSuccessMessage('update', () => undefined as unknown as string),
    ).toBe(DEFAULT_MESSAGES.update)
  })
})

describe('createNoOpMutation', () => {
  it('is not pending and throws when mutate is called', () => {
    const noop = createNoOpMutation()
    expect(noop.isPending).toBe(false)
    expect(() => noop.mutate(undefined)).toThrow(
      'This mutation function was not provided',
    )
  })
})

describe('buildMutationReturn', () => {
  it('returns a no-op handle when the mutation was not provided', () => {
    const mutate = vi.fn()
    const result = buildMutationReturn(false, mutate, 'pending')
    expect(result.isPending).toBe(false)
    expect(() => result.mutate(undefined)).toThrow()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('returns the live handle marked pending when status is pending', () => {
    const mutate = vi.fn()
    const result = buildMutationReturn(true, mutate, 'pending')
    expect(result.mutate).toBe(mutate)
    expect(result.isPending).toBe(true)
  })

  it('returns the live handle not pending for non-pending status', () => {
    const mutate = vi.fn()
    expect(buildMutationReturn(true, mutate, 'idle').isPending).toBe(false)
    expect(buildMutationReturn(true, mutate, 'success').isPending).toBe(false)
  })
})

describe('deriveIsAnyPending', () => {
  const idle = {
    hasCreate: false,
    hasUpdate: false,
    hasDelete: false,
    createStatus: 'idle' as const,
    updateStatus: 'idle' as const,
    deleteStatus: 'idle' as const,
  }

  it('is false when nothing is provided', () => {
    expect(deriveIsAnyPending(idle)).toBe(false)
  })

  it('ignores a pending status when its mutation was not provided', () => {
    expect(
      deriveIsAnyPending({
        ...idle,
        hasCreate: false,
        createStatus: 'pending',
      }),
    ).toBe(false)
  })

  it('is true when the provided create mutation is pending', () => {
    expect(
      deriveIsAnyPending({ ...idle, hasCreate: true, createStatus: 'pending' }),
    ).toBe(true)
  })

  it('is true when the provided update mutation is pending', () => {
    expect(
      deriveIsAnyPending({ ...idle, hasUpdate: true, updateStatus: 'pending' }),
    ).toBe(true)
  })

  it('is true when the provided delete mutation is pending', () => {
    expect(
      deriveIsAnyPending({ ...idle, hasDelete: true, deleteStatus: 'pending' }),
    ).toBe(true)
  })

  it('is false when a provided mutation is not pending', () => {
    expect(
      deriveIsAnyPending({ ...idle, hasCreate: true, createStatus: 'success' }),
    ).toBe(false)
  })
})

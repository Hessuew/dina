import { describe, expect, it, vi } from 'vitest'
import { dispatchMutationError } from './mutation-error.domain'

describe('dispatchMutationError', () => {
  it('calls onError with the error context when onError is provided', async () => {
    const onError = vi.fn()
    const errorHandler = vi.fn()
    const fallback = vi.fn()
    const error = new Error('boom')

    await dispatchMutationError(error, { onError, errorHandler, fallback })

    expect(onError).toHaveBeenCalledWith({ error })
    expect(errorHandler).not.toHaveBeenCalled()
    expect(fallback).not.toHaveBeenCalled()
  })

  it('awaits an async onError', async () => {
    const order: Array<string> = []
    const onError = vi.fn(async () => {
      await Promise.resolve()
      order.push('onError')
    })
    const error = new Error('boom')

    await dispatchMutationError(error, {
      onError,
      fallback: () => order.push('fallback'),
    })

    expect(order).toEqual(['onError'])
  })

  it('falls back to errorHandler when onError is absent', async () => {
    const errorHandler = vi.fn()
    const fallback = vi.fn()
    const error = new Error('boom')

    await dispatchMutationError(error, { errorHandler, fallback })

    expect(errorHandler).toHaveBeenCalledWith(error)
    expect(fallback).not.toHaveBeenCalled()
  })

  it('calls the fallback when neither onError nor errorHandler is provided', async () => {
    const fallback = vi.fn()
    const error = new Error('boom')

    await dispatchMutationError(error, { fallback })

    expect(fallback).toHaveBeenCalledWith(error)
  })
})

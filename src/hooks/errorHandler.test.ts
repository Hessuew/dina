import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reportMutationError, toastErrorHandler } from './errorHandler'
import { UNEXPECTED_ERROR_MESSAGE, ValidationError } from '@/utils/errors'

const { captureException, toastError } = vi.hoisted(() => ({
  captureException: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@sentry/tanstackstart-react', () => ({ captureException }))
vi.mock('sonner', () => ({ toast: { error: toastError } }))

describe('mutation error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('captures unexpected mutation errors', () => {
    const error = new Error('Failed query: insert into submissions')

    reportMutationError(error)

    const captured = captureException.mock.calls[0]?.[0]
    expect(captured).toMatchObject({
      name: 'MutationError',
      message: error.message,
      cause: error,
    })
  })

  it('does not capture expected mutation errors', () => {
    reportMutationError(new ValidationError('Invalid submission'))

    expect(captureException).not.toHaveBeenCalled()
  })

  it('shows generic text instead of raw unexpected error details', () => {
    toastErrorHandler(new Error('Failed query: insert into submissions'))

    expect(toastError).toHaveBeenCalledWith(UNEXPECTED_ERROR_MESSAGE)
  })
})

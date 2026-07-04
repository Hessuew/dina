import { describe, expect, it } from 'vitest'
import {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
  isAppError,
  shouldSuppressFromSentry,
  toUserError,
} from './errors'

describe('error classes', () => {
  it('ValidationError has code VALIDATION_FAILED, status 400, correct name', () => {
    const err = new ValidationError('bad input')
    expect(err.code).toBe('VALIDATION_FAILED')
    expect(err.status).toBe(400)
    expect(err.name).toBe('ValidationError')
    expect(err.userMessage).toBe('bad input')
  })

  it('NotFoundError has code NOT_FOUND, status 404', () => {
    const err = new NotFoundError('not found')
    expect(err.code).toBe('NOT_FOUND')
    expect(err.status).toBe(404)
    expect(err.name).toBe('NotFoundError')
  })

  it('AuthenticationError uses default message and has status 401', () => {
    const err = new AuthenticationError()
    expect(err.status).toBe(401)
    expect(err.code).toBe('AUTHENTICATION_REQUIRED')
    expect(err.name).toBe('AuthenticationError')
  })

  it('AuthorizationError has code AUTHORIZATION_FAILED, status 403', () => {
    const err = new AuthorizationError()
    expect(err.code).toBe('AUTHORIZATION_FAILED')
    expect(err.status).toBe(403)
  })

  it('ConflictError has code CONFLICT, status 409', () => {
    const err = new ConflictError('already exists')
    expect(err.code).toBe('CONFLICT')
    expect(err.status).toBe(409)
  })

  it('accepts a custom code via options', () => {
    const err = new NotFoundError('missing', { code: 'COURSE_NOT_FOUND' })
    expect(err.code).toBe('COURSE_NOT_FOUND')
  })
})

describe('isAppError', () => {
  it('returns true for AppError subclass instances', () => {
    expect(isAppError(new ValidationError('x'))).toBe(true)
    expect(isAppError(new NotFoundError('x'))).toBe(true)
  })

  it('returns false for plain Error instances', () => {
    expect(isAppError(new Error('x'))).toBe(false)
  })

  it('returns false for non-error values', () => {
    expect(isAppError(null)).toBe(false)
    expect(isAppError('string')).toBe(false)
  })
})

describe('toUserError', () => {
  it('maps AppError to UserError shape', () => {
    const err = new NotFoundError('item missing')
    expect(toUserError(err)).toEqual({
      code: 'NOT_FOUND',
      message: 'item missing',
      status: 404,
    })
  })

  it('handles serialized AppError shape (has userMessage field)', () => {
    const serialized = {
      code: 'NOT_FOUND',
      userMessage: 'item missing',
      status: 404,
    }
    expect(toUserError(serialized)).toEqual({
      code: 'NOT_FOUND',
      message: 'item missing',
      status: 404,
    })
  })

  it('handles serialized Error shape (has message field, no userMessage)', () => {
    const serialized = {
      code: 'NOT_FOUND',
      message: 'item missing',
      status: 404,
    }
    expect(toUserError(serialized)).toEqual({
      code: 'NOT_FOUND',
      message: 'item missing',
      status: 404,
    })
  })

  it('returns UNEXPECTED_ERROR for plain Error instances', () => {
    const result = toUserError(new Error('boom'))
    expect(result.code).toBe('UNEXPECTED_ERROR')
    expect(result.message).toBe('boom')
    expect(result.status).toBe(500)
  })

  it('returns UNEXPECTED_ERROR fallback for unknown inputs', () => {
    const result = toUserError(undefined)
    expect(result.code).toBe('UNEXPECTED_ERROR')
    expect(result.status).toBe(500)
  })
})

describe('shouldSuppressFromSentry', () => {
  it('suppresses 4xx AppErrors', () => {
    expect(shouldSuppressFromSentry(new ValidationError('bad'))).toBe(true)
    expect(shouldSuppressFromSentry(new NotFoundError('missing'))).toBe(true)
    expect(shouldSuppressFromSentry(new AuthenticationError())).toBe(true)
    expect(shouldSuppressFromSentry(new AuthorizationError())).toBe(true)
  })

  it('does not suppress 5xx AppErrors', () => {
    const err = new ConflictError('conflict')
    // Manually patch status to 500 to exercise the < 500 guard
    Object.defineProperty(err, 'status', { value: 500 })
    expect(shouldSuppressFromSentry(err)).toBe(false)
  })

  it('suppresses TanStack Start input validation errors (Zod issue JSON array)', () => {
    const zodIssues = JSON.stringify(
      [
        {
          origin: 'string',
          code: 'invalid_format',
          format: 'email',
          path: ['email'],
          message: 'Invalid email address',
        },
      ],
      undefined,
      2,
    )
    expect(shouldSuppressFromSentry(new Error(zodIssues))).toBe(true)
  })

  it('does not suppress plain Errors with non-JSON messages', () => {
    expect(shouldSuppressFromSentry(new Error('Something went wrong'))).toBe(
      false,
    )
  })

  it('does not suppress plain Errors whose message is a JSON object (not array)', () => {
    expect(
      shouldSuppressFromSentry(
        new Error('{"code":"x","path":[],"message":"y"}'),
      ),
    ).toBe(false)
  })

  it('does not suppress plain Errors whose message is an empty JSON array', () => {
    expect(shouldSuppressFromSentry(new Error('[]'))).toBe(false)
  })

  it('does not suppress plain Errors whose message is a JSON array missing required keys', () => {
    expect(shouldSuppressFromSentry(new Error('[{"foo":"bar"}]'))).toBe(false)
  })

  it('suppresses thrown Response objects (TanStack Start redirects)', () => {
    expect(shouldSuppressFromSentry(new Response(null, { status: 302 }))).toBe(
      true,
    )
    expect(shouldSuppressFromSentry(new Response(null, { status: 404 }))).toBe(
      true,
    )
  })

  it('suppresses Firefox fetch-abort NetworkError', () => {
    expect(
      shouldSuppressFromSentry(
        new TypeError('NetworkError when attempting to fetch resource.'),
      ),
    ).toBe(true)
  })

  it('does not suppress TypeErrors with different messages', () => {
    expect(
      shouldSuppressFromSentry(new TypeError('Cannot read properties of null')),
    ).toBe(false)
  })

  it('does not suppress non-Error values', () => {
    expect(shouldSuppressFromSentry(null)).toBe(false)
    expect(shouldSuppressFromSentry('string error')).toBe(false)
    expect(shouldSuppressFromSentry(undefined)).toBe(false)
  })
})

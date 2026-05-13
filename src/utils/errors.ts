export type AppErrorCode =
  | 'AUTHENTICATION_REQUIRED'
  | 'AUTHORIZATION_FAILED'
  | 'ROLE_REQUIRED'
  | 'ACTION_NOT_ALLOWED'
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'STORAGE_UPLOAD_FAILED'
  | 'LESSON_NOT_FOUND'
  | 'ASSIGNMENT_NOT_FOUND'
  | 'COURSE_NOT_FOUND'
  | 'POST_NOT_FOUND'
  | 'COMMENT_NOT_FOUND'
  | 'ENROLLMENT_NOT_FOUND'
  | 'INVITATION_EXISTS'
  | 'INVITATION_EXPIRED'
  | 'TEACHER_PAIR_INVALID'
  | 'EMAIL_UPDATE_FAILED'
  | 'EMAIL_CHANGE_RATE_LIMITED'
  | 'EMAIL_SEND_FAILED'
  | 'PASSWORD_UPDATE_FAILED'

export type AppErrorDetails = Record<string, unknown>

export type UserError = {
  code: AppErrorCode | 'UNEXPECTED_ERROR'
  message: string
  status: number
}

type AppErrorOptions = {
  code: AppErrorCode
  status: number
  userMessage: string
  internalMessage?: string
  details?: AppErrorDetails
}

type DomainErrorOptions = {
  code?: AppErrorCode
  internalMessage?: string
  details?: AppErrorDetails
}

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly status: number
  readonly userMessage: string
  readonly internalMessage: string
  readonly details?: AppErrorDetails

  constructor(options: AppErrorOptions) {
    super(options.userMessage)
    this.name = 'AppError'
    this.code = options.code
    this.status = options.status
    this.userMessage = options.userMessage
    this.internalMessage = options.internalMessage ?? options.userMessage
    this.details = options.details
  }
}

export class AuthenticationError extends AppError {
  constructor(
    userMessage = 'Authentication required',
    options: DomainErrorOptions = {},
  ) {
    super({
      code: options.code ?? 'AUTHENTICATION_REQUIRED',
      status: 401,
      userMessage,
      internalMessage: options.internalMessage,
      details: options.details,
    })
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(
    userMessage = 'You are not authorized to perform this action',
    options: DomainErrorOptions = {},
  ) {
    super({
      code: options.code ?? 'AUTHORIZATION_FAILED',
      status: 403,
      userMessage,
      internalMessage: options.internalMessage,
      details: options.details,
    })
    this.name = 'AuthorizationError'
  }
}

export class ValidationError extends AppError {
  constructor(userMessage: string, options: DomainErrorOptions = {}) {
    super({
      code: options.code ?? 'VALIDATION_FAILED',
      status: 400,
      userMessage,
      internalMessage: options.internalMessage,
      details: options.details,
    })
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(userMessage: string, options: DomainErrorOptions = {}) {
    super({
      code: options.code ?? 'NOT_FOUND',
      status: 404,
      userMessage,
      internalMessage: options.internalMessage,
      details: options.details,
    })
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(userMessage: string, options: DomainErrorOptions = {}) {
    super({
      code: options.code ?? 'CONFLICT',
      status: 409,
      userMessage,
      internalMessage: options.internalMessage,
      details: options.details,
    })
    this.name = 'ConflictError'
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export function toUserError(error: unknown): UserError {
  if (isAppError(error)) {
    return {
      code: error.code,
      message: error.userMessage,
      status: error.status,
    }
  }

  if (hasSerializedAppErrorShape(error)) {
    return {
      code: error.code,
      message: error.userMessage,
      status: error.status,
    }
  }

  if (hasSerializedErrorShape(error)) {
    return {
      code: error.code,
      message: error.message,
      status: error.status,
    }
  }

  // Fallback for plain Error objects (e.g., after serialization)
  if (error instanceof Error) {
    return {
      code: 'UNEXPECTED_ERROR',
      message: error.message || 'An unexpected error occurred',
      status: 500,
    }
  }

  return {
    code: 'UNEXPECTED_ERROR',
    message: 'An unexpected error occurred',
    status: 500,
  }
}

export function logServerError(error: unknown, context: AppErrorDetails = {}) {
  const userError = toUserError(error)

  if (isAppError(error)) {
    console.error(error.internalMessage, {
      code: error.code,
      status: error.status,
      details: error.details,
      context,
    })
    return
  }

  console.error(userError.message, { error, context })
}

type SerializedAppError = {
  code: AppErrorCode
  userMessage: string
  status: number
}

type SerializedError = {
  code: AppErrorCode
  message: string
  status: number
}

function hasSerializedAppErrorShape(
  error: unknown,
): error is SerializedAppError {
  if (!error || typeof error !== 'object') return false

  const candidate = error as Record<string, unknown>

  return (
    typeof candidate.code === 'string' &&
    typeof candidate.userMessage === 'string' &&
    typeof candidate.status === 'number'
  )
}

function hasSerializedErrorShape(error: unknown): error is SerializedError {
  if (!error || typeof error !== 'object') return false

  const candidate = error as Record<string, unknown>

  return (
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.status === 'number'
  )
}

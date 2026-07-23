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
  | 'DISTRIBUTION_FAILED'
  | 'TEACHER_PAIR_INVALID'
  | 'EMAIL_UPDATE_FAILED'
  | 'EMAIL_CHANGE_RATE_LIMITED'
  | 'EMAIL_SEND_FAILED'
  | 'PASSWORD_UPDATE_FAILED'
  | 'STORAGE_OPERATION_FAILED'
  | 'TARGET_NOT_STUDENT'
  | 'SUBMISSION_SAVE_FAILED'
  | 'CAMPAIGN_LOCKED'

export const UNEXPECTED_ERROR_MESSAGE =
  'Something went wrong. Please try again.'

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
  cause?: unknown
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
    super(options.userMessage, { cause: options.cause })
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

export class CampaignLockedError extends AppError {
  constructor() {
    super({
      code: 'CAMPAIGN_LOCKED',
      status: 409,
      userMessage:
        'This campaign is currently in use. Please try again shortly.',
    })
    this.name = 'CampaignLockedError'
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Returns true for raw Error objects thrown by TanStack Start's execValidator
 * when Zod input validation fails. The message is a JSON-stringified Zod issue
 * array — a 4xx user-input error, not a real server bug.
 */
function isInputValidationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (!error.message.startsWith('[')) return false
  try {
    const parsed: unknown = JSON.parse(error.message)
    if (!Array.isArray(parsed) || parsed.length === 0) return false
    const first = parsed[0]
    return (
      typeof first === 'object' &&
      first !== null &&
      'code' in first &&
      'path' in first &&
      'message' in first
    )
  } catch {
    return false
  }
}

/**
 * Returns true for Response objects thrown by TanStack Start as control flow
 * (redirect, notFound). These are not bugs and must not reach Sentry.
 */
function isTanStackRedirectResponse(error: unknown): boolean {
  return typeof Response !== 'undefined' && error instanceof Response
}

/**
 * Browser-native TypeError messages for failed / aborted fetch (offline, tab
 * kill mid-nav, server blip). Not application bugs; not actionable in Sentry.
 * Chromium: "Failed to fetch"; Safari: "Load failed"; Firefox: NetworkError…
 */
const BENIGN_NETWORK_TYPEERROR_MESSAGES = new Set([
  'Failed to fetch',
  'Load failed',
  'NetworkError when attempting to fetch resource.',
])

function isBenignNetworkTypeError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    BENIGN_NETWORK_TYPEERROR_MESSAGES.has(error.message)
  )
}

/**
 * Dynamic import failures (stale chunk after deploy, local Vite module churn,
 * offline mid-load). Message is browser-prefixed; treat any match as noise.
 */
function isDynamicImportError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    error.message.includes('error loading dynamically imported module')
  )
}

/**
 * Returns true when a client (or bot) calls a TanStack Start server function
 * hash that is no longer in this build — typical after a deploy when a stale
 * tab, cached asset, or crawler still hits `/_serverFn/<old-id>`. Framework
 * currently throws a 500 (see TanStack/router#7363); not an app bug.
 */
function isStaleServerFnError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.startsWith('Server function info not found for ')
  )
}

/** Returns true for expected 4xx AppErrors, input validation errors, TanStack Start redirect responses, benign browser network TypeErrors, dynamic-import load noise, and stale server-fn ID misses that should not be sent to Sentry. */
export function shouldSuppressFromSentry(error: unknown): boolean {
  return (
    (isAppError(error) && error.status < 500) ||
    (hasSerializedAppErrorShape(error) && error.status < 500) ||
    (hasSerializedErrorShape(error) && error.status < 500) ||
    isInputValidationError(error) ||
    isTanStackRedirectResponse(error) ||
    isBenignNetworkTypeError(error) ||
    isDynamicImportError(error) ||
    isStaleServerFnError(error)
  )
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

  if (hasSerializedErrorShape(error) && error.status < 500) {
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
      message: UNEXPECTED_ERROR_MESSAGE,
      status: 500,
    }
  }

  return {
    code: 'UNEXPECTED_ERROR',
    message: UNEXPECTED_ERROR_MESSAGE,
    status: 500,
  }
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

import type posthog from 'posthog-js'

import type { UserContext } from '@/utils/auth/domain/user-context.domain'

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com'
const POSTHOG_CONFIG_DEFAULTS = '2026-05-30'

export type AnalyticsEventName =
  | 'enrollment_started'
  | 'enrollment_submitted'
  | 'student_activated'
  | 'course_started'
  | 'assignment_submitted'
  | 'teacher_review_completed'

export type AnalyticsEventProperties = Readonly<
  Record<string, string | number | boolean | null | undefined>
>

type PostHogClient = typeof posthog

let posthogClient: PostHogClient | null = null
let posthogLoad: Promise<PostHogClient | null> | null = null
const STUDENT_ACTIVATION_STORAGE_PREFIX = 'dina:analytics:student-activated:'

function studentActivationStorageKey(userId: string): string {
  return `${STUDENT_ACTIVATION_STORAGE_PREFIX}${userId}`
}

function hasTrackedStudentActivation(userId: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    return (
      window.localStorage.getItem(studentActivationStorageKey(userId)) === '1'
    )
  } catch {
    return false
  }
}

function rememberStudentActivation(userId: string): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(studentActivationStorageKey(userId), '1')
  } catch {
    // Analytics remains best-effort when browser storage is unavailable.
  }
}

/**
 * Starts PostHog only in a browser build with an explicitly configured key.
 * Autocapture and session recording stay disabled until their privacy impact
 * has been reviewed for private mentorship and lesson content.
 */
export function initializeAnalytics(): boolean {
  const key = import.meta.env.VITE_POSTHOG_KEY?.trim()

  if (typeof window === 'undefined' || !key) return false

  if (!posthogLoad) {
    posthogLoad = import('posthog-js')
      .then(({ default: client }) => {
        client.init(key, {
          api_host:
            import.meta.env.VITE_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST,
          autocapture: false,
          capture_pageview: true,
          defaults: POSTHOG_CONFIG_DEFAULTS,
          disable_session_recording: true,
        })
        posthogClient = client
        return client
      })
      .catch(() => {
        posthogLoad = null
        return null
      })
  }

  return true
}

function whenAnalyticsReady(operation: (client: PostHogClient) => void): void {
  if (posthogClient) {
    operation(posthogClient)
    return
  }

  if (!initializeAnalytics()) return
  void posthogLoad?.then((client) => {
    if (client) operation(client)
  })
}

/** Identifies an authenticated person with stable, non-sensitive properties. */
export function identifyAnalyticsUser(
  user: Pick<UserContext, 'id' | 'role'>,
): void {
  whenAnalyticsReady((client) => {
    client.identify(user.id, { role: user.role })
  })
}

/** Clears the previous person identity when the authenticated session ends. */
export function resetAnalyticsUser(): void {
  if (typeof window === 'undefined') return

  if (posthogClient) {
    posthogClient.reset()
    return
  }

  void posthogLoad?.then((client) => client?.reset())
}

/** Captures only the allow-listed LMS journey event names. */
export function trackAnalyticsEvent(
  event: AnalyticsEventName,
  properties?: AnalyticsEventProperties,
): boolean {
  if (!initializeAnalytics()) return false

  whenAnalyticsReady((client) => {
    client.capture(event, properties)
  })
  return true
}

/** Captures a successful assignment submission without including its content. */
export function trackAssignmentSubmitted(assignmentId: string): boolean {
  return trackAnalyticsEvent('assignment_submitted', { assignmentId })
}

/** Captures a public enrollment form start without including applicant data. */
export function trackEnrollmentStarted(): boolean {
  return trackAnalyticsEvent('enrollment_started', {
    source: 'public_enrollment_form',
  })
}

/** Captures the first lesson start without including lesson content. */
export function trackCourseStarted(courseId: string): boolean {
  return trackAnalyticsEvent('course_started', { courseId })
}

/** Captures the first student course start for this browser and user. */
export function trackStudentActivated(
  userId: string,
  courseId: string,
): boolean {
  if (hasTrackedStudentActivation(userId)) return false

  const tracked = trackAnalyticsEvent('student_activated', { courseId })
  if (tracked) rememberStudentActivation(userId)
  return tracked
}

/** Captures a completed teacher review without including grade or feedback. */
export function trackTeacherReviewCompleted(
  assignmentId: string,
  submissionId: string,
): boolean {
  return trackAnalyticsEvent('teacher_review_completed', {
    assignmentId,
    submissionId,
  })
}

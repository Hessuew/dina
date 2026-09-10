import posthog from 'posthog-js'

import type { UserContext } from '@/utils/auth/domain/user-context.domain'

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com'
const POSTHOG_CONFIG_DEFAULTS = '2026-05-30'

export type AnalyticsEventName =
  | 'enrollment_started'
  | 'enrollment_submitted'
  | 'student_activated'
  | 'course_started'
  | 'lesson_completed'
  | 'assignment_submitted'
  | 'teacher_review_completed'
  | 'course_completed'

export type AnalyticsEventProperties = Readonly<
  Record<string, string | number | boolean | null | undefined>
>

let isInitialized = false

/**
 * Starts PostHog only in a browser build with an explicitly configured key.
 * Autocapture and session recording stay disabled until their privacy impact
 * has been reviewed for private mentorship and lesson content.
 */
export function initializeAnalytics(): boolean {
  const key = import.meta.env.VITE_POSTHOG_KEY?.trim()

  if (typeof window === 'undefined' || !key) return false
  if (isInitialized) return true

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST,
    autocapture: false,
    capture_pageview: true,
    defaults: POSTHOG_CONFIG_DEFAULTS,
    disable_session_recording: true,
  })
  isInitialized = true
  return true
}

/** Identifies an authenticated person with stable, non-sensitive properties. */
export function identifyAnalyticsUser(
  user: Pick<UserContext, 'id' | 'role'>,
): void {
  if (!initializeAnalytics()) return

  posthog.identify(user.id, { role: user.role })
}

/** Clears the previous person identity when the authenticated session ends. */
export function resetAnalyticsUser(): void {
  if (!isInitialized || typeof window === 'undefined') return

  posthog.reset()
}

/** Captures only the allow-listed LMS journey event names. */
export function trackAnalyticsEvent(
  event: AnalyticsEventName,
  properties?: AnalyticsEventProperties,
): boolean {
  if (!initializeAnalytics()) return false

  posthog.capture(event, properties)
  return true
}

/** Captures a successful assignment submission without including its content. */
export function trackAssignmentSubmitted(assignmentId: string): boolean {
  return trackAnalyticsEvent('assignment_submitted', { assignmentId })
}

/** Captures the first lesson start without including lesson content. */
export function trackCourseStarted(courseId: string): boolean {
  return trackAnalyticsEvent('course_started', { courseId })
}

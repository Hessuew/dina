import { afterEach, describe, expect, it, vi } from 'vitest'

const posthog = vi.hoisted(() => ({
  capture: vi.fn(),
  identify: vi.fn(),
  init: vi.fn(),
  reset: vi.fn(),
}))

vi.mock('posthog-js', () => ({ default: posthog }))

describe('analytics boundary', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('stays inactive when no PostHog project key is configured', async () => {
    vi.stubGlobal('window', {})

    const { initializeAnalytics, trackAnalyticsEvent } =
      await import('./analytics')

    expect(initializeAnalytics()).toBe(false)
    expect(trackAnalyticsEvent('course_started')).toBe(false)
    expect(posthog.init).not.toHaveBeenCalled()
  })

  it('initializes once with privacy-safe defaults and captures allow-listed events', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'project-key')
    vi.stubEnv('VITE_POSTHOG_HOST', 'https://eu.i.posthog.com')
    vi.stubGlobal('window', {})

    const {
      identifyAnalyticsUser,
      initializeAnalytics,
      resetAnalyticsUser,
      trackCourseStarted,
      trackCourseCompleted,
      trackEnrollmentStarted,
      trackLessonCompleted,
      trackAnalyticsEvent,
      trackAssignmentSubmitted,
      trackTeacherReviewCompleted,
    } = await import('./analytics')

    expect(initializeAnalytics()).toBe(true)
    expect(initializeAnalytics()).toBe(true)
    identifyAnalyticsUser({ id: 'user-1', role: 'student' })
    expect(trackCourseStarted('course-1')).toBe(true)
    expect(trackCourseCompleted('course-1')).toBe(true)
    expect(trackLessonCompleted('lesson-1')).toBe(true)
    expect(trackAssignmentSubmitted('assignment-1')).toBe(true)
    expect(trackEnrollmentStarted()).toBe(true)
    expect(trackTeacherReviewCompleted('assignment-1', 'submission-1')).toBe(
      true,
    )
    expect(
      trackAnalyticsEvent('enrollment_submitted', {
        source: 'public_enrollment_form',
      }),
    ).toBe(true)
    resetAnalyticsUser()

    expect(posthog.init).toHaveBeenCalledOnce()
    expect(posthog.init).toHaveBeenCalledWith('project-key', {
      api_host: 'https://eu.i.posthog.com',
      autocapture: false,
      capture_pageview: true,
      defaults: '2026-05-30',
      disable_session_recording: true,
    })
    expect(posthog.identify).toHaveBeenCalledWith('user-1', {
      role: 'student',
    })
    expect(posthog.capture).toHaveBeenCalledWith('assignment_submitted', {
      assignmentId: 'assignment-1',
    })
    expect(posthog.capture).toHaveBeenCalledWith('enrollment_started', {
      source: 'public_enrollment_form',
    })
    expect(posthog.capture).toHaveBeenCalledWith('course_started', {
      courseId: 'course-1',
    })
    expect(posthog.capture).toHaveBeenCalledWith('course_completed', {
      courseId: 'course-1',
    })
    expect(posthog.capture).toHaveBeenCalledWith('lesson_completed', {
      lessonId: 'lesson-1',
    })
    expect(posthog.capture).toHaveBeenCalledWith('enrollment_submitted', {
      source: 'public_enrollment_form',
    })
    expect(posthog.capture).toHaveBeenCalledWith('teacher_review_completed', {
      assignmentId: 'assignment-1',
      submissionId: 'submission-1',
    })
    expect(posthog.reset).toHaveBeenCalledOnce()
  })
})

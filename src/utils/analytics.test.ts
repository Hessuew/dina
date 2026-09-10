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
      trackAnalyticsEvent,
    } = await import('./analytics')

    expect(initializeAnalytics()).toBe(true)
    expect(initializeAnalytics()).toBe(true)
    identifyAnalyticsUser({ id: 'user-1', role: 'student' })
    expect(
      trackAnalyticsEvent('assignment_submitted', {
        assignmentId: 'assignment-1',
        attempt: 1,
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
      attempt: 1,
    })
    expect(posthog.reset).toHaveBeenCalledOnce()
  })
})

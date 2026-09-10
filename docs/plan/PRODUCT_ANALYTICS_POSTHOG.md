# PostHog Product Analytics

**Status:** Foundation implemented; event instrumentation pending

## Purpose

PostHog is for product and business metrics, not infrastructure alerting.

## Initial Events

Track the first set of LMS journey events:

- Enrollment started and submitted.
- Student activation.
- Course started.
- Lesson completed.
- Assignment submitted.
- Teacher review completed.
- Course completed.

## Guardrails

- Do not send secrets, free-form submission text, or private mentorship content.
- Keep event names stable and documented.
- Identify users only with IDs and safe profile fields.
- Use PostHog dashboards for funnels, retention, engagement, and feature adoption.

## Repository foundation

The optional browser integration lives in `src/utils/analytics.ts` and is
initialized from `src/routes/__root.tsx` when `VITE_POSTHOG_KEY` is configured.
`VITE_POSTHOG_HOST` defaults to `https://us.i.posthog.com`. Autocapture and
session recording are disabled so private lesson and mentorship content is not
captured accidentally. Authenticated users are identified by stable user ID and
role; email, names, and free-form content are excluded.

The typed event boundary currently allow-lists the initial journey events. The
next product-analytics slice should wire one completed user journey at a time,
starting with enrollment submission, then assignment submission and course
progression, and verify the resulting events in the configured PostHog project.

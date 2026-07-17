# PostHog Product Analytics

**Status:** Planned after technical observability baseline

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

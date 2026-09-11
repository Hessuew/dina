# PostHog Product Analytics

**Status:** Foundation implemented; enrollment, assignment submission, course start, lesson completion, course completion, and teacher review instrumented

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
public enrollment form now emits `enrollment_submitted` only after the server
mutation succeeds. The event carries only the stable
`source=public_enrollment_form` discriminator; applicant identity, contact
details, demographic values, and application text are never sent. The student
assignment detail route now emits `assignment_submitted` only after a successful
submit mutation; draft saves do not emit it, and the event carries only the
stable assignment ID. A student opening the first unfinished published lesson
from a course detail page now emits `course_started` with only the stable course
ID. A successful teacher grading mutation now emits
`teacher_review_completed` with only stable assignment and submission IDs;
grade and feedback content remain outside analytics. A student can now mark a
published lesson complete from its detail page; the resulting
`lesson_completed` event carries only the stable lesson ID and fires only after
the persistence mutation succeeds. After a first successful completion of the
final published lesson, the same route emits `course_completed` with only the
stable course ID. Repeated lesson-completion requests do not emit duplicate
course-completion events because the server returns a transition-only flag.
Verification in the configured PostHog project remains pending.

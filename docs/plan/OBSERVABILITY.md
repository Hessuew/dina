# Observability Architecture Implementation Plan

**Status:** In progress
**Date:** 2026-07-04  
**Context:** Engineering roadmap implementation plan and Better Stack transition record

---

## Executive Summary

This document outlines the observability architecture for the Christ-Dina LMS project, designed to support current operations (1-2 engineers) while being future-proof for 10x scale. The architecture leverages best-of-breed SaaS tools with minimal custom engineering, ensuring quick time-to-value and clear evolution paths.

**Chosen Stack:**

- **Technical Observability:** Better Stack (errors, logs, traces, uptime, and alerts) + Cloudflare (Worker logs, traces, and metrics)
- **Business Metrics:** PostHog (product analytics, funnels, retention)
- **Alerting:** Slack (primary) + Email (secondary)
- **Internal Dashboard:** Lightweight navigation page linking to external dashboards

---

## Current State

### Already Implemented ✅

- **Better Stack-compatible error transport:** The existing Sentry SDK packages remain as the transition transport for Better Stack Errors. Browser and Worker telemetry include explicit environment/release identity and suppress expected errors.
- **Structured application telemetry:** Shared redacted JSON logging covers health/readiness plus high-value assignment, auth, enrollment, course-authoring, storage, exam, attendance, notification, profile, discipleship, and Admin workflows. See [`STRUCTURED_LOGGING.md`](./STRUCTURED_LOGGING.md).
  Calendar event create/update/delete mutations also emit redacted,
  request-correlated operational events; event content and meeting links are
  excluded from telemetry. Post and comment create/update/delete mutations now
  emit redacted request-correlated events; post/comment content is excluded.
  Post and comment reaction toggles also emit redacted request-correlated
  events with safe actor/target IDs, action, emoji, status, and duration.
  Post-notification read-state mutations emit redacted request-correlated
  success/failure events. Admin Zoom-link create/update/delete mutations also
  emit redacted request-correlated events with safe actor/link ownership
  metadata; meeting credentials and links are excluded. Media-library
  create/update/delete mutations emit redacted request-correlated events with
  safe actor/media metadata; titles, descriptions, URLs, and private storage
  paths are excluded.
  Exam create/save/publish mutations emit redacted request-correlated events
  with safe actor/exam metadata, exam state, question counters, and stable
  persistence-failure categories; titles, dates, prompts, option labels, and
  raw persistence details are excluded.

- **Cloudflare Workers:** Basic observability
  - Logs enabled (100% sampling)
  - Traces enabled (1% sampling)
  - Workers deployment via `wrangler deploy`
- **Admin observability hub:** `/admin/observability` is admin-only and links to configured Better Stack, Cloudflare, Supabase, and Notion operating surfaces.
- **PostHog foundation:** optional browser-only initialization is wired from the
  root route with stable user-ID/role identification. Enrollment, assignment
  submission, course start, and teacher review events are instrumented; lesson
  completion, course completion, and project verification remain pending.
  Autocapture and session recording remain disabled by default.

### Not Yet Implemented ❌

- Remaining PostHog journey event instrumentation and project verification
- Slack workspace
- Alert configuration (Better Stack/Cloudflare → Slack)
- Business metrics tracking
- Incident response workflow

---

## Architecture Decisions

### 1. Technical Observability: Better Stack + Cloudflare

**Rationale:**

- Better Stack is the operator-facing replacement selected for this roadmap
- The existing Sentry-compatible SDK and Cloudflare telemetry avoid a broad request-path rewrite
- Minimal additional effort required during provider cutover
- Complementary coverage:
  - Better Stack: Application-level errors, releases, logs, traces, uptime, and alerts
  - Cloudflare: Worker request logs, traces, infrastructure metrics, and deployment context

**Future Evolution:**

- Scale to Datadog if unified metrics platform needed
- Cloudflare Analytics Pro upgrade ($5/mo) for richer metrics
- Data export APIs available if compliance requires data ownership

### 2. Business Metrics: PostHog (Don't Build Custom)

**Rationale:**

- **Time to value:** 1 day vs 2-4 weeks for custom implementation
- **Feature set:** Funnels, retention, session replay, feature flags out of the box
- **Maintenance:** Zero engineering burden vs ongoing custom maintenance
- **Future-proofing:** Self-hosted option available, data export APIs
- **Cost:** Generous free tier, scales affordably
- **LMS-specific features:** Perfect for enrollment funnels, completion rates, user engagement

**Alternative Rejected:** Custom metrics dashboard

- Would require ongoing engineering effort
- Rebuilding features PostHog provides for free
- Harder to scale with team growth

### 3. Alerting: Slack + Email

**Rationale:**

- **Slack:** Industry standard for dev team communication
  - Real-time discussion during incidents
  - Context sharing via links
  - Integrations with all observability tools
- **Email:** Secondary channel for critical alerts
  - Ensures alerts aren't missed if Slack is down
  - On-call escalation path

**Alternatives Considered:**

- **PagerDuty/Opsgenie:** Rejected for now (overkill for 1-2 engineers, additional cost)
- Can add later when team grows to 3+ engineers

### 4. Internal Dashboard: Lightweight Navigation Page

**Rationale:**

- Single entry point for team
- Leverages best-of-breed external dashboards
- Minimal engineering effort (2-3 hours)
- Easy to evolve later (can embed widgets if needed)

**Structure:**

- Route: `/admin/observability` (authed only)
- Content:
  - Links to Better Stack dashboard
  - Links to Cloudflare dashboard
  - Links to Supabase database dashboard
  - Links to Notion operations hub
  - Link to incident tracker (Google Doc/Notion)
  - Provider links are supplied through public `VITE_*_DASHBOARD_URL` variables; no provider tokens are sent to the browser

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

#### 1.1 Set Up PostHog

**Prerequisites:**

- Create PostHog account (https://posthog.com)
- Get project API key and host

**Implementation:**

1. Install PostHog in TanStack Start app
   ```bash
   bun add posthog-js
   ```
2. Initialize PostHog in `src/routes/__root.tsx` (client-side only)
3. Configure in `src/env.ts`:
   - Add `VITE_POSTHOG_KEY` to client env vars
   - Add `VITE_POSTHOG_HOST` to client env vars

**Files to modify:**

- `package.json` (add dependency)
- `src/env.ts` (add env vars)
- `src/routes/__root.tsx` (initialize PostHog)

#### 1.2 Track Key Events

**Initial events to track:**

- `enrollment_created` - User enrolls in a course
- `course_started` - User starts first lesson in a course
- `assignment_submitted` - User submits an assignment
- `course_completed` - User completes all lessons in a course

**Implementation:**

- Create `src/utils/analytics.ts` with typed event functions
- Integrate calls at appropriate locations in the codebase
- Example:
  ```typescript
  // src/utils/analytics.ts
  export const trackEnrollmentCreated = (courseId: string, userId: string) => {
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('enrollment_created', { courseId, userId })
    }
  }
  ```

The public enrollment form and student assignment detail route now capture
privacy-safe success events after their server mutations resolve. Assignment
draft saves do not count as submissions, and neither event includes free-form
application or assignment content. A student opening the first unfinished
published lesson from a course detail page now emits `course_started` with only
the course ID. A successful teacher grading mutation emits
`teacher_review_completed` with only assignment and submission IDs; grade and
feedback content remain excluded. Lesson completion and later course
milestones remain pending.

#### 1.3 Set Up Slack Workspace

**Prerequisites:**

- Create Slack workspace (https://slack.com)
- Create `#incidents` channel
- Create incoming webhook URL

**Configuration:**

- Document webhook URL in project secrets (not in repo)
- Set up channel description with incident tracker link

---

### Phase 2: Alerting (Week 2)

#### 2.1 Configure Better Stack Alerts → Slack

**Implementation:**

1. In Better Stack Errors and Telemetry:
   - Create a new alert rule
   - Trigger: Error rate > 5% in 5 minutes
   - Delivery: Slack webhook (use workspace webhook)
2. Create additional alert rules:
   - New issue detected (first occurrence)
   - Performance regression (p95 latency > 1s)
3. Test alert flow by triggering a test error

#### 2.2 Configure Cloudflare Alerts → Slack

**Implementation:**

1. In Cloudflare dashboard:
   - Navigate to Workers > your worker > Monitoring
   - Create alert for Worker errors (execution failures)
   - Create alert for latency spikes (p95 > 1s)
   - Delivery: Slack webhook
2. Test alert flow

#### 2.3 Create Incident Tracker Template

**Implementation:**

1. Create Google Doc/Notion template with sections:
   - Incident start time
   - Severity (P1/P2/P3)
   - Owner
   - Description
   - Timeline of updates
   - Resolution
   - Post-incident action items
2. Save template link in Slack `#incidents` channel description

---

### Phase 3: Internal Dashboard (Week 3)

#### 3.1 Build `/admin/observability` Page — implemented

**Implementation:**

1. Route: `src/routes/_authed/admin/observability.tsx`
2. Access is restricted with the existing `checkAdminAccess` server function and the route is linked from the Admin sidebar.
3. Page content:
   - Header: "Observability"
   - Link cards:
     - Better Stack
     - Cloudflare
     - Supabase
     - Notion Operations
   - Unconfigured links remain visible as setup prompts.
4. Styling: Match existing design system (docs/DESIGN_SYSTEM.md)

**Files to create:**

- `src/routes/_authed/admin/observability.tsx`

**API integration (deferred):**

- The first version is intentionally link-only. Provider APIs would require server-side credentials and can be added after the external dashboards are operationalized.

#### 3.4 Document Runbook — implemented

**Implementation:**

1. `docs/observability-runbook.md` is the repository-owned response contract.
2. It includes:
   - How to respond to different alert types
   - Escalation paths
   - Incident workflow
   - Link to incident tracker template
3. `AGENTS.md` references the runbook. Named contacts, Slack destinations,
   provider URLs, and credentials remain external setup values.

---

## Prerequisites Checklist

Before implementation begins, ensure:

- [ ] PostHog account created
- [ ] PostHog project API key obtained
- [ ] Slack workspace created
- [ ] Slack `#incidents` channel created
- [ ] Slack incoming webhook URL obtained
- [ ] Incident tracker template created (Google Doc/Notion)
- [ ] All credentials added to environment (not committed to repo)

---

## Metrics to Track

### Technical Metrics (Better Stack + Cloudflare)

- Error rate (by route, by error type)
- p50/p95/p99 latency
- Worker execution time
- Cold start frequency
- Request volume

### Business Metrics (PostHog)

**Phase 1 (Week 1):**

- Enrollment funnel: Signup → Course enrollment → First lesson
- Course completion rate
- Active users (DAU/MAU)

**Phase 2 (Future):**

- Assignment submission rate
- Time to complete courses
- Feature usage (which features are used most)
- Session duration
- Retention rates

---

## Future Evolution Path

### When to Add Dedicated Tools

| Trigger                                | Action                                                              |
| -------------------------------------- | ------------------------------------------------------------------- |
| Team grows to 3+ engineers             | Add PagerDuty for on-call scheduling                                |
| Need formal incident management        | Add incident.io or build custom workflow                            |
| Compliance requirements (SOC2, GDPR)   | Evaluate self-hosted PostHog or data export                         |
| Custom business metrics become complex | Expand internal dashboard with embedded widgets                     |
| 10x traffic scale                      | Upgrade Cloudflare Analytics Pro, add Datadog                       |
| Need unified metrics platform          | Migrate to Datadog after Better Stack usage and cost are understood |

### Data Ownership Paths

If compliance requires data ownership:

- **PostHog:** Self-hosted option available, or use data export APIs
- **Better Stack:** Export and retention options should be evaluated if compliance requires data ownership
- **Cloudflare:** Logpush feature to export logs to your storage

---

## Success Criteria

Implementation is successful when:

1. **PostHog Integration:**
   - [ ] PostHog installed and receiving events
   - [ ] At least 3 key events tracked
   - [ ] Basic funnel dashboard created in PostHog

2. **Alerting:**
   - [ ] Better Stack Errors/Telemetry alerts routing to Slack
   - [ ] Cloudflare alerts routing to Slack
   - [ ] Email fallback configured
   - [ ] Test alerts verified working

3. **Internal Dashboard:**
   - [x] `/admin/observability` page accessible to admins
   - [ ] External dashboard URLs configured per deployment environment
   - [ ] Incident tracker linked
   - [ ] Provider summary metrics displayed (deferred until provider APIs are operationalized)

4. **Documentation:**
   - [x] Runbook created at `docs/observability-runbook.md`
   - [ ] Incident tracker template created
   - [x] This plan updated with actual implementation details

---

## Handoff Notes for Implementing Agent

1. **Read relevant docs first:**
   - `docs/ENGINEERING_GUIDE.md` - engineering patterns
   - `docs/DESIGN_SYSTEM.md` - design system constraints
   - `docs/adr/0013-sentry-user-identity.md` - compatibility transport and user identity behavior
   - `src/utils/errors.ts` - error handling patterns
   - `src/routes/__root.tsx` - root route structure

2. **Follow existing patterns:**
   - Environment variables: Use `src/env.ts` pattern
   - Server functions: Use `createServerFn` from TanStack Start
   - Auth: Use existing `getCurrentUser()` pattern
   - Styling: Match design system in `docs/DESIGN_SYSTEM.md`

3. **Complexity constraints:**
   - Keep functions under 60 lines (docs/rules/complexity.md)
   - Split complex logic into domain files
   - Write tests for new utilities

4. **Verification:**
   - Run `bun run quality:gate` before completion
   - Test PostHog events actually fire
   - Verify alerts trigger correctly
   - Test the admin dashboard page loads and configured links work

5. **Documentation updates:**
   - Update `AGENTS.md` with observability runbook reference
   - Update `src/utils/README.md` if adding analytics utilities
   - Update `src/routes/README.md` with new dashboard route

---

## Estimated Effort

- **Phase 1 (PostHog + Slack):** 4-6 hours
- **Phase 2 (Alerting):** 2-3 hours
- **Phase 3 (Dashboard):** 2-3 hours
- **Total:** ~1-2 days of engineering time

---

## Related Files

- `src/routes/__root.tsx` - Root route and browser error identity
- `src/routes/_authed/admin/observability.tsx` - Admin operating-surface links
- `src/server.ts` - Better Stack-compatible Worker error transport
- `src/env.ts` - public dashboard-link configuration
- `wrangler.jsonc` - Cloudflare Workers config
- `docs/adr/0013-sentry-user-identity.md` - Sentry user identity ADR
- `src/utils/errors.ts` - Error handling utilities

---

## Next Steps

When ready to implement:

1. Complete Better Stack and Cloudflare external setup in `GNHF-10.9.206.md`
2. Set the public dashboard-link variables from `.env.example` in each deployment environment
3. Complete prerequisites checklist (PostHog account, Slack workspace)
4. Validate the admin observability hub and external links
5. Update this document with actual implementation details
6. Consider creating ADR 0015 to document the completed implementation

---

**End of Handoff Document**

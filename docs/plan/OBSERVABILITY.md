# Observability Architecture Implementation Plan

**Status:** Planned (Not Yet Implemented)  
**Date:** 2026-07-04  
**Context:** Handoff document for future implementation by another agent

---

## Executive Summary

This document outlines the observability architecture for the Christ-Dina LMS project, designed to support current operations (1-2 engineers) while being future-proof for 10x scale. The architecture leverages best-of-breed SaaS tools with minimal custom engineering, ensuring quick time-to-value and clear evolution paths.

**Chosen Stack:**
- **Technical Observability:** Sentry (errors + performance) + Cloudflare (logs + traces + metrics)
- **Business Metrics:** PostHog (product analytics, funnels, retention)
- **Alerting:** Slack (primary) + Email (secondary)
- **Internal Dashboard:** Lightweight navigation page linking to external dashboards

---

## Current State

### Already Implemented ✅
- **Sentry:** Error tracking for client + server (Cloudflare Workers)
  - DSN configured in `wrangler.jsonc`
  - User identity attached to Sentry scope (ADR 0013)
  - Error suppression rules in place
  - Packages: `@sentry/cloudflare`, `@sentry/tanstackstart-react`

- **Cloudflare Workers:** Basic observability
  - Logs enabled (100% sampling)
  - Traces enabled (1% sampling)
  - Workers deployment via `wrangler deploy`

### Not Yet Implemented ❌
- PostHog integration
- Slack workspace
- Alert configuration (Sentry → Slack, Cloudflare → Slack)
- Internal observability dashboard
- Business metrics tracking
- Incident response workflow

---

## Architecture Decisions

### 1. Technical Observability: Sentry + Cloudflare

**Rationale:**
- Both already integrated into the stack
- Native support for Cloudflare Workers
- Minimal additional effort required
- Complementary coverage:
  - Sentry: Application-level errors, performance traces, user sessions
  - Cloudflare: Infrastructure-level metrics, request logs, worker execution

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
  - Links to PostHog dashboard
  - Links to Sentry dashboard
  - Links to Cloudflare dashboard
  - Link to incident tracker (Google Doc/Notion)
  - 1-2 critical summary metrics (error rate, active users)

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

#### 2.1 Configure Sentry Alerts → Slack
**Implementation:**
1. In Sentry project settings:
   - Create new alert rule
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

#### 3.1 Build `/admin/observability` Page
**Implementation:**
1. Create new route: `src/routes/_authed/admin/observability.tsx`
2. Add to authed layout (requires authentication)
3. Page content:
   - Header: "Observability Dashboard"
   - Link cards:
     - PostHog Dashboard (external link)
     - Sentry Dashboard (external link)
     - Cloudflare Analytics (external link)
     - Incident Tracker (Google Doc link)
   - Summary metrics:
     - Error rate (last 24h) - fetch from Sentry API
     - Active users (last 24h) - fetch from PostHog API
4. Styling: Match existing design system (docs/DESIGN_SYSTEM.md)

**Files to create:**
- `src/routes/_authed/admin/observability.tsx`

**API integration (optional for v1):**
- Can start with just links
- Add API calls for summary metrics in v2 if needed

#### 3.4 Document Runbook
**Implementation:**
1. Create `docs/observability-runbook.md`
2. Include:
   - How to respond to different alert types
   - Escalation paths
   - Incident workflow
   - Link to incident tracker template
3. Update `AGENTS.md` to reference the runbook

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

### Technical Metrics (Sentry + Cloudflare)
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

| Trigger | Action |
|---------|--------|
| Team grows to 3+ engineers | Add PagerDuty for on-call scheduling |
| Need formal incident management | Add incident.io or build custom workflow |
| Compliance requirements (SOC2, GDPR) | Evaluate self-hosted PostHog or data export |
| Custom business metrics become complex | Expand internal dashboard with embedded widgets |
| 10x traffic scale | Upgrade Cloudflare Analytics Pro, add Datadog |
| Need unified metrics platform | Migrate to Datadog (keep Sentry for errors) |

### Data Ownership Paths

If compliance requires data ownership:
- **PostHog:** Self-hosted option available, or use data export APIs
- **Sentry:** Data export APIs available, self-hosted option
- **Cloudflare:** Logpush feature to export logs to your storage

---

## Success Criteria

Implementation is successful when:

1. **PostHog Integration:**
   - [ ] PostHog installed and receiving events
   - [ ] At least 3 key events tracked
   - [ ] Basic funnel dashboard created in PostHog

2. **Alerting:**
   - [ ] Sentry alerts routing to Slack
   - [ ] Cloudflare alerts routing to Slack
   - [ ] Email fallback configured
   - [ ] Test alerts verified working

3. **Internal Dashboard:**
   - [ ] `/admin/observability` page accessible
   - [ ] All external dashboards linked
   - [ ] Incident tracker linked
   - [ ] At least 1 summary metric displayed

4. **Documentation:**
   - [ ] Runbook created
   - [ ] Incident tracker template created
   - [ ] This plan updated with actual implementation details

---

## Handoff Notes for Implementing Agent

1. **Read relevant docs first:**
   - `docs/ENGINEERING_GUIDE.md` - engineering patterns
   - `docs/DESIGN_SYSTEM.md` - design system constraints
   - `docs/adr/0013-sentry-user-identity.md` - existing Sentry setup
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
   - Test dashboard page loads and links work

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

- `src/env.ts` - Environment variables
- `src/routes/__root.tsx` - Root route (PostHog initialization)
- `src/server.ts` - Sentry configuration
- `wrangler.jsonc` - Cloudflare Workers config
- `docs/adr/0013-sentry-user-identity.md` - Sentry user identity ADR
- `src/utils/errors.ts` - Error handling utilities

---

## Next Steps

When ready to implement:

1. Complete prerequisites checklist (PostHog account, Slack workspace)
2. Hand off this document to implementing agent
3. Agent follows roadmap in order
4. Update this document with actual implementation details
5. Consider creating ADR 0015 to document the completed implementation

---

**End of Handoff Document**

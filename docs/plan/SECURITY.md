# Security Baseline

**Status:** In progress — the direct browser PDF, nested Vite, and shell-quote dependencies
are remediated; the reviewed server-function authorization gaps and secret-inventory contract
are being closed incrementally, while remaining transitive advisories and the application
security review are pending
**Phase:** Engineering Roadmap Phase 5: Security

## Dependency scanning

The repository now runs a Bun dependency audit through
`.github/workflows/dependency-security.yml` on dependency pull requests, pushes to
`main`, a weekly schedule, and manual dispatch. The workflow scans for high and
critical advisories, uploads the JSON result as a short-lived GitHub Actions
artifact, and emits a warning without blocking merges while the current baseline is
being triaged.

Dependabot checks the Bun-compatible npm manifest and lockfile weekly and labels
update pull requests with `dependencies` and `security`.

The advisory workflow is intentionally report-only while the remaining baseline is
triaged. The current dependency tree still has high/critical transitive findings,
but the direct browser-used `pdfjs-dist` advisory is remediated at `^6.2.108`.
After the Vite remediation below, the local high-severity audit reports 36 remaining
high findings; all are currently transitive development-tool dependencies.
Do not suppress an advisory solely to make the workflow green. For each finding,
decide whether to upgrade, replace, isolate, or accept it with a documented owner
and review date.

Once the high/critical baseline is cleared or explicitly accepted, change the
audit step to fail on the agreed severity. Until then, the uploaded report is the
evidence artifact and the warning is the handoff signal.

## Direct browser dependency remediation

The browser uses PDF.js for both private library viewing and local eBook import.
`pdfjs-dist` was upgraded from `5.7.284` to `^6.2.108`, which includes the fix for
[GHSA-hq66-cqwq-w95j](https://github.com/mozilla/pdf.js/security/advisories/GHSA-hq66-cqwq-w95j).
The application only uses PDF.js's parser and canvas rendering APIs; it does not
instantiate the annotation/viewer scripting layer. Preserve that boundary when
changing PDF.js or introducing another PDF loading path, and explicitly disable
scripting on any future annotation-layer integration.

## Transitive development-tool dependency remediation

The dev-only `@tanstack/devtools-vite` chain previously resolved
`launch-editor` to vulnerable `shell-quote@1.8.3`. The root `overrides` entry in
`package.json` now pins that transitive package to `^1.10.0`, covering the
command-injection and parser denial-of-service advisories
[GHSA-w7jw-789q-3m8p](https://github.com/advisories/GHSA-w7jw-789q-3m8p) and
[GHSA-395f-4hp3-45gv](https://github.com/advisories/GHSA-395f-4hp3-45gv).
This is a build/development-tooling remediation; no application API or runtime
behavior changes.

## Nested Vite development-tool dependency remediation

The Bun lockfile previously retained a second `vite@7.3.1` under the
`vitest@3.2.7` → `vite-node@3.2.4` development chain, even though the repository's
direct Vite dependency already resolved to `7.3.6`. The root `overrides` entry now
pins every Vite resolution to `^7.3.6`, so the lockfile has one patched Vite version
and no nested `vite-node/vite` package.

This covers the high-severity Vite advisories reported for the nested `7.3.1`
package, including [GHSA-v2wj-q39q-566r](https://github.com/vitejs/vite/security/advisories/GHSA-v2wj-q39q-566r),
[GHSA-p9ff-h696-f583](https://github.com/advisories/GHSA-p9ff-h696-f583), and
[GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff).
Vite's first two advisories are patched in `7.3.2`, and the Windows alternate-path
advisory is patched in `7.3.5`; `7.3.6` satisfies all three. This remains a
development-tooling remediation: Vite is not part of the deployed Worker/browser
runtime, but exposed network dev servers must still be kept on a patched release.

## Review order

1. Fix or isolate vulnerabilities reachable in the deployed Worker/browser bundle
   before development-only tooling findings.
2. Prefer the smallest compatible upgrade and run the quality gate, integration
   suite, and production build.
3. Re-run `bun audit --audit-level=high` locally and attach the report to the
   dependency update or security review.
4. Keep each root override until its upstream dependency range includes the
   patched release, then remove it only after a clean lockfile/audit review.
5. Record accepted residual risk in the Notion Security page with the advisory,
   reachability, mitigation, owner, and review date. Never put secrets or full
   lockfile credentials in the record.

## Authorization regression hardening

The `/events` route already redirected students in the browser, but its
`getEvents` server function previously queried calendar events without checking
the caller. `getEventsService` now requires an authenticated teacher or admin
before running the query, so direct server-function calls cannot bypass the
route guard. The integration test covers student denial and teacher/admin
access. Apply this same server-side check-first pattern when reviewing other
route loaders that expose staff-only data; a route guard is a user-experience
boundary, not an API authorization boundary.

The authenticated `/calendar` route had the same class of boundary gap: its
`getCalendarEvents` server function relied on the `_authed` route guard and
queried the calendar without first establishing a server-side identity. The
server-function adapter now calls `getCurrentUser()`, and the calendar service
requires an existing profile before reading published lessons, assignments, or
special events. All authenticated roles retain the existing calendar payload;
the change only closes direct unauthenticated invocation.

### Post and comment moderation authorization

Post and comment mutation services allow authors to edit or delete their own
content and delegate non-author moderation to the shared authorization adapter.
That adapter now loads the persisted owner before allowing `editPost`,
`deletePost`, `editComment`, or `deleteComment`. A non-owner must be a Teacher
or Admin; other students receive the typed authorization failure before any
write executes. This matches the existing Supabase policies that allow staff
to update any post or comment while preserving owner-only student writes.

### Active substitution lookup authorization

The Admin enrollment dialog reads active absent-teacher IDs through
`getActiveSubstitutedTeacherIds`. That server function now authenticates the caller and
delegates to `getActiveSubstitutedTeacherIdsService`, which requires the Admin role before
querying `course_substitutes`. The read path is now protected independently of the
enrollment route and the Admin-only substitution mutations.

### Teacher directory service boundary

The teacher directory service previously accepted an omitted actor ID because an
internal Zoom-link owner-options read called it without context. The service now
requires the authenticated caller's persisted profile, and the Zoom-link service
passes its already-validated actor ID through. This preserves the teacher
directory payload and Admin-only staff-privilege metadata while preventing direct
service calls from reading teacher records without an application profile.

## Secret inventory and rotation contract

The repository-owned secret inventory in
[`docs/plan/SECRET_INVENTORY.md`](./SECRET_INVENTORY.md) classifies runtime,
browser, local, and CI variables; maps them to Cloudflare Worker secrets,
GitHub environments, or public build configuration; and defines role-based
rotation, verification, rollback, and evidence rules. It also records the
Better Stack DSN acceptance checks and keeps the temporary Sentry-compatible
names explicit without treating them as the operator destination.

No credential values are stored in the repository or Notion. Named owners,
live provider values, protected production environments, and the first
controlled rotation remain external follow-up work.

## Remaining Phase 5 work

- Continue reviewing RBAC and database/RLS defense-in-depth against the current
  app-level authorization model. The staff-only event-management listing, the
  authenticated calendar overview, and post/comment moderation now enforce
  server-side identity/ownership and staff role where required; the active
  substitution lookup now has the same Admin-only service boundary, and the
  teacher-directory read requires a persisted caller profile.
- Continue hardening admin access and review authentication/session boundaries;
  the calendar event listing is now covered by a server-side teacher/admin
  check; the teacher directory now also requires a persisted caller profile.
- Inventory runtime and CI secrets, including Better Stack and Cloudflare
  credentials, with named rotation owners outside the repository. The
  repository inventory and rotation contract are now documented in
  `docs/plan/SECRET_INVENTORY.md`.
- Verify security-sensitive audit events in Better Stack without exporting PII or
  raw provider errors.
- Complete threat modeling for public enrollment, authentication, admin workflows,
  private storage, and external integrations.

# Security Baseline

**Status:** In progress — the direct browser PDF, nested Vite, shell-quote,
brace-expansion, Browserslist, PostCSS, Nanoid, fast-uri, flatted, js-yaml,
ip-address, sharp, and Hono dependencies are remediated; the reviewed
server-function authorization gaps, secret-inventory contract, and threat-model baseline are documented incrementally,
while remaining transitive advisories and hosted security verification are pending
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
After the ip-address remediation, major toolchain refresh, and parent-package
upgrades below, the local high-severity audit reports 4 remaining high findings
across three transitive development-tool packages.
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
direct Vite dependency already resolved to `7.3.6`. The repository now uses Vite 8
with Vitest 5, and the root `overrides` entry pins every Vite resolution to `^8.3.0`,
so the lockfile has one current Vite version and no nested `vite-node/vite` package.

This covers the high-severity Vite advisories reported for the nested `7.3.1`
package, including [GHSA-v2wj-q39q-566r](https://github.com/vitejs/vite/security/advisories/GHSA-v2wj-q39q-566r),
[GHSA-p9ff-h696-f583](https://github.com/advisories/GHSA-p9ff-h696-f583), and
[GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff).
Vite's first two advisories are patched in `7.3.2`, and the Windows alternate-path
advisory was patched in `7.3.5`; the Vite 8 resolution is beyond all three. This remains a
development-tooling remediation: Vite is not part of the deployed Worker/browser
runtime, but exposed network dev servers must still be kept on a patched release.

## Brace-expansion transitive dependency remediation

The ESLint and `ts-morph` development-tool chains previously resolved their
`minimatch@3.1.5` dependency to vulnerable `brace-expansion@1.1.12`. A targeted
`bun update brace-expansion` refreshed the compatible 1.x lockfile branches to
`1.1.18`, covering the unbounded-expansion and intermediate-array denial-of-service
advisories [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg),
[GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895), and
[GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp).

The lockfile keeps the separate `brace-expansion@5.0.9` and `brace-expansion@2.1.4`
branches required by newer `minimatch` releases, rather than forcing an incompatible
global override. This is a development-tooling remediation; the package is not
included in the deployed Worker/browser runtime.

## Browserslist transitive dependency remediation

The shadcn, TanStack, Vite, and Sentry build-tool paths previously shared
`browserslist@4.28.1`, which was affected by the two high-severity advisories
[GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) and
[GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g).
The root `overrides` entry now pins all compatible Browserslist resolutions to
`^4.28.9`, which is outside the vulnerable `<=4.28.6` range.

This targeted override avoids the failed direct-update pattern from iteration
81, where Bun promoted a transitive package but retained vulnerable nested
copies. Browserslist is used by the build/development dependency paths shown by
the audit tree and is not bundled as application runtime code. The local audit
baseline decreased from 27 to 25 high findings; the remaining findings stay
report-only until separately triaged.

## PostCSS and Nanoid transitive dependency remediation

The Vite and shadcn build-tool paths previously resolved `postcss@8.5.8`, which
was affected by arbitrary file-read and source-map path-traversal advisories
[GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) and
[GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849).
The root `overrides` entry now pins all compatible PostCSS resolutions to
`^8.5.28`, beyond the vulnerable `<=8.5.11` range.

The patched PostCSS release also refreshes its compatible `nanoid` dependency
from `3.3.11` to `3.3.19`, removing the three audit findings for negative-size,
zero-size, and integer-overflow generator behavior:
[GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv),
[GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8), and
[GHSA-xwg4-73v4-xw9w](https://github.com/advisories/GHSA-xwg4-73v4-xw9w).
Both packages are reachable only through development/build tooling in the
current audit tree and are not bundled as deployed Worker runtime code. The
local high-severity audit baseline decreased from 25 to 20 findings; the
remaining findings stay report-only until separately triaged.

## Fast-URI transitive dependency remediation

The shadcn Model Context Protocol toolchain previously resolved `fast-uri@3.1.0`
through `ajv@8.18.0` and `ajv-formats@3.0.1`. That version was affected by
seven high-severity URL normalization, SSRF, host-confusion, and path-traversal
advisories, including
[GHSA-f65p-4m7j-42xc](https://github.com/advisories/GHSA-f65p-4m7j-42xc),
[GHSA-jqff-g426-hqxp](https://github.com/advisories/GHSA-jqff-g426-hqxp), and
[GHSA-q3j6-qgpj-74h6](https://github.com/advisories/GHSA-q3j6-qgpj-74h6).

The root Bun/npm `overrides` entry now pins compatible `fast-uri` paths to
`^3.1.6`; the lockfile resolves `fast-uri@3.1.7`, outside every affected
range. This is a development-only shadcn/JSON-schema tooling remediation;
`fast-uri` is not bundled into the deployed Worker/browser runtime. The local
high-severity audit baseline decreased from 20 to 13 findings; the residual
findings remain report-only pending separate reachability or upgrade decisions.

## Flatted transitive dependency remediation

The ESLint development-tool chain previously resolved `flatted@3.4.1` through
`flat-cache`. The root Bun/npm `overrides` entry now floors compatible
`flatted` paths at `^3.4.2`; the lockfile resolves `flatted@3.4.4`, outside the
affected range for [GHSA-rf6f-7fwh-wjgh](https://github.com/advisories/GHSA-rf6f-7fwh-wjgh).

This covers the prototype-pollution advisory fixed in `flatted@3.4.2`. The
package remains a development-only ESLint dependency and is not bundled into
the deployed Worker/browser runtime. The local high-severity audit baseline
decreased from 13 to 12 findings; the residual findings remain report-only
pending separate reachability or upgrade decisions.

## js-yaml transitive dependency remediation

The ESLint, shadcn, and TanStack Start development-tool chains previously
resolved `js-yaml@4.1.1`, which was affected by the three high-severity
quadratic-CPU merge-key advisories [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m),
[GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj), and
[GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh).
The root Bun/npm `overrides` entry now floors compatible `js-yaml` paths at
`^4.3.0`, outside the affected `<4.3.0` range.

All current consumers declare compatible `4.x` ranges, so this targeted
development-tooling remediation does not change application runtime behavior.
The local high-severity audit baseline decreased from 12 to 9 findings; the
residual findings remain report-only pending separate reachability or upgrade
decisions.

## ip-address transitive dependency remediation

The shadcn Model Context Protocol toolchain previously resolved
`express-rate-limit@8.3.1` to `ip-address@10.1.0`, which is affected by the
leading-zero IPv4 parsing and SSRF/trust-boundary bypass advisory
[GHSA-mwp4-54f8-5fhr](https://github.com/advisories/GHSA-mwp4-54f8-5fhr).
The root Bun/npm `overrides` entry now floors compatible `ip-address` paths at
`^10.3.1`, the first release beyond the affected `<=10.3.0` range; the lockfile
currently resolves `ip-address@10.7.0`.

This is a development-only shadcn/Model Context Protocol remediation; the
package is not bundled into the deployed Worker/browser runtime. The local
high-severity audit baseline decreased from 9 to 8 findings; the residual
findings remain report-only pending separate reachability or upgrade decisions.

## Transitive tooling findings after parent upgrades

The major toolchain refresh upgraded `@cloudflare/vite-plugin` to `1.54.7` and
`wrangler` to `4.131.0`. Their refreshed Miniflare path now resolves patched
`sharp@0.35.4` and `undici@7.29.0`, so the previous sharp and Cloudflare-tooling
`undici` findings are remediated. A root override floors the compatible Hono
consumer chain at `^4.13.7`, remediating the prior Hono finding as well.

The current `bun audit --audit-level=high` result is four findings across three
packages. All are High severity and reachable only through development/build
tooling; none is in the deployed Worker/browser runtime:

- `undici` `>=7.0.0 <7.29.0`: shadcn's nested chain still resolves
  `undici@7.28.0`. The advisory describes cross-user information disclosure and
  a parse-time crash through degenerate private cache directives. Other branches
  already use patched `undici` versions (`7.29.0` and `8.x`), but Bun currently
  retains the separate shadcn branch.
- `path-to-regexp` `>=8.0.0 <8.4.0`: shadcn → Model Context Protocol SDK →
  Express → router resolves `8.3.0`; the advisory is a denial of service through
  sequential optional groups. Wrangler independently requires the incompatible
  major-6 line, so one global override cannot safely cover both branches.
- `picomatch` `<2.3.2`: two audit entries are tied to the legacy micromatch
  branch at `picomatch@2.3.1`; the advisory is regular-expression denial of service through
  extglob quantifiers. Modern Vite/Rolldown paths require picomatch 4.x, so one
  global override cannot safely cover both branches.

The current [Bun override mechanism](https://bun.sh/docs/pm/overrides) supports
top-level package overrides but does not provide consumer-specific nested
overrides. A clean lockfile regeneration
can select patched nested versions, but it also refreshes many unrelated
compatible packages and would create broad lockfile churn; that option was not
taken in this scoped change. No patch files were added. The remaining narrow
options are an upstream release that widens the affected consumer range, future
nested-override support, or a separately reviewed patch-file change. Until one
of those becomes appropriate, these four findings remain explicitly documented
and report-only.

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

### Student directory service boundary

The student directory list and detail services now require a teacher or Admin
actor before reading student profiles, submissions, attendance, or related
course data. The server-function adapters pass the authenticated actor ID into
the service boundary, and integration coverage verifies that direct student
service calls fail before the sensitive read begins.

### Calendar event mutation service boundary

Calendar event listing and create/update/delete services now share the same
teacher-or-Admin check. The route still provides the browser redirect, but the
service boundary rejects direct student calls before querying or mutating
calendar events. Integration coverage verifies denial for each mutation path.

### Post read service boundary

Post channels, paginated post feeds, single-post reads, and comment reads now
require a persisted caller profile inside their services. The server-function
adapters pass the authenticated actor ID through, so direct service callers
cannot bypass the authentication boundary before reading community content.
All persisted roles retain the existing post, channel, and comment response
shapes.

### Post mutation service boundary

Post and comment creates, edits, deletes, and reaction toggles now require a
persisted caller profile before reading or changing community data. The create
post path derives its moderation flag from that profile, while existing
ownership and Teacher/Admin moderation checks remain unchanged. Focused
integration coverage proves direct calls with an unknown actor fail before the
post, comment, or reaction repository operation.

### Post-notification service boundary

Notification summary reads and group/all mark-read mutations now require the
caller's persisted profile inside the notification service. The server-function
authentication remains the transport boundary, while the service check prevents
unknown direct callers from receiving an empty summary or silently reporting a
successful read-state mutation.

### Lesson read service boundary

Lesson detail reads now apply the same manager-only draft rule as assignment
detail reads. Students and teachers who are not assigned to the course can
only load published lessons, and their response contains published assignments
only. Course teachers and admins retain draft lesson content and assignment
authoring data. This check lives in `getLessonService`, so direct server-function
or service calls cannot bypass the route's UI filtering.

### Private avatar storage boundary

Avatar upload request and completion services now require a persisted profile
before minting an actor-owned signed upload or accepting an avatar path. The
server-function session check remains the transport boundary, while the
service check prevents unknown direct callers from using the service-role
storage client or writing an avatar path for a non-existent profile. Focused
integration coverage confirms both operations fail before storage access.

### Media-library service boundary

Media-library reads, CRUD mutations, and private upload helpers now derive the
caller's role from the persisted profile inside `library.service.ts`. The
server-function adapters pass only the authenticated user ID, so a direct
service caller cannot supply a forged `teacher` or `admin` role to bypass
publication filtering or staff/ownership checks. Integration coverage verifies
unknown actors are rejected before media reads, while persisted student and
teacher roles retain their existing behavior.

### Campaign lock service boundary

The email and WhatsApp campaign server functions now delegate lock inspection
and explicit lock release to Admin-guarded services. Previously, the release
adapters authenticated the session but called the repository directly, so a
direct server-function caller could attempt campaign-lock cleanup without the
same role check used by preview and send. Integration coverage verifies that
teachers are rejected and Admins can inspect and release their own held lock.

### Exam-taking service boundary

Student exam listing, attempt start/resume, answer autosave, and submission
services now require the caller's persisted `student` role through the shared
authorization service. Previously, the helper only rejected teacher and Admin
roles, so an unknown direct service caller could be treated as a student and
reach the published-exam read path. Integration coverage confirms unknown
callers fail before exam reads or attempt creation.

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

## Threat-model baseline

The repository-owned threat-model baseline is documented in
[docs/plan/THREAT_MODEL.md](./THREAT_MODEL.md). It maps actors, sensitive
assets, Worker/Auth/Database/Storage/provider/CI trust boundaries, and fourteen
threats covering authorization drift, public-endpoint abuse, secret exposure,
telemetry privacy, storage access, CSRF, delivery retries, dependencies,
rollback/recovery, capacity, RLS, and incomplete provider configuration.

The baseline records current controls and evidence without treating application
authorization as a substitute for a future request-identity-aware RLS design.
Remaining work is live provider acceptance, the first hosted restore and
rollback rehearsals, public-endpoint abuse controls, dependency triage, and a
measured RBAC/RLS migration plan.

## Public-endpoint abuse controls (Cloudflare WAF)

Enrollment remains closed until the public-flow rate-limit policy is verified.
The repository-owned Cloudflare procedure is in
[`GNHF-10.9.206.md`](../../GNHF-10.9.206.md#iteration-100--cloudflare-waf-public-endpoint-abuse-control-runbook)
and covers signup/OTP, password reset, invitation-token and email checks,
email-change verification, and any future enrollment opening.

The operator must map each browser action to the actual request path in
Cloudflare Security Analytics before creating a rule; TanStack server-function
names must not be guessed as edge paths. Exclude `/healthz` and `/readyz`,
start new rules in Log mode, use a public-traffic characteristic such as the
client IP, and move to Block or Managed Challenge only after a controlled
synthetic rehearsal. If the plan supports a custom response, use a generic 429
without account or token details. Connect the resulting 429/mitigation signal
to the Better Stack alert path, record rule IDs and thresholds in the Notion
security/risk record, and keep the rule disable path as the rollback.

No Cloudflare rule IDs, API tokens, or production thresholds are committed in
this repository; the remaining step is operator execution and evidence capture.

## Remaining Phase 5 work

- Continue reviewing RBAC and database/RLS defense-in-depth against the current
  app-level authorization model. The staff-only event-management listing, the
  authenticated calendar overview, calendar event mutations, and post/comment
  moderation now enforce server-side identity/ownership and staff role where
  required; the active
  substitution lookup now has the same Admin-only service boundary, the
  teacher-directory read requires a persisted caller profile, and the student
  directory list/detail services require a teacher or Admin actor. Post
  channel/feed/post/comment reads and community mutations now require a
  persisted caller profile; student exam surfaces now require the persisted
  `student` role rather than merely excluding staff roles.
- Continue hardening admin access and review authentication/session boundaries;
  the calendar event listing is now covered by a server-side teacher/admin
  check; the teacher directory now also requires a persisted caller profile,
  and student directory reads enforce the same staff boundary in their services.
- Inventory runtime and CI secrets, including Better Stack and Cloudflare
  credentials, with named rotation owners outside the repository. The
  repository inventory and rotation contract are now documented in
  `docs/plan/SECRET_INVENTORY.md`.
- Verify security-sensitive audit events in Better Stack without exporting PII or
  raw provider errors.
- Revisit the threat model for every new public endpoint, role, database/storage
  boundary, external integration, or telemetry event; complete the external
  verification actions listed in
  [docs/plan/THREAT_MODEL.md](./THREAT_MODEL.md).

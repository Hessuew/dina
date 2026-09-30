# ADR 0026 — Main and Immutable Tag-Based Production Releases

**Status:** Accepted
**Date:** 2026-09-29

## Context

DINA has one application Worker and one production Supabase database, but the
old production migration workflow was triggered by a long-lived `production`
branch that does not belong in the code promotion model. A production deploy
must prove that the database migration and Worker artifact came from the same
validated commit. Cloudflare also separates uploading a Worker version from
serving it, which allows exact-version smoke tests and gradual traffic.

The Worker serves HTML and content-hashed assets. During a split deployment,
requests from one browser must remain associated with one Worker version or the
HTML and assets can come from incompatible builds. Database rollback is not
safe to automate because Drizzle migrations may have changed production data.

## Decision

1. **`main` is the only long-lived code branch.** Pull requests and the green
   `Main release gate` validate changes; production promotion consumes the
   exact successful SHA.
2. **Every promotion creates a new immutable UTC tag** in the form
   `vYYYY.MM.DD.N`. Failed tags remain for audit and the sequence never reuses
   a tag. Manual dispatch accepts only a full SHA with a successful main gate.
3. **GitHub Actions remains the orchestrator.** The protected `production`
   environment approves the ordered migration and deployment job. The workflow
   applies the compatible Supabase migration without seeding, builds with the
   release tag, uploads an undeployed Cloudflare version, and runs exact-version
   health and affected-journey smoke checks.
4. **Standard promotion serves 100% with post-promotion guardrails.** The
   standard profile observes a five-minute per-version metrics window and
   applies the same error-rate, latency, and release-correlated severity
   guardrails as gradual promotion. The gradual profile serves
   `10% → 25% → 50% → 100%`, waiting ten minutes and checking at least 20
   new-version requests at every stage. If the 10% sample is below the floor,
   the workflow promotes directly to 100% after guardrails pass.
5. **Promotion is fail-closed without per-version metrics.** The
   protected metrics adapter must provide requests, errors, p95 latency, and
   release-correlated high-severity issue count for the exact Worker version.
6. **Health or rollout guardrail failure rolls back only the Worker.** A
   `/readyz` failure, unexpected error rate above 5% for five minutes, p95
   latency above one second for five minutes, or new high-severity
   release-correlated issue triggers deployment of the recorded previous Worker
   version and a second smoke check. The database is never automatically
   down-migrated; use a forward-fix migration or the approved restore runbook.
7. **Version affinity is required at the Cloudflare zone edge.** The Worker
   issues a long-lived, non-sensitive `dina-version-key` cookie when one is
   absent. A `christ-dina.org` Request Header Transform Rule matches
   `http.cookie contains "dina-version-key"` and dynamically sets
   `Cloudflare-Workers-Version-Key` to
   `http.request.cookies["dina-version-key"][0]`. The version metadata binding
   is exposed in response headers for smoke and evidence correlation.
8. **The release record is a GitHub Release.** It contains the previous
   release, merged PRs, commits, migration files, Cloudflare version, rollout
   result, and rollback target. Better Stack and Worker source-map correlation
   use the same immutable release tag.

Automatic promotion remains disabled until the external readiness checklist is
verified: release/environment and source-map correlation, alert delivery to
Slack `#incidents` plus email fallback, `/healthz` and `/readyz` monitors,
version affinity and split-asset testing, Worker rollback, isolated Supabase
restore, and queryable per-version metrics.

## Alternatives considered

- **Keep a `production` branch** — rejected. It duplicates promotion state,
  makes the exact validated SHA ambiguous, and allows database and Worker
  changes to drift.
- **Use `wrangler deploy` directly** — rejected for production. It couples
  upload and 100% traffic, preventing exact-version smoke and controlled
  rollback.
- **Automatically down-migrate on application rollback** — rejected. Applied
  migrations may be destructive or data-transforming; a forward fix or
  approved restore is safer.
- **Run gradual rollout from aggregate Worker metrics** — rejected. Aggregate
  traffic cannot prove the exact new version met the sample floor or guardrails.

## Consequences

- A release can leave an auditable failed tag without serving its version.
- Production migration approval and Worker promotion are visible in one
  workflow, while runtime secrets remain in Cloudflare and migration secrets
  remain scoped to the protected GitHub environment.
- Automatic production promotion is intentionally unavailable until external
  provider setup and drills are complete.
- The first low-risk release must verify the full evidence chain before the
  readiness switch is enabled.

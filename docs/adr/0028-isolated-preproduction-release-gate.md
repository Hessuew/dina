# ADR 0028 — Isolated Pre-Production Gate for Production Releases

**Status:** Accepted
**Date:** 2026-10-30

## Context

ADR 0027 made `main` plus immutable tags the only promotion path: the `Main
release gate` validates each push, and `production-release.yml` promotes the
exact validated SHA. Until now nothing proved a validated commit can actually
run before it reached production — the main gate exercises tests, an
integration migration replay, a production build, and a `wrangler deploy
--dry-run`, none of which serve a Worker against real infrastructure.

The release-readiness work requires an isolated pre-production deployment that
is a mandatory gate for production release. It must run the same immutable main
commit production would release, use only the isolated development Supabase
project, and never touch the production Worker, database, custom domain, or
data. A failed, absent, or SHA-mismatched pre-production result must prevent
production.

## Decision

1. **The main gate owns the pre-production deployment.** A
   `Deploy and verify pre-production` job in
   `.github/workflows/main-release.yml` runs after the `release` job (and after
   `migrate-development` when it runs) for every gated main commit. Binding to
   the gate run is what makes the SHA proof airtight: a successful gate for a
   commit now means that exact commit deployed and passed pre-production.
2. **The gate stays fail-closed behind `PREPRODUCTION_GATE_ENABLED`.** The
   protected repository variable defaults to unset/`false` while external
   setup is incomplete, so the job is skipped without breaking the main gate.
   Production promotion still requires the evidence below, so a skipped gate
   can never release.
3. **A dedicated Worker isolates the environment.** The job generates
   `wrangler.preproduction.generated.jsonc` from `wrangler.jsonc` via
   `scripts/preproduction-wrangler-config.ts`: the Worker name becomes
   `christ-dina-preproduction`, the `christ-dina.org` custom-domain route is
   removed so only `workers.dev` serves, and the Hyperdrive binding is swapped
   to the development-Supabase configuration id. The generator refuses the
   production Worker name and the production Hyperdrive id. The job also
   rejects a `PREPRODUCTION_ORIGIN` on `christ-dina.org` and any Supabase URL
   that resolves to `SUPABASE_PRODUCTION_PROJECT_REF`.
4. **The uploaded version carries the gated SHA.** Each gate uploads a version
   tagged `pre-<full main SHA>` and serves it at 100%. Health/readiness smoke
   (`/healthz`, `/readyz`) and the agreed public journeys (`/login`,
   `/forgot-password`, `/reset-password` via `PREPRODUCTION_JOURNEY_PATHS`)
   require the served version id and the `pre-<sha>` release tag on the page
   and its hashed assets — the same checks production applies through the
   version override, run directly against the workers.dev origin.
5. **Production requires the evidence.** A
   `Verify pre-production gate evidence for the target SHA` step in
   `production-release.yml` runs before the release tag is created. For
   `workflow_run` promotion it inspects the triggering gate run; for manual
   dispatch it requires a successful main-gate run for the target SHA that
   recorded a successful pre-production job. A trusted production release
   binding is exempt because that commit was already proven in production.
6. **Runtime secrets stay outside the gate job.** The job writes only public
   Worker vars (`SUPABASE_URL`, `APP_URL`, `RESEND_FROM`,
   `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION`, release identity vars).
   `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `WHATSAPP_ACCESS_TOKEN`, and
   `BETTER_STACK_DSN` remain Cloudflare Worker secrets configured externally on
   the pre-production Worker; the gate fails closed until they exist.

## Alternatives considered

- **A separate `preproduction-release.yml` triggered by `workflow_run`** —
  rejected. Binding evidence across workflow runs requires the deployments API
  or display-title matching, which is more machinery and more failure modes
  than a job inside the same run. In-run binding cannot mismatch the SHA.
- **A pre-production stage inside `production-release.yml`** — rejected. The
  production workflow is fail-closed until external readiness is complete, so
  pre-production would never exercise code ahead of enablement, and a failed
  gate inside the release would leave an audit tag without a candidate.
- **A `wrangler.jsonc` `env` block for pre-production** — rejected. The
  development Hyperdrive id is external configuration that cannot be committed,
  `routes` cannot be cleanly removed through environment inheritance, and the
  generated config keeps one auditable transformation instead of a merged
  shadow configuration.
- **Requiring pre-production evidence for every manual target, including
  trusted releases** — rejected. A previously released commit already has
  stronger evidence (actual production service); requiring a gate re-run would
  break the designed re-promote rollback path for releases that predate the
  gate.

## Consequences

- Every main push pays a build, Worker upload, deploy, and smoke pass while the
  gate is enabled; the serialized gate means these never overlap.
- Manual promotion of an unverifiable SHA stays impossible: targets must still
  be the current main commit or a trusted release, and a non-trusted target
  cannot mint gate evidence retroactively.
- A main-gate `workflow_dispatch` re-run produces fresh pre-production evidence
  for the current main SHA when a re-check is needed.
- Production promotion remains disabled until the external readiness checklist
  is complete; enabling `PREPRODUCTION_GATE_ENABLED` earlier lets evidence
  accumulate while `PRODUCTION_RELEASE_ENABLED` stays `false`.

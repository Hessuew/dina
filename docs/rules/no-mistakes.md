---
name: no-mistakes-delivery
scope: '*'
enforced-by: trusted no-mistakes review instructions + required GitHub check
---

# Every delivery uses no-mistakes

## Rule and authority

Use the vendor-maintained no-mistakes pipeline for every delivered change and PR,
including small fixes, documentation, configuration and dependency/bot changes.
Do not bypass its Review step or replace it with a manual PR-body declaration.
Our Code Review Skill is for targeted additional audits, not a competing mandatory pipeline.
The vendor owns orchestration/output; this rule adds project-specific review obligations.

Read `AGENTS.md`, applicable binding rules, `docs/ENGINEERING_GUIDE.md`, `CLAUDE.md`,
accepted ADRs and nearest module documentation for the changed area. These remain authoritative;
do not transplant Leadership Support's Clerk/UnitOfWork architecture into Dina.
New or contradictory product behavior needs an explicit decision, not an invented correction.
Do not resolve deliberate user decisions through unattended approval or a review skip.

## Project-specific review guidance

- Supabase authentication and protected TanStack routes do not replace server authorization.
  Trace server functions through validation, current user/role, object ownership and projection;
  retain same-origin CSRF middleware and safe typed errors. Test unauthorized paths.
- Database access uses the request-scoped Drizzle/Hyperdrive helpers from the engineering guide;
  check concurrency, connection disposal, atomic mutations, scoped uniqueness and migration safety.
- Keep business rules in domain modules and server adapters thin. Apply actual complexity,
  database-type and React Compiler stable-reference rules; do not introduce ritual abstractions.
- Trace lifecycle, cancellation, stale state and failures. A provider response is not business
  completion. Check retry bounds, dedupe, uncertain sends, cleanup and secret/personal-data leakage.
- Fast UI requires bounded queries/payloads/lists, no N+1, render-blocking provider call or unnecessary
  waterfall. Measure relevant changed journeys at realistic scale where possible; record missing
  measurements rather than inventing speed improvements. Preserve the accepted design system.
- Verify changed behavior and credible failure paths through executable tests. Use domain coverage
  and release requirements from project rules, not another project's coverage policy. Documentation
  review checks meaning, links, ownership and contradictions; it does not require artificial tests
  of prompt wording or running unrelated product journeys for a prose-only change.
- Review each changed file and relevant callers. Report reachable trigger, evidence, impact and
  smallest justified fix, separating uncertainty and optional improvements. Keep private data out
  of findings. No incomplete/failed check, quota skip or preparation fixture counts as complete.
- Review policy/configuration changes against the existing trusted policy; branch changes cannot
  excuse themselves. Missing guidance or an affected unresolved requirement must be surfaced.

## Local delivery and merge enforcement

Preserve unrelated working changes. Commit only the assigned change on a feature branch, then
drive the pipeline with the full user intent. Its executor owns fixes while a run is active;
do not start nested pipelines, manually reset its worktree, skip Review or directly push around it.
The `.no-mistakes.yaml` policy is trusted only after it reaches the default branch.
`review.path_instructions` injects the entrypoint for all paths; `ignore_patterns` remains empty;
`ci.revalidate_repairs: true` makes later CI fixes pass Review again before publication.
Protected paths prevent automatic agents committing enforcement/policy rewrites unnoticed.
This does not prevent a human author from deliberately proposing policy changes.

The pinned vendor action in `.github/workflows/no-mistakes-required.yml` checks live PR facts,
matching head SHA and completed Review/Test/Document. No path, branch or bot exemptions.
The target-branch workflow has no checkout, installation or execution of PR code, and uses only
read permissions. A failed live lookup is not permission to fall back to stale evidence.
Ordinary quality/dependency/release checks remain separate and required by their existing policy.

Activation requires the config/rule/workflow on the default branch, one real workflow run,
then GitHub branch protection/ruleset requiring **PR must be raised via no-mistakes** alongside
existing checks. Preserve existing protections and human merge authority; do not claim enforcement
from a local file or green unit tests. Do not enable a nonexistent required check and strand PRs.
Dependencies/bots must be routed through the pipeline rather than silently exempted; rollout must
account for existing open PRs. Every new delivery needs current, non-skipped pipeline evidence.

## Limits and exceptions

The vendor PR attestation is an author-editable structural declaration, not signed proof of review
or proof that the agent read every rule. It catches absent/skipped/stale declarations, not forgery.
Keep GitHub protections, authorized human review for sensitive policy changes, and inspect the
applied-instruction/coverage logs. Do not claim a malicious author cannot bypass it.
Do not manufacture evidence or approve over failed tests. An exceptional delivery needs an explicit
authorized decision and recorded reason; agents may not invent small-change or quota exemptions.

## Activation state — 2026-10-02

Local tooling updated to 1.84.0; configuration, guidance and workflow prepared locally.
Default-branch publication and required-check activation are not claimed by this file.
Verify those separately before saying all PRs are merge-blocked on this policy.

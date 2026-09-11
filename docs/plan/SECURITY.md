# Security Baseline

**Status:** In progress — the direct browser PDF dependency is remediated; transitive
advisories and the remaining application security review are pending
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

## Review order

1. Fix or isolate vulnerabilities reachable in the deployed Worker/browser bundle
   before development-only tooling findings.
2. Prefer the smallest compatible upgrade and run the quality gate, integration
   suite, and production build.
3. Re-run `bun audit --audit-level=high` locally and attach the report to the
   dependency update or security review.
4. Record accepted residual risk in the Notion Security page with the advisory,
   reachability, mitigation, owner, and review date. Never put secrets or full
   lockfile credentials in the record.

## Remaining Phase 5 work

- Review RBAC and database/RLS defense-in-depth against the current app-level
  authorization model.
- Harden admin access and review authentication/session boundaries.
- Inventory runtime and CI secrets, including Better Stack and Cloudflare
  credentials, with rotation owners outside the repository.
- Verify security-sensitive audit events in Better Stack without exporting PII or
  raw provider errors.
- Complete threat modeling for public enrollment, authentication, admin workflows,
  private storage, and external integrations.

# Security Baseline

**Status:** In progress — dependency audit reporting is implemented; remediation and
the remaining application security review are pending
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

The advisory workflow is intentionally report-only for this first slice. The
current dependency tree has known high/critical findings, including a direct
`pdfjs-dist` advisory and transitive development-tool advisories. Do not suppress
an advisory solely to make the workflow green. For each finding, decide whether to
upgrade, replace, isolate, or accept it with a documented owner and review date.

Once the high/critical baseline is cleared or explicitly accepted, change the
audit step to fail on the agreed severity. Until then, the uploaded report is the
evidence artifact and the warning is the handoff signal.

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

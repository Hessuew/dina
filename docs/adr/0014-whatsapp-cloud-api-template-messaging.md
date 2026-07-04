# ADR 0014 — WhatsApp Messaging via Meta Cloud API Template Campaigns

**Status:** Accepted
**Date:** 2026-07-04

## Context

DINA wants to reach accepted applicants on WhatsApp from the academy's official number: a
congratulations to newly-approved students and a signup reminder to those invited but not
yet registered. The only outbound channel was transactional email (Resend). The applicant's
WhatsApp number is already collected at enrollment (`enrollments.phone_whatsapp`) — but as
unvalidated free text.

Two vendor constraints shape everything:

1. **Business-initiated WhatsApp messages must use a Meta-approved template.** Free-form
   bodies are impossible, an all-parameter "generic" template is rejected by Meta, and the
   pricing/behavior category (Utility/Marketing/Authentication) is a per-template attribute.
2. The Cloud API takes the recipient as E.164 digits, so the free-text phone column needs
   normalization before any send.

## Decision

**Send via the Meta WhatsApp Cloud API directly (no Twilio/BSP), behind a port/adapter with
a composition root, driven by two fixed template campaigns, logged to a `whatsapp_messages`
table.**

- **Provider — Meta Cloud API direct** (`fetch` to `graph.facebook.com`): no per-message BSP
  markup, no extra vendor dependency. Secrets: `WHATSAPP_ACCESS_TOKEN`,
  `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION` (t3-env, Cloudflare binding).
- **Port/adapter + composition root** (`src/utils/whatsapp/`): `WhatsAppSender` port,
  `CloudApiWhatsAppSender` adapter, `get/setWhatsAppSender` singleton (same seam as
  `src/utils/authz/service.ts`). Integration tests inject a fake sender against the real
  PGlite DB; a future provider swap or queue stays behind the port.
- **Two purpose-built Utility templates, not one generic one** — the only way to control
  category and pass Meta review. Canonical bodies live in-repo
  (`domain/templates.domain.ts`, `{{1}}` = recipient name) and are submitted to Meta once;
  cohort pairing is fixed in code: `congratulations` → Approved, `signup_reminder` → Not yet
  registered (reusing the email-export cohort predicates).
- **`whatsapp_messages` log table** (admin-only RLS): one row per attempt (`sent`/`failed`),
  provider message id, error, sending admin. Serves audit, **idempotency** (re-runs skip
  enrollments already `sent` for that template; failures retry), and is extensible for
  delivery webhooks (`whatsapp_message_status` enum can grow `delivered`/`read`).
- **Phone normalization with `libphonenumber-js`, no default region**: numbers without an
  explicit `+CC` are skipped and reported, never guessed.
- **Synchronous throttled loop, capped at 100 sends/run** (Worker subrequest/CPU limits);
  per-recipient try/catch so one failure never aborts the batch. Admin re-runs for the
  remainder — dedupe makes that safe.
- **Authz: admin only**, checked in the service (`authz(userId).hasRole('admin')`), stricter
  than the teacher-accessible email export because sends are outward-facing.

## Consequences

- Adding a message type = author a template in-repo, submit to Meta, wait for approval, add
  the campaign pairing. Day-to-day operation never touches Meta's console.
- The template bodies in code must stay byte-identical to the Meta-approved versions;
  drifting breaks sends at the provider.
- Deferred by design: inbound webhooks and STOP/opt-out handling (enrollment number
  submission is treated as consent for these transactional messages), delivery/read status,
  an async queue for cohorts beyond the 100/run cap, multi-language templates, per-enrollment
  single sends, and E.164 validation at the enrollment form.
- Un-normalizable phones surface as `invalid phone` skips in the admin dialog rather than
  failing the run — cleaning them up remains a manual admin task.

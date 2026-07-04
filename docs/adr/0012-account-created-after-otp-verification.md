# ADR 0012 — Account Created Only After OTP Verification

**Status:** Accepted  
**Date:** 2026-07-03

## Context

Invitation-gated signup is a two-phase flow: the invited user opens `/signup?token=…`, submits
the credentials form (phase 1 → `signupService`), then enters a 6-digit OTP emailed to them
(phase 2 → `verifyOtpService`). The OTP is a homegrown scheme stored on the invitation row
(`otp_hash` / `otp_expires_at` / `otp_attempts`), not Supabase's built-in email OTP.

The original `signupService` did **everything** in phase 1, before the OTP was ever checked:

1. `createUser({ email_confirm: false })` — created the Supabase auth user,
2. `insertProfileOnConflict(...)` — created the `profiles` row,
3. `markInvitationAccepted(...)` — flipped `invitations.status` to `accepted`.

Any user who completed phase 1 but abandoned phase 2 (lost/late OTP email, expired code, 5
failed attempts, closed tab) was then **permanently locked out**. Both re-entry guards require
`status === 'pending'` — `validateInvitationActive` (`invitation/domain/invitations.domain.ts`)
made the returning invitation link throw _"already been used or revoked"_ so the form never even
rendered; `validateSignupInvitation` rejected any resubmit; and `createUser` would fail on the
now-duplicate email regardless. The invitation was marked `accepted` at **"started signup"** when
it should mean **"completed signup / email verified."**

The client already sends `email` + `password` to `verifyOtpFn`, so all inputs needed to create
the account are available at the verification step.

## Decision

**Create the account only after the OTP proves the email.** `signupService` now only validates
the invitation (still requires `pending`), issues + emails the OTP, and returns `requiresOtp`. It
creates nothing. `verifyOtpService`, on a correct OTP, provisions the account:
`createUser({ email_confirm: true })` → `insertProfileOnConflict` (role from the invitation,
`fullName` threaded through the verify payload) → `markInvitationAccepted` → auto-login.

The invitation therefore stays `pending` throughout the OTP window, so abandoning phase 2 leaves
**zero orphan state** and the same invitation link keeps working — re-entry needs no special code
path. Provisioning is defensively idempotent: if `createUser` reports the email already exists,
the existing profile's auth user is confirmed instead of erroring (covers double-submit / residue),
and a fresh auth user is rolled back if the subsequent profile insert throws.

## Consequences

- The user's **full name** and **password** now transit to the verify step (`verifyOtpSchema`
  gains an optional `fullName`; the client's `getCredentials` returns it). No new DB column.
- **No profile exists before verification.** Anything assuming a pre-verification profile would
  break — none does today; the profile is created and consumed within `verifyOtpService`.
- The auth user is created already-confirmed (`email_confirm: true`) because the OTP is the proof
  of the email; the separate `updateUserById({ email_confirm: true })` step is gone from the
  happy path.
- The rollback/delete dance moved from `signupService` into the provisioning helper, scoped to
  the account creation it guards.
- **Existing stranded users** (accepted invitation + unconfirmed auth user, from the old flow) are
  not self-healed by the code change — their invitation is still `accepted`. A one-off remediation
  (`scripts/unstick-stranded-signups.mjs`) deletes the unconfirmed auth user + profile and resets
  those invitations to `pending`.

## Alternatives considered

- **Defer the accept + resumable signup.** Keep creating the auth user + profile at form-submit
  (unconfirmed), but move only `markInvitationAccepted` to post-OTP and make `signupService`
  idempotent (detect the existing unconfirmed user, re-issue OTP) plus loosen the invitation
  guards to tolerate accepted-but-unconfirmed. Rejected: it keeps producing orphan unconfirmed
  auth users for every abandoner, needs more branch/guard code, and leaves lingering profile rows
  that also block admin re-invite. Creating the account after verification makes the illegal
  "half-signed-up" state unrepresentable instead of patching re-entry around it.

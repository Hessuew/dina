# Context Map — Disciplers of Nations Academy (DINA)

Domain glossary for the DINA educational portal. Use these terms consistently across code, docs, and conversations.

---

## Core Terms

### Enrolment (public application)

A public-facing submission made by a prospective student via the `/enrolment` form. Contains personal background, story essays, and contact details. Stored in the `enrollments` table. Status progresses through `pending → under_review → awaiting_approval → approved/rejected/waitlisted/withdrawn/deferred`. The assigned Reviewer's score now auto-derives status (see **Enrollment Evaluation** and ADR 0008); admins still own the final lifecycle states. Teachers see a **redacted enrollment view** (see below).

Spelling note: the user-facing route and utils dir use British "enrolment" (`/enrolment`, `src/utils/enrolment/`); the DB table and TypeScript types use American "enrollment" (`enrollments`, `EnrollmentRow`).

### Teacher-user

An authenticated platform user with `profiles.role = 'teacher'`. Can manage courses, view students, and view enrollments in read-only (redacted) mode. Distinct from the static landing-page Lecturer array.

### Lecturer (landing)

A marketing concept on the landing page (`/`). Defined as a hardcoded static array (`gemLecturers` in `src/components/landing/lecturers.tsx`). Tied to the "Twelve Stones / Twelve Lecturers" gemstone theme. These are **not** database records and are **not** the same as Teacher-users, even though the `profiles` table carries `lecturerTitle` and `gemstone` columns to support displaying teacher-users with the same styling if needed.

### Redacted Enrollment View

What a Teacher-user sees when viewing enrollments. Full applicant story (name, demographics, location, church context, essays, status) but with contact details and invitation tracking stripped server-side before the response leaves the server. Hidden fields: `email`, `phoneWhatsApp`, `invitationSent`, `invitationId`.

### Admin

A user with `profiles.role = 'admin'`. Full enrollment access: read all fields, change status, send invitation, delete. The send-invitation action is only offered once the enrollment `status` is `approved`. Only role that can manage users and invitations.

### Special Case

A boolean admin flag (`enrollments.special_case`) marking an enrollment for special handling. Toggled by an Admin from the enrollments list via a star control, and surfaced there as a filled gold star plus an amber row tint. Teacher-users do not see the flag at all; only Admins can toggle it. Orthogonal to enrollment `status` and to Enrollment Evaluations.

### Student

A user with `profiles.role = 'student'` (default). Enrolled via an admin-sent invitation after their enrollment submission is approved. Cannot view the enrollment review surface.

### Invitation lifecycle

An invitation (`invitations` table) is the single, admin-issued gate into signup — there is no open registration. Its `status` enum has three values, and their precise meaning is:

- **`pending`** — invited but **not yet signed up**. The account does **not** exist yet: through the entire signup + OTP window the invitation stays `pending`, so the `/signup?token` link keeps working and an abandoned OTP strands no one. The invitation row also carries the homegrown OTP state (`otp_hash`, `otp_expires_at`, `otp_attempts`).
- **`accepted`** — **signup completed**: the OTP was verified and, only then, the Supabase auth user + `profiles` row were created. Set **exclusively** by `verifyOtpService` (see ADR 0012). It does **not** mean "the user started the form."
- **`revoked`** — cancelled by an Admin; can no longer be used.

Both signup guards (`validateSignupInvitation`, `validateInvitationActive`) require `pending`, so `accepted`/`revoked` invitations correctly refuse re-use.

### Registered

An applicant is **Registered** once they have **completed signup** — i.e. the enrollment's linked invitation reached `accepted` (OTP verified, `profiles` row created; see **Invitation lifecycle** and ADR 0012). "Registered" is a display alias for `accepted`; there is no separate column. Because signup is invitation-gated, a Registered applicant was necessarily invited (`invitation_sent = true`) and, in practice, was `approved` first.

### Email Export Cohorts

The four groups selectable in the export-emails dialog (`ExportEmailsDialog`), resolved by `findEnrollmentEmailsByGroup`. Emails are always ordered by enrollment `created_at`:

- **All enrollments** — every enrollment, unfiltered.
- **Approved** — `status = 'approved'`.
- **Registered** — the enrollment's linked invitation is `accepted` (see **Registered**).
- **Not yet registered** — **invited but not signed up**: `invitation_sent = true` **and** the linked invitation is not `accepted`. Deliberately anchored on _invited_, **not** on `status = 'approved'` — the cohort is the people who were emailed an invite and haven't finished creating their account, so they are the actionable "nudge to finish signup" list.

All four are currently offered to both Admins and Teacher-users (email redaction is bypassed for export). This exposes invitation/registration tracking that the **Redacted Enrollment View** otherwise hides from Teacher-users; that carve-out is a known, temporary state to be tightened later.

### Affiliated Ministry

External ministry organizations that DINA partners with or is spiritually connected to. Examples: Flame the Freeze, Prayer Church Finland. These are not database entities but external references used in marketing content.

### Evaluator

A Teacher-user or Admin acting on the enrollment review surface. An Evaluator records their own score, admission category, and note for an enrollment. Distinct from the static landing **Lecturer**. Each Evaluator has at most one **Enrollment Evaluation** per enrollment; an Evaluator can read every Evaluator's evaluations but may only write their own.

### Enrollment Evaluation

One Evaluator's assessment of one enrollment: a nullable rubric **score** from 0 to 4, a nullable **admission category** required by the UI when the score is 3 or 4, and an optional **note**, stored as a single row per `(enrollment, evaluator)` in the `enrollment_evaluations` table. Score meanings are 0 = rejected, 1 = borderline, 2 = reserve list, 3 = admission, and 4 = strong admission. Admission categories are A = new (admitted in the new young convert/new discipleship category), B = emerging (admitted into emerging leaders discipleship category), and C = established (admitted into an established leaders discipleship category). Scores aggregate on the enrollment list as a sortable **sum · evaluator-count**. The **assigned Reviewer's** score auto-derives enrollment `status` (0/1 → rejected, 2 → waitlisted, 3/4 → awaiting_approval, cleared → under_review), unless status is a frozen admin decision (`approved`/`withdrawn`/`deferred`); peer and non-assigned-admin scores stay advisory and never move status (see ADR 0008, superseding ADR 0006's side-effect-free rule). Captured in the keyboard-driven review overlay launched from the enrollments list.

### Reviewer

The single Evaluator **assigned** an enrollment via the `enrollment_reviewer_assignments` table (one reviewer per enrollment). The enrollments list defaults to showing each Evaluator only the enrollments assigned to them as Reviewer (admins can toggle **View All**). Assignment is seeded by the admin **Distribute unassigned** action. A Reviewer is distinct from an Evaluator: every Reviewer is an Evaluator, but an Evaluator may also evaluate enrollments they are not the Reviewer for (see Peer Review).

### Peer / Course partner

The other Teacher-user on the same course as a given Teacher-user, derived from the `course_teachers` table. The expected shape is **two teachers per course, one course per teacher**, so each teacher has exactly one Peer — but this is a convention, not a database constraint, so the system treats _all_ co-teachers as Peers and degrades gracefully when a course has one or more than two.

### Peer Review

The act of a teacher adding their **own** Enrollment Evaluation to an enrollment their **Peer** scored 3 or 4 — a cross-check on the partner's high-stakes admits. Peer Review reuses the Enrollment Evaluation entity (the peer reviewer becomes a second Evaluator on that enrollment); it introduces no new score type or table. These enrollments are surfaced in the teacher's enrollments list (merged with their own assigned ones, marked with a **Peer-review state** badge) even though they are assigned to the Peer as Reviewer. See ADR 0007.

### Peer-review state

A **derived**, per-viewer label shown on the enrollments list (never stored, never an `enrollment_status` value): `under_peer_review` when a Peer scored the enrollment 3/4 and the viewer has not scored it yet, `peer_reviewed` once the viewer has scored it, and absent otherwise. It recomputes automatically as scores change. A Peer's score feeds this label but stays **advisory** — only the assigned Reviewer's score drives enrollment `status` (see **Awaiting approval** and ADR 0008).

### Course Substitute

A teacher who temporarily covers another teacher's (**Absent Teacher's**) Reviewer role and Peer Review responsibilities for a specific course. Recorded in `course_substitutes` by an Admin (`substituteTeacherService`). The Substitute appears as a full member of the course's review team — for the peer queue, peer-review state derivation, and evaluation authorization — without being added to `course_teachers` (which would corrupt the "one course per teacher" invariant and peer-review pairing). All unscored assignments belonging to the Absent Teacher are atomically reassigned to the Substitute on activation. The substitution ends via `endSubstitutionService`, which removes the `course_substitutes` row. See ADR 0007 rev 2.

### Awaiting approval

An `enrollment_status` value meaning the assigned Reviewer scored the applicant 3 or 4 (admit / strong admit) and the enrollment is now waiting on the **Admin's** final decision. Set automatically (see **Enrollment Evaluation**); the Admin resolves it to `approved` or `rejected`. Invitations are still only offered once status is `approved`.

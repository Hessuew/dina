# Context Map — Disciplers of Nations Academy (DINA)

Domain glossary for the DINA educational portal. Use these terms consistently across code, docs, and conversations.

---

## Core Terms

### Enrolment (public application)
A public-facing submission made by a prospective student via the `/enrolment` form. Contains personal background, story essays, and contact details. Stored in the `enrollments` table. Status progresses through `pending → under_review → approved/rejected/waitlisted/withdrawn/deferred`. Admin-managed; teachers see a **redacted enrollment view** (see below).

Spelling note: the user-facing route and utils dir use British "enrolment" (`/enrolment`, `src/utils/enrolment/`); the DB table and TypeScript types use American "enrollment" (`enrollments`, `EnrollmentRow`).

### Teacher-user
An authenticated platform user with `profiles.role = 'teacher'`. Can manage courses, view students, and view enrollments in read-only (redacted) mode. Distinct from the static landing-page Lecturer array.

### Lecturer (landing)
A marketing concept on the landing page (`/`). Defined as a hardcoded static array (`gemLecturers` in `src/components/landing/lecturers.tsx`). Tied to the "Twelve Stones / Twelve Lecturers" gemstone theme. These are **not** database records and are **not** the same as Teacher-users, even though the `profiles` table carries `lecturerTitle` and `gemstone` columns to support displaying teacher-users with the same styling if needed.

### Redacted Enrollment View
What a Teacher-user sees when viewing enrollments. Full applicant story (name, demographics, location, church context, essays, status) but with contact details and invitation tracking stripped server-side before the response leaves the server. Hidden fields: `email`, `phoneWhatsApp`, `invitationSent`, `invitationId`.

### Admin
A user with `profiles.role = 'admin'`. Full enrollment access: read all fields, change status, send invitation, delete. Only role that can manage users and invitations.

### Student
A user with `profiles.role = 'student'` (default). Enrolled via an admin-sent invitation after their enrollment submission is approved. Cannot view the enrollment review surface.

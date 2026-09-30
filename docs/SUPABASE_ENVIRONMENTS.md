# Supabase Environments

DINA uses two hosted Supabase environments. There is no local Supabase or Docker stack.

| Supabase branch | Application use                               | Data                     |
| --------------- | --------------------------------------------- | ------------------------ |
| `development`   | The app running at `http://localhost:3000`    | Synthetic test data only |
| Production      | The deployed application promoted from `main` | Production data          |

Each branch has separate Database, Auth, Storage, API credentials, and migration history. Never
copy production rows or Storage objects into `development`.

## Provision the persistent development branch

1. In the Supabase dashboard, create a **persistent** branch named `development` from the existing
   production project. Supabase branches are data-less, so production records are not copied.
2. Apply the existing Drizzle migration history after configuring the GitHub `development`
   environment below. The next `drizzle/**` change merged through the green main release gate
   performs the migration and seed; for initial provisioning, run the same migrate and seed
   commands with development credentials.
3. In the development branch's Auth URL configuration, set the site URL to
   `http://localhost:3000` and allow the app's localhost Auth callback URLs.
4. Mirror production Auth settings, while keeping branch-specific secrets separate. DINA's
   invitation OTP, password-reset, and email-change messages are sent through the application's
   Resend integration; the application does not currently expose Supabase magic-link login.
5. Copy the production Storage access policies into the development branch without copying
   objects. The seed workflow creates private `avatars`, `course-thumbnails`, `media-library`,
   and `media-thumbnails` buckets with MIME and size limits (ADR 0022).
6. Ensure `media-library.file_size_limit` is **100MB** and each image bucket limit is **2MB**.
   Confirm all four buckets are private in both development and production dashboards.

## Connect a local app safely

Copy `.env.example` to the ignored `.env`, then use only credentials from the `development`
branch:

- `SUPABASE_URL` and `VITE_SUPABASE_URL` use the development branch URL.
- `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_ANON_KEY`, and `SUPABASE_ANON_KEY` use development
  branch keys.
- `DATABASE_URL` uses the development branch database connection string.
- `SUPABASE_PRODUCTION_PROJECT_REF` contains the production project ref. The development seed
  refuses to run when `SUPABASE_URL` resolves to that ref.

Keep the browser and server URLs on the same Supabase branch. Mixing a development public URL with
a production service-role key or database connection can create cross-environment auth/profile
mismatches.

## Private Storage rollout

Deploy ADR 0022 application and migration changes before changing existing hosted buckets from
public to private. After deployment, update all four bucket settings and verify signed avatar,
course-thumbnail, library-file, and media-thumbnail reads. Reversing this order temporarily breaks
existing images because public object endpoints stop serving immediately.

## GitHub migration environments

Create GitHub environments named `development` and `production` with these values:

| Environment | Kind     | Name                              |
| ----------- | -------- | --------------------------------- |
| development | Secret   | `DATABASE_URL`                    |
| development | Secret   | `SUPABASE_SERVICE_ROLE_KEY`       |
| development | Secret   | `DEVELOPMENT_SEED_PASSWORD`       |
| development | Variable | `SUPABASE_URL`                    |
| development | Variable | `SUPABASE_PRODUCTION_PROJECT_REF` |
| development | Variable | `DEVELOPMENT_SEED_EMAIL`          |
| production  | Secret   | `DATABASE_URL`                    |

The serialized `Main release gate` runs the full integration suite and production build for every
runtime change. When its push diff includes `drizzle/**`, a dependent job migrates the hosted
development branch and idempotently creates its synthetic admin/profile and Storage buckets. A
manual `Main release gate` dispatch with `run_development_migration=true` retries that dependent
job after a reviewed main release.

`.github/workflows/production-release.yml` listens only for a successful
push-triggered main gate, creates an immutable UTC release tag, waits for the
protected `production` environment approval, replays the migration chain, and
applies pending migrations without seeding. A manual main-gate dispatch remains
a development migration retry and does not promote production. It then promotes
the exact tagged Worker version.
Manual dispatch requires the full SHA of a successful main gate and supports
`standard` or `gradual` rollout profiles. There is no long-lived production
branch and failed release tags remain for audit. Production promotion remains
disabled until the protected release-readiness controls are enabled; the full
procedure is in [`docs/plan/SAFE_DELIVERY.md`](plan/SAFE_DELIVERY.md).

Protect `main` and the `production` environment. Drizzle has no automatic
rollback: repair a failed forward migration with a new migration, or use the
[database backup and restore validation runbook](./database-backup-restore-runbook.md) for a
controlled restore.

## Backup and restore validation

The repository-owned [database backup and restore validation runbook](./database-backup-restore-runbook.md)
defines the monthly isolated-target drill, schema/index checks, application smoke checks, evidence
requirements, cleanup, and the incident-only same-project restore path. A database backup does not
restore Supabase Storage object bytes, so Storage recovery must be validated separately when it is
part of the recovery objective.

## Migration promotion

1. Generate a versioned migration with `bun run db:generate`.
2. Run `bun run test:integration`; this is the repository's no-Docker local migration test.
3. Merge to GitHub `main`; CI migrates the hosted Supabase `development` branch.
4. Test the localhost app against development Database, Auth, and Storage.
5. Promote the same validated SHA with the production release workflow; CI
   applies the same migration to Supabase production before Worker traffic moves.

For expand/contract rules, release evidence, application-versus-database
rollback decisions, and the production smoke checklist, follow
[`docs/plan/SAFE_DELIVERY.md`](plan/SAFE_DELIVERY.md). A green migration job
does not by itself prove that the deployed Worker is compatible with the new
schema.

Do not use the remote Supabase SQL/Table editors for schema changes. They bypass Drizzle migration
history and make the two environments drift.

Per-PR Supabase preview branches are intentionally deferred. Add them when parallel database work
or live review environments require isolated state; the persistent development branch is the
shared integration target until then.

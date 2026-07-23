# Supabase Environments

DINA uses two hosted Supabase environments. There is no local Supabase or Docker stack.

| Supabase branch     | Application use                            | Data                     |
| ------------------- | ------------------------------------------ | ------------------------ |
| `development`       | The app running at `http://localhost:3000` | Synthetic test data only |
| Production (`main`) | The deployed application                   | Production data          |

Each branch has separate Database, Auth, Storage, API credentials, and migration history. Never
copy production rows or Storage objects into `development`.

## Provision the persistent development branch

1. In the Supabase dashboard, create a **persistent** branch named `development` from the existing
   production project. Supabase branches are data-less, so production records are not copied.
2. Apply the existing Drizzle migration history by configuring the GitHub `development`
   environment below and manually running **Migrate Supabase development** once.
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

The development workflow runs after a Drizzle migration reaches GitHub `main`. It replays the real
migration chain through the PGlite integration suite, migrates the hosted development branch, then
idempotently creates its synthetic admin/profile and Storage buckets. The production workflow does
the same migration validation after a migration reaches the protected GitHub `production` branch,
but never seeds production.

Protect the GitHub `production` branch and the `production` environment. Drizzle has no automatic
rollback: repair a failed forward migration with a new migration, or restore a Supabase backup.

## Migration promotion

1. Generate a versioned migration with `bun run db:generate`.
2. Run `bun run test:integration`; this is the repository's no-Docker local migration test.
3. Merge to GitHub `main`; CI migrates the hosted Supabase `development` branch.
4. Test the localhost app against development Database, Auth, and Storage.
5. Promote the reviewed commit to GitHub `production`; CI applies the same migration to Supabase
   production.

Do not use the remote Supabase SQL/Table editors for schema changes. They bypass Drizzle migration
history and make the two environments drift.

Per-PR Supabase preview branches are intentionally deferred. Add them when parallel database work
or live review environments require isolated state; the persistent development branch is the
shared integration target until then.

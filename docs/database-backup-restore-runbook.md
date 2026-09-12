# Database Backup and Restore Validation Runbook

**Status:** Draft — procedure documented; first controlled drill pending  
**Scope:** Supabase Postgres production data and the DINA application recovery path

This runbook validates that a Supabase database backup can be restored into an
isolated target and that the restored schema is usable by the application. It
does not claim that Storage objects, Auth configuration, Realtime settings, or
external provider configuration are restored automatically.

## Safety rules

- Run the monthly drill against a new, access-restricted Supabase project or
  another explicitly disposable target. Never restore production data into the
  shared development branch.
- Do not run restore commands against production during a drill. A same-project
  restore is an incident action: declare the incident, record the expected
  downtime, and obtain the service owner's approval first.
- Treat a restored copy as production-sensitive data. Restrict access, do not
  connect the public hostname or production Worker to it, and delete it after
  evidence is captured.
- Keep database URLs, passwords, access tokens, dumps, row counts, and user
  data out of this repository, Notion notes, chat, and incident channels.
- A database restore is not a complete disaster-recovery test. Supabase
  database backups do not contain Storage object bytes; test Storage recovery
  separately when that capability is required.

## Monthly validation drill

### 1. Record the test boundary

Create a private drill record with:

- UTC start time, operator, source environment, and source project reference;
- selected daily-backup or PITR recovery timestamp;
- target project reference and planned deletion time;
- current production release and latest Drizzle migration filename; and
- the application checks that will be run after restore.

Record only references and pass/fail results in Notion. Do not attach a dump or
copy production data into the evidence record.

### 2. Confirm a usable recovery point

In the source Supabase project, open **Database → Backups** and confirm that a
recent daily backup exists. If Point-in-Time Recovery is enabled, confirm that
the requested recovery timestamp is inside the displayed recovery window.

Prefer **Restore to a New Project** when the project plan and backup type
provide it. This preserves the production project while exercising a real
restore. If the project only offers same-project restore, stop and schedule an
incident-approved window instead of improvising a destructive drill.

### 3. Restore into an isolated target

Use the Supabase Dashboard restore flow or the approved logical-backup fallback
below. Before connecting, verify that the target has:

- a different project reference from production;
- no production DNS, Worker, Hyperdrive, Auth, or webhook configuration;
- restricted membership and network access; and
- a target database connection string obtained from **Connect**, stored only in
  the secret manager or the current shell session.

The restore may make the target temporarily inaccessible. Record the elapsed
time, but do not treat provider UI completion alone as successful validation.

### 4. Verify schema and integrity

Run read-only checks against the restored target. The following checks cover
the tables and uniqueness guarantees that are part of DINA's current recovery
and idempotency safety model:

```sql
select
  to_regclass('public.profiles') is not null as profiles_present,
  to_regclass('public.courses') is not null as courses_present,
  to_regclass('public.lessons') is not null as lessons_present,
  to_regclass('public.enrollments') is not null as enrollments_present,
  to_regclass('public.submissions') is not null as submissions_present,
  to_regclass('public.lesson_progress') is not null as lesson_progress_present;

select
  exists (
    select 1 from pg_indexes
    where indexname = 'submissions_assignment_student_unique'
  ) as submission_idempotency_index_present,
  exists (
    select 1 from pg_indexes
    where indexname = 'lesson_progress_student_lesson_unique'
  ) as lesson_completion_index_present;
```

Also verify, without copying values into the evidence record:

- the expected latest migration/schema shape is present;
- foreign-key and unique-constraint checks complete successfully;
- representative table counts match the selected source snapshot, if policy
  permits recording that comparison as pass/fail; and
- no restore errors remain in the target's provider logs.

If any check fails, mark the drill failed, preserve the provider error
reference without copying raw error text into Notion, and escalate through the
data or production incident runbook. Do not repair the production database as
part of this drill.

### 5. Verify the application boundary

Use target-only credentials and a non-public local or preview configuration to
run the smallest representative checks:

1. `GET /healthz` returns HTTP 200.
2. `GET /readyz` returns HTTP 200 against the restored database.
3. One authenticated read path works for each role needed to validate the
   deployment (student, teacher, and admin where available).
4. One safe write/read-back path works in the disposable target, using
   synthetic records only.
5. No production hostname, email provider, WhatsApp provider, or scheduled
   job is enabled on the target.

Keep the target's `SUPABASE_URL`, database URL, service-role key, and public
keys separate from production. The repository's integration suite validates
the migration chain locally, but it is not a substitute for this hosted
restore drill.

### 6. Capture evidence and clean up

Record the following as pass/fail metadata in the Notion **Database backup and
restore validation** runbook row:

- backup or recovery timestamp and age at test time;
- restore method, target reference, and restore duration;
- schema/index, representative-data, health/readiness, and application smoke
  check results;
- whether Storage/Auth/Realtime configuration was separately checked;
- failure reference, if any; operator; and next review date.

After the evidence is written, revoke target credentials, delete the disposable
project and any local dump according to the team's retention policy, and verify
that the production environment variables and Worker bindings were never
changed. A successful drill changes the SLO from defined-but-unverified to
operational only after the evidence is reviewed.

## Logical-backup fallback

Use this only when the Dashboard restore path is unavailable and the team has
approved a disposable target. Supabase's CLI dump flow applies Supabase-specific
filtering; use it instead of a raw `pg_dump` against a managed project.

Run from a secret-managed shell with the Supabase CLI and its documented Docker
prerequisite. Never put the connection string in a committed script or paste
the command output into an issue:

```sh
supabase db dump --db-url "$SOURCE_DATABASE_URL" -f roles.sql --role-only
supabase db dump --db-url "$SOURCE_DATABASE_URL" -f schema.sql
supabase db dump --db-url "$SOURCE_DATABASE_URL" -f data.sql \
  --use-copy --data-only \
  -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

Restore `roles.sql`, `schema.sql`, and `data.sql` into the disposable target
only after reviewing the current Supabase restore guide and target privileges.
Re-run all checks above. Keep the dump encrypted and temporary; delete it as
part of cleanup.

## Incident restore path

For suspected data loss or corruption:

1. Declare the incident and stop risky deploys or migrations.
2. Preserve the current project state and identify the last known-good backup
   or PITR point.
3. Estimate data loss, downtime, and the impact of Storage objects separately.
4. Use **Database → Backups** and the nearest safe recovery point. Expect the
   project to be inaccessible during restoration.
5. After restoration, run `/healthz`, `/readyz`, representative authenticated
   reads, and a controlled write before reopening traffic.
6. Record the restore point, checks, affected records, and follow-up actions in
   the Notion incident and runbook records.

## Review cadence

Run this validation at least monthly while the database restore-confidence SLO
is active, after a material Supabase plan/backup change, and after a migration
that changes critical tables. The SLO remains `Needs data` until a dated drill
has passed and the evidence is linked.

## Official references

- [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase Restore to a New Project](https://supabase.com/docs/guides/platform/clone-project)
- [Supabase Backup and Restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)

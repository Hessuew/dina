# Drizzle Migrations

This directory contains database migrations for the Discipler's Institute portal.

## Files

### `0000_add_rls_policies.sql`

This migration adds Row Level Security (RLS) policies to all tables. It must be applied after the initial schema is created.

**What it does:**

- Enables RLS on all tables
- Creates security policies for each user role (student, teacher, admin)
- Enforces data access control at the database level

## Applying Migrations

### Option 1: Drizzle Kit (Recommended)

```bash
# Generate migrations from schema changes
bun db:generate

# Apply all pending migrations
bun db:migrate
```

### Option 2: Manual Application

1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Copy contents of `0000_add_rls_policies.sql`
4. Execute the SQL

## Hosted migration safety

`bun db:push` is a development-only escape hatch for a disposable database. Do
not use it against the hosted Supabase `development` or production branches:
it bypasses the committed migration history and can make the environments
drift.

For a hosted schema change, follow
[`docs/plan/SAFE_DELIVERY.md`](../docs/plan/SAFE_DELIVERY.md): generate a new
versioned migration, replay the real journal with `bun run test:integration`,
merge through the green main release gate, exercise the hosted development
branch, and promote the same reviewed commit to production. The GitHub
workflows run `bun db:migrate`; production is never seeded.

## Creating New Migrations

### Schema Changes

Edit `src/db/schema.ts`, then:

```bash
bun db:generate
```

This creates a new migration file automatically.

### RLS Policy Changes

1. Edit `0000_add_rls_policies.sql` directly, or
2. Create a new migration file: `0001_update_policies.sql`

### Custom SQL

For custom SQL (functions, triggers, etc.):

```bash
# Create new migration file
touch drizzle/0001_custom_functions.sql

# Add your SQL
# Then apply
bun db:migrate
```

## Testing and promoting migrations

### Local validation (no Docker)

```bash
bun run test:integration
```

The integration setup replays every SQL file listed in `drizzle/meta/_journal.json` against
PGlite. DINA does not run a local Supabase instance.

### Hosted environments

Merge the migration to GitHub `main` to apply it to the hosted Supabase `development` branch.
After testing the localhost app against that branch, promote the same commit to the protected
GitHub `production` branch. See [`../docs/SUPABASE_ENVIRONMENTS.md`](../docs/SUPABASE_ENVIRONMENTS.md)
and the [safe-delivery procedure](../docs/plan/SAFE_DELIVERY.md).

## Rollback

Drizzle doesn't have automatic rollback. Application rollback and database
rollback are separate decisions. To recover:

1. Redeploy the last known-good application version when the schema remains
   backward-compatible.
2. Prefer a new forward-fix migration for an applied additive schema change.
3. Use the controlled restore path in
   [`docs/database-backup-restore-runbook.md`](../docs/database-backup-restore-runbook.md)
   for corruption or destructive mistakes.

Example rollback migration:

```sql
-- 0002_rollback_policies.sql
DROP POLICY "policy_name" ON table_name;
```

## Best Practices

1. **Never edit applied migrations** - Create new ones instead
2. **Test locally first** - Always test migrations before production
3. **Backup before migrating** - Especially in production
4. **Keep migrations small** - One logical change per migration
5. **Document complex changes** - Add comments explaining why
6. **Use expand/contract** - Keep old and new application versions compatible
   until the rollback window has ended

## Troubleshooting

### Migration Fails

```bash
# Check migration status
bun db:studio

# View error details
# Fix the migration file
# Retry
bun db:migrate
```

### Policy Conflicts

```bash
# List existing policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

# Drop conflicting policy
DROP POLICY "policy_name" ON table_name;

# Reapply migration
bun db:migrate
```

## Resources

- [Drizzle Migrations Guide](https://orm.drizzle.team/docs/migrations)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Project RLS Guide](../DRIZZLE_RLS_GUIDE.md)

---

**Last Updated:** 2026-03-08

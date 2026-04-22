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

## Migration Order

1. **First**: Push Drizzle schema (`bun db:push`)
   - Creates all tables, enums, constraints
2. **Second**: Apply RLS policies (`bun db:migrate`)
   - Adds security policies to tables

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

## Testing Migrations

### Local Testing

```bash
# Reset database
bun db:push --force

# Apply migrations
bun db:migrate

# Verify with Drizzle Studio
bun db:studio
```

### Production

```bash
# Backup database first!

# Apply migrations
bun db:migrate

# Verify policies work
# Test with different user roles
```

## Rollback

Drizzle doesn't have automatic rollback. To rollback:

1. Create a new migration that reverses changes
2. Or restore from database backup

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

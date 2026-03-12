# Drizzle + RLS (Row Level Security) Guide

## Overview

This project uses **Drizzle ORM** with **native RLS support** for schema management and data access control. All RLS policies are defined directly in the Drizzle schema using `pgPolicy`, making security policies part of your type-safe schema definition.

## Architecture

### Single Source of Truth

**Drizzle Schema** (`src/db/schema.ts`) - Defines:

- Tables, columns, and types
- Foreign key relationships
- RLS policies using `pgPolicy`
- Supabase role integration

All security policies are co-located with table definitions for better maintainability.

## Setup Process

### Option 1: Push Schema (Development)

For quick development iteration:

```bash
bun db:push
```

This automatically creates:

- All tables with RLS enabled
- All RLS policies
- Enums and constraints
- Foreign keys and indexes

### Option 2: Migrations (Production)

For production deployments:

```bash
# Generate migration from schema
bun db:generate

# Review the generated SQL in drizzle/ folder

# Apply migration
bun db:migrate
```

Both options create the same database structure with RLS policies.

## How RLS is Defined

### Example: Profiles Table

```typescript
import { pgTable, uuid, text, pgPolicy } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    role: userRoleEnum("role").notNull(),
    // ... other columns
  },
  (table) => [
    // Users can view their own profile
    pgPolicy("users_view_own_profile", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.id}`,
    }),

    // Users can update their own profile
    pgPolicy("users_update_own_profile", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.id}`,
    }),

    // Admins can view all profiles
    pgPolicy("admins_view_all_profiles", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM profiles WHERE id = ${authUid} AND role = 'admin')`,
    }),
  ],
);
```

### Key Components

- **`pgPolicy(name, options)`** - Defines a policy
- **`authenticatedRole`** - Supabase's authenticated role (from `drizzle-orm/supabase`)
- **`authUid`** - Supabase's `auth.uid()` function
- **`for`** - Operation type: `'select'`, `'insert'`, `'update'`, `'delete'`, or `'all'`
- **`to`** - Role the policy applies to
- **`using`** - Condition for row visibility
- **`withCheck`** - Condition for row modification (INSERT/UPDATE)

## RLS Policies Overview

### Profiles Table

**Students:**

- ✅ View their own profile
- ✅ Update their own profile

**Teachers:**

- ✅ Same as students

**Admins:**

- ✅ View all profiles
- ✅ Manage all profiles

### Courses Table

**Students:**

- ✅ View published courses

**Teachers:**

- ✅ Manage their own courses (CRUD)
- ✅ View published courses

**Admins:**

- ✅ Manage all courses

### Enrollments Table

**Students:**

- ✅ View their own enrollments
- ✅ Request enrollment (insert with `pending` status)

**Teachers:**

- ✅ View enrollments for their courses

**Admins:**

- ✅ Approve/reject enrollments
- ✅ Manage all enrollments

### Assignments & Submissions

**Students:**

- ✅ View assignments for enrolled courses
- ✅ Create/update their own submissions
- ✅ View their own grades

**Teachers:**

- ✅ Create assignments for their courses
- ✅ View all submissions for their courses
- ✅ Grade submissions

**Admins:**

- ✅ Full access to all assignments and submissions

### Inquiries

**Students:**

- ✅ Create inquiries for enrolled courses
- ✅ View their own inquiries and responses

**Teachers:**

- ✅ View inquiries for their courses
- ✅ Respond to inquiries
- ✅ Update inquiry status

**Admins:**

- ✅ Manage all inquiries

## Testing RLS Policies

### Test as Student

```typescript
import { db, enrollments } from "@/db";
import { eq } from "drizzle-orm";

// This will only return the student's own enrollments
const myEnrollments = await db
  .select()
  .from(enrollments)
  .where(eq(enrollments.studentId, userId));

// This will fail (RLS blocks it)
const allEnrollments = await db.select().from(enrollments);
```

### Test as Teacher

```typescript
import { db, courses } from "@/db";
import { eq } from "drizzle-orm";

// Teacher can manage their own courses
const myCourses = await db
  .select()
  .from(courses)
  .where(eq(courses.teacherId, userId));

// Can view course enrollments
const courseEnrollments = await db.query.courses.findFirst({
  where: (courses, { eq }) => eq(courses.teacherId, userId),
  with: {
    enrollments: true,
  },
});
```

### Test as Admin

```typescript
import { db, profiles } from "@/db";

// Admin can view all profiles
const allProfiles = await db.select().from(profiles);

// Admin can update any profile
await db
  .update(profiles)
  .set({ role: "teacher" })
  .where(eq(profiles.id, someUserId));
```

## Important Security Notes

### 1. Server-Side Enforcement

RLS policies are enforced at the **database level**, but you should still validate permissions in your server functions:

```typescript
export const approveEnrollment = createServerFn({ method: "POST" })
  .inputValidator((d: { enrollmentId: string }) => d)
  .handler(async ({ data, context }) => {
    const user = context.user;

    // Check if user is admin
    if (user?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    // RLS will also enforce this, but explicit check is good practice
    await db
      .update(enrollments)
      .set({ status: "active", approvedBy: user.id })
      .where(eq(enrollments.id, data.enrollmentId));
  });
```

### 2. Auth Context

RLS policies use `auth.uid()` which comes from Supabase Auth. Ensure:

- User is authenticated
- JWT token is valid
- `auth.uid()` matches the user's actual ID

### 3. Direct Database Access

When using Drizzle with a direct database connection (not through Supabase client), RLS policies **still apply** if:

- Connection uses the same PostgreSQL role
- `auth.uid()` is set in the session

For service role access (bypassing RLS), use a different connection string.

## Modifying RLS Policies

### Adding a New Policy

1. Edit `src/db/schema.ts`
2. Add policy to the table definition:

```typescript
export const myTable = pgTable(
  "my_table",
  {
    // columns...
  },
  (table) => [
    // existing policies...

    // Add new policy
    pgPolicy("my_new_policy", {
      for: "select",
      to: authenticatedRole,
      using: sql`your_condition`,
    }),
  ],
);
```

3. Generate and apply migration:

```bash
bun db:generate  # Creates migration
bun db:migrate   # Applies it
```

### Updating Existing Policy

1. Edit the policy in `src/db/schema.ts`
2. Modify the `using` or `withCheck` conditions
3. Generate new migration:

```bash
bun db:generate
bun db:migrate
```

Drizzle will automatically drop the old policy and create the updated one.

### Testing Policy Changes

```sql
-- Test as specific user
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-here"}';

-- Run your query
SELECT * FROM enrollments;

-- Reset
RESET role;
```

## Common RLS Patterns

### Pattern 1: Own Records

```sql
CREATE POLICY "users_manage_own" ON table_name
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### Pattern 2: Role-Based Access

```sql
CREATE POLICY "admins_full_access" ON table_name
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### Pattern 3: Related Records

```sql
CREATE POLICY "view_enrolled_content" ON lessons
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN courses c ON c.id = m.course_id
      JOIN enrollments e ON e.course_id = c.id
      WHERE m.id = lessons.module_id
      AND e.student_id = auth.uid()
      AND e.status = 'active'
    )
  );
```

### Pattern 4: Conditional Access

```sql
CREATE POLICY "view_published_or_own" ON courses
  FOR SELECT TO authenticated
  USING (
    is_published = true
    OR teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## Troubleshooting

### Policy Not Working

1. **Check RLS is enabled:**

   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';
   ```

2. **List policies:**

   ```sql
   SELECT * FROM pg_policies
   WHERE tablename = 'your_table';
   ```

3. **Test policy logic:**
   ```sql
   -- Manually test the USING clause
   SELECT * FROM your_table
   WHERE your_policy_condition;
   ```

### Permission Denied Errors

- Verify user is authenticated
- Check `auth.uid()` returns correct user ID
- Ensure policy covers the operation (SELECT, INSERT, UPDATE, DELETE)
- Check if `WITH CHECK` clause is needed for INSERT/UPDATE

### Performance Issues

- Add indexes on columns used in policy conditions
- Avoid complex subqueries in policies
- Consider materialized views for complex access patterns

```sql
-- Add index for policy performance
CREATE INDEX idx_enrollments_student_status
  ON enrollments(student_id, status);
```

## Migration Workflow

### Development

```bash
# 1. Update Drizzle schema
# Edit src/db/schema.ts

# 2. Push schema changes
bun db:push

# 3. Update RLS policies if needed
# Edit drizzle/0000_add_rls_policies.sql

# 4. Apply RLS changes
# Run in Supabase SQL Editor
```

### Production

```bash
# 1. Generate migration
bun db:generate

# 2. Review migration files
# Check drizzle/ directory

# 3. Apply migrations
bun db:migrate

# 4. Verify in production
# Test with different user roles
```

## Best Practices

### 1. Principle of Least Privilege

Grant minimum necessary permissions:

```sql
-- ❌ Too permissive
CREATE POLICY "allow_all" ON table_name
  FOR ALL TO authenticated
  USING (true);

-- ✅ Specific and restrictive
CREATE POLICY "students_view_enrolled" ON table_name
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE student_id = auth.uid() AND course_id = table_name.course_id
    )
  );
```

### 2. Explicit Policy Names

Use descriptive names that explain what the policy does:

```sql
-- ❌ Vague
CREATE POLICY "policy1" ON courses...

-- ✅ Clear
CREATE POLICY "teachers_manage_own_courses" ON courses...
```

### 3. Separate Read and Write

Create separate policies for different operations:

```sql
-- Read policy
CREATE POLICY "students_view_grades" ON submissions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Write policy
CREATE POLICY "students_submit_assignments" ON submissions
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND status = 'draft');
```

### 4. Document Complex Policies

Add comments explaining complex logic:

```sql
-- Allow students to view lessons only if:
-- 1. They are enrolled in the course
-- 2. Enrollment status is 'active'
-- 3. Course is published
CREATE POLICY "students_view_active_course_lessons" ON lessons
  FOR SELECT TO authenticated
  USING (...);
```

## Resources

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Drizzle ORM Documentation](https://orm.drizzle.team)

---

**Last Updated:** 2026-03-08  
**RLS Policies:** Complete for all tables

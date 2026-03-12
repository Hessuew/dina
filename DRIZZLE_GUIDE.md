# Drizzle ORM Integration Guide

## Overview

This project now uses **Drizzle ORM** for type-safe database operations instead of raw SQL queries. Drizzle provides excellent TypeScript support, automatic migrations, and a developer-friendly query API.

## Why Drizzle?

- ✅ **Type Safety** - Full TypeScript inference for queries and results
- ✅ **Better DX** - Intuitive API, no SQL string concatenation
- ✅ **Automatic Migrations** - Generate migrations from schema changes
- ✅ **Performance** - Lightweight, minimal overhead
- ✅ **Relational Queries** - Easy joins and nested data fetching
- ✅ **Drizzle Studio** - Visual database browser

## Setup

### 1. Install Dependencies

```bash
bun install
```

This installs:

- `drizzle-orm` - The ORM library
- `postgres` - PostgreSQL client
- `drizzle-kit` - CLI for migrations and studio
- `@types/node` - Node.js type definitions

### 2. Configure Environment

Add your database URL to `.env`:

```env
DATABASE_URL=postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres
```

Get this from: **Supabase Dashboard > Project Settings > Database > Connection String (Direct)**

### 3. Push Schema to Database

```bash
bun db:push
```

This creates all tables, enums, and indexes in your Supabase database.

## Project Structure

```
src/db/
├── schema.ts       # Drizzle schema definitions
└── index.ts        # Database client and exports

drizzle.config.ts   # Drizzle Kit configuration
drizzle/            # Generated migration files (auto-created)
```

## Schema Definition

The schema in `src/db/schema.ts` matches your database exactly:

```typescript
import { db, profiles, courses, enrollments } from "@/db";

// All tables are fully typed
const allProfiles = await db.select().from(profiles);
// Type: Profile[]
```

### Available Tables

- `profiles` - User profiles with roles
- `courses` - Course catalog
- `modules` - Course modules
- `lessons` - Individual lessons
- `enrollments` - Student enrollments
- `lessonProgress` - Progress tracking
- `assignments` - Course assignments
- `submissions` - Student submissions
- `inquiries` - Student inquiries
- `inquiryResponses` - Inquiry responses
- `announcements` - Announcements
- `mediaLibrary` - Media files
- `calendarEvents` - Calendar events
- `notifications` - User notifications

## Query Examples

### Basic Queries

```typescript
import { db, profiles, courses } from "@/db";
import { eq, and, desc } from "drizzle-orm";

// Select all
const allCourses = await db.select().from(courses);

// Select with where
const publishedCourses = await db
  .select()
  .from(courses)
  .where(eq(courses.isPublished, true));

// Select specific fields
const courseNames = await db
  .select({ id: courses.id, title: courses.title })
  .from(courses);

// Select with multiple conditions
const studentEnrollments = await db
  .select()
  .from(enrollments)
  .where(
    and(eq(enrollments.studentId, userId), eq(enrollments.status, "active")),
  );

// Order by
const recentCourses = await db
  .select()
  .from(courses)
  .orderBy(desc(courses.createdAt))
  .limit(10);
```

### Joins

```typescript
import { db, enrollments, courses, profiles } from "@/db";
import { eq } from "drizzle-orm";

// Join enrollments with courses
const studentCourses = await db
  .select({
    enrollment: enrollments,
    course: courses,
  })
  .from(enrollments)
  .innerJoin(courses, eq(enrollments.courseId, courses.id))
  .where(eq(enrollments.studentId, userId));

// Multiple joins
const enrollmentsWithDetails = await db
  .select({
    enrollment: enrollments,
    course: courses,
    student: profiles,
  })
  .from(enrollments)
  .innerJoin(courses, eq(enrollments.courseId, courses.id))
  .innerJoin(profiles, eq(enrollments.studentId, profiles.id));
```

### Relational Queries (Recommended)

Drizzle's relational query API is cleaner for nested data:

```typescript
import { db } from "@/db";

// Get course with all modules and lessons
const courseWithContent = await db.query.courses.findFirst({
  where: (courses, { eq }) => eq(courses.id, courseId),
  with: {
    modules: {
      with: {
        lessons: true,
      },
    },
  },
});

// Get student with enrollments and courses
const studentData = await db.query.profiles.findFirst({
  where: (profiles, { eq }) => eq(profiles.id, studentId),
  with: {
    enrollments: {
      with: {
        course: true,
      },
    },
  },
});
```

### Insert

```typescript
import { db, courses } from "@/db";

// Insert single record
const [newCourse] = await db
  .insert(courses)
  .values({
    title: "Introduction to Theology",
    description: "A foundational course...",
    teacherId: userId,
    isPublished: false,
  })
  .returning();

// Insert multiple records
await db.insert(modules).values([
  { courseId: courseId, title: "Module 1", orderIndex: 0 },
  { courseId: courseId, title: "Module 2", orderIndex: 1 },
]);
```

### Update

```typescript
import { db, enrollments } from "@/db";
import { eq } from "drizzle-orm";

// Update single record
await db
  .update(enrollments)
  .set({
    status: "active",
    approvedBy: adminId,
    approvedAt: new Date(),
  })
  .where(eq(enrollments.id, enrollmentId));

// Update with conditions
await db
  .update(submissions)
  .set({ status: "graded", grade: 95, gradedAt: new Date() })
  .where(
    and(eq(submissions.id, submissionId), eq(submissions.status, "submitted")),
  );
```

### Delete

```typescript
import { db, notifications } from "@/db";
import { eq, lt } from "drizzle-orm";

// Delete single record
await db.delete(notifications).where(eq(notifications.id, notificationId));

// Delete with conditions (e.g., old notifications)
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
await db
  .delete(notifications)
  .where(
    and(
      eq(notifications.isRead, true),
      lt(notifications.createdAt, thirtyDaysAgo),
    ),
  );
```

### Aggregations

```typescript
import { db, enrollments, submissions } from "@/db";
import { eq, count, avg, sql } from "drizzle-orm";

// Count enrollments
const enrollmentCount = await db
  .select({ count: count() })
  .from(enrollments)
  .where(eq(enrollments.courseId, courseId));

// Average grade
const avgGrade = await db
  .select({ average: avg(submissions.grade) })
  .from(submissions)
  .where(eq(submissions.studentId, studentId));

// Custom SQL
const stats = await db
  .select({
    total: count(),
    avgGrade: avg(submissions.grade),
    maxGrade: sql<number>`max(${submissions.grade})`,
  })
  .from(submissions)
  .where(eq(submissions.assignmentId, assignmentId));
```

## Using in Server Functions

```typescript
import { createServerFn } from "@tanstack/react-start";
import { db, courses, enrollments } from "@/db";
import { eq, and } from "drizzle-orm";

export const getStudentCourses = createServerFn({ method: "GET" }).handler(
  async ({ context }) => {
    const userId = context.user?.id;
    if (!userId) throw new Error("Not authenticated");

    const studentCourses = await db
      .select({
        enrollment: enrollments,
        course: courses,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(
        and(
          eq(enrollments.studentId, userId),
          eq(enrollments.status, "active"),
        ),
      );

    return studentCourses;
  },
);
```

## Migrations

### Generate Migration

When you change the schema:

```bash
bun db:generate
```

This creates a migration file in `drizzle/` folder.

### Apply Migrations

```bash
bun db:migrate
```

### Push Schema (Development)

For quick iteration during development:

```bash
bun db:push
```

This pushes schema changes directly without creating migration files.

## Drizzle Studio

Visual database browser:

```bash
bun db:studio
```

Opens at `https://local.drizzle.studio`

Features:

- Browse all tables
- View and edit data
- Run queries
- Inspect relationships

## Helper Functions

### Letter Grade Calculation

```typescript
import { getLetterGrade } from "@/db";

const letterGrade = getLetterGrade(85); // Returns 'B'
```

## Best Practices

### 1. Use Relational Queries for Nested Data

```typescript
// ✅ Good - Clean and type-safe
const course = await db.query.courses.findFirst({
  with: { modules: { with: { lessons: true } } }
})

// ❌ Avoid - Manual joins for nested data
const course = await db.select()...innerJoin()...innerJoin()
```

### 2. Use Prepared Statements for Repeated Queries

```typescript
const getCourseById = db
  .select()
  .from(courses)
  .where(eq(courses.id, sql.placeholder("id")))
  .prepare("get_course_by_id");

// Reuse efficiently
const course1 = await getCourseById.execute({ id: "uuid-1" });
const course2 = await getCourseById.execute({ id: "uuid-2" });
```

### 3. Use Transactions for Related Operations

```typescript
await db.transaction(async (tx) => {
  // Create course
  const [course] = await tx.insert(courses).values({...}).returning()

  // Create modules
  await tx.insert(modules).values([
    { courseId: course.id, title: 'Module 1' },
    { courseId: course.id, title: 'Module 2' },
  ])
})
```

### 4. Type-Safe Filters

```typescript
import { eq, and, or, gt, lt, like } from "drizzle-orm";

// Use operators for type safety
await db
  .select()
  .from(courses)
  .where(
    and(
      eq(courses.isPublished, true),
      like(courses.title, "%theology%"),
      gt(courses.createdAt, new Date("2024-01-01")),
    ),
  );
```

## Common Patterns

### Pagination

```typescript
const page = 1;
const pageSize = 10;

const courses = await db
  .select()
  .from(courses)
  .limit(pageSize)
  .offset((page - 1) * pageSize);
```

### Search

```typescript
import { like, or } from "drizzle-orm";

const searchTerm = "%theology%";
const results = await db
  .select()
  .from(courses)
  .where(
    or(like(courses.title, searchTerm), like(courses.description, searchTerm)),
  );
```

### Conditional Queries

```typescript
let query = db.select().from(courses);

if (isPublished !== undefined) {
  query = query.where(eq(courses.isPublished, isPublished));
}

if (teacherId) {
  query = query.where(eq(courses.teacherId, teacherId));
}

const results = await query;
```

## Troubleshooting

### Connection Issues

Ensure `DATABASE_URL` is correct in `.env`:

- Use **Direct** connection string, not pooled
- Include password
- Check Supabase project is active

### Type Errors

Run `pnpm db:generate` after schema changes to regenerate types.

### Migration Conflicts

If migrations conflict, you can reset:

1. Drop all tables in Supabase SQL Editor
2. Run `pnpm db:push` to recreate from schema

## Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [Drizzle with PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
- [Relational Queries](https://orm.drizzle.team/docs/rqb)
- [Drizzle Studio](https://orm.drizzle.team/drizzle-studio/overview)

---

**Last Updated:** 2026-02-28  
**Drizzle Version:** 0.36.4

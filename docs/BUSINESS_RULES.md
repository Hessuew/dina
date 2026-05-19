# Discipler's Institute for Nations - Project Rules & Guidelines

## Project Overview

**Project Name:** Discipler's Institute Educational Portal  
**Tech Stack:** TanStack Start + React 19 + Supabase + TailwindCSS v4  
**Purpose:** Modern educational platform for students, teachers, and administrators

---

## Architecture Decisions

### Frontend Architecture

- **Framework:** TanStack Start with React 19
- **Routing:** TanStack Router (file-based routing)
- **Styling:** TailwindCSS v4 with custom design system
- **UI Components:** shadcn/ui for accessible, modern components
- **Icons:** Lucide React
- **Type Safety:** TypeScript (strict mode)

### Backend Architecture

- **Authentication:** Supabase for user auth + session mgmt
- **Database:** Supabase PostgreSQL via Drizzle ORM
  - Connection: Supabase connection pooler for perf
  - Authorization: App-level checks (no RLS)
  - Storage: Supabase Storage for media
  - Real-time: Supabase Realtime subscriptions (when needed)
- **ORM:** Drizzle ORM for type-safe DB queries
- **Server Functions:** TanStack Start server fns for API logic
- **State Management:**
  - Server state via TanStack Start
  - Client state via React Context where needed

### Database Design Principles

- **Authorization:** App-level using Supabase user IDs
- **RBAC:** Implemented in app code
- UUID primary keys (Supabase user IDs for profiles)
- Include `created_at` + `updated_at` timestamps
- Soft deletes where appropriate (`deleted_at` field)
- Normalize data, denormalize for perf where needed

### Authorization Pattern

All auth handled in app code via helpers from `src/utils/auth.ts`:

- **Route Protection:** Use `beforeLoad` for auth/authz checks
- **Server Functions:** Call `getCurrentUser()` at start of protected fns
- **Role Checks:** Use `requireRole()`, `requireAdmin()`, `requireTeacher()`
- **Resource Access:** Use `requireTeacherOfCourse()` + feature-specific checks
- **Query Filtering:** Always filter by user ownership (`studentId`, `teacherId`)

**Example - Protected Route:**

```typescript
export const Route = createFileRoute('/_authed/courses/$courseId')({
  beforeLoad: async ({ params }) => {
    const user = await getCurrentUser()
    // Add any feature-specific access checks here (e.g. course access)
  },
})
```

**Example - Server Function:**

```typescript
const getMyEnrollments = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getCurrentUser()
  return db.query.enrollments.findMany({
    where: eq(enrollments.studentId, user.id),
  })
})
```

---

## Coding Standards

### TypeScript

- Strict mode
- No `any` — use `unknown` or proper types
- Interfaces for all data structures
- Type inference where obvious
- Export types alongside components/functions

### React Components

- Functional components only (no class components)
- Hooks for state + side effects
- One component per file (except small related)
- Props interfaces above component
- Prefer explicit typing over `React.FC`

### File Naming Conventions

- Components: PascalCase (`StudentDashboard.tsx`)
- Utilities: camelCase (`formatDate.ts`)
- Routes: kebab-case per TanStack Router conventions
- Types: PascalCase + `.types.ts` suffix
- Constants: UPPER_SNAKE_CASE in `constants.ts`

### Code Organization

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── shared/         # Shared business components
│   └── layouts/        # Layout components
├── routes/             # TanStack Router routes
│   ├── _authed/       # Protected routes
│   ├── student/       # Student portal routes
│   ├── teacher/       # Teacher portal routes
│   └── admin/         # Admin portal routes
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
│   ├── supabase.ts    # Supabase client
│   ├── auth.ts        # Auth helpers
│   └── validators.ts  # Validation functions
├── types/              # TypeScript type definitions
├── lib/                # Third-party library configurations
├── styles/             # Global styles
└── constants/          # Application constants
```

### Styling Guidelines

- TailwindCSS utility classes
- Custom components for repeated patterns
- CSS variables for theming
- Mobile-first responsive design
- Dark mode from start
- Consistent spacing (Tailwind spacing scale)

### Component Patterns

```typescript
// Good component structure
interface StudentCardProps {
  student: Student
  onSelect?: (id: string) => void
}

export function StudentCard({ student, onSelect }: StudentCardProps) {
  // Hooks at the top
  const [isExpanded, setIsExpanded] = useState(false)

  // Event handlers
  const handleClick = () => {
    onSelect?.(student.id)
  }

  // Render
  return (
    <div className="...">
      {/* Component JSX */}
    </div>
  )
}
```

---

## User Roles & Permissions

### Role Hierarchy

1. **Visitor** - Unauthenticated (public only)
2. **Student** - Authenticated (course access, inquiries)
3. **Teacher** - Authenticated (course mgmt, student mgmt)
4. **Admin** - Full access (user mgmt, system settings)

### Permission Matrix

| Feature           | Visitor | Student | Teacher | Admin |
| ----------------- | ------- | ------- | ------- | ----- |
| Landing Page      | ✓       | ✓       | ✓       | ✓     |
| View Courses      | ✗       | ✓       | ✓       | ✓     |
| Submit Inquiries  | ✗       | ✓       | ✗       | ✓     |
| Manage Courses    | ✗       | ✗       | ✓       | ✓     |
| View All Students | ✗       | ✗       | ✓       | ✓     |
| User Management   | ✗       | ✗       | ✗       | ✓     |

---

## Database Schema Standards

### Naming Conventions

- Tables: plural snake_case (`courses`, `user_enrollments`)
- Columns: snake_case (`created_at`, `user_id`)
- Foreign keys: `{table}_id` (`course_id`, `user_id`)
- Junction tables: `{table1}_{table2}` (`course_students`)

### Standard Fields

All tables include:

```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

---

## API & Server Functions

### Server Function Patterns

```typescript
// Always authenticate and authorize in server functions
const getStudentCourses = createServerFn({ method: 'GET' }).handler(
  async () => {
    // 1. Authenticate
    const user = await getCurrentUser()

    // 2. Query with user filter
    const enrollments = await db.query.enrollments.findMany({
      where: eq(enrollments.studentId, user.id),
      with: { course: true },
    })

    return enrollments
  },
)

// Teacher-only server function
const updateCourse = createServerFn({ method: 'POST' }).handler(
  async ({ courseId, data }) => {
    const user = await getCurrentUser()

    // Verify teacher owns this course
    await requireTeacherOfCourse(user.id, courseId)

    // Update course
    return db.update(courses).set(data).where(eq(courses.id, courseId))
  },
)
```

### Error Handling

- Handle auth errors gracefully
- Return user-friendly error messages
- Log errors for debug (not sensitive data)
- try-catch for async ops
- Validate input before processing
- Throw descriptive errors from auth utils

---

## Security Best Practices

### Authentication

- Supabase for all auth
- Supabase handles email verification, password rules, session mgmt
- Sessions via HTTP-only cookies by Supabase
- Always call `getCurrentUser()` in protected server fns

### Authorization

- **Always check authz on server** — never trust client-side
- Use auth utils from `src/utils/auth.ts`
- Filter all DB queries by user ownership
- Validate permissions before any mutation
- Use `beforeLoad` to protect route trees
- Admin ops: `requireAdmin(userId)`
- Teacher ops: `requireTeacherOfCourse(userId, courseId)`
- Student ops: filter by `studentId = userId`

### Data Protection

- Sanitize user inputs
- Parameterized queries (drizzle handles this)
- Rate limiting for sensitive ops
- Encrypt sensitive data at rest
- HTTPS only

---

## Performance Guidelines

### Optimization Strategies

- Lazy load routes + heavy components
- Pagination for large lists
- Supabase indexes for frequently queried fields
- Cache static data where appropriate
- Optimize images (WebP, proper sizing)
- Minimize bundle size (code splitting)

### Real-time Subscriptions

- Subscribe only to necessary data
- Unsubscribe on component unmount
- Use filters to reduce data transfer
- Batch updates where possible

---

## Testing Strategy

### Testing Priorities (Future)

1. Critical user flows (auth, enrollment, course access)
2. Payment processing (if implemented)
3. Data integrity (RLS policies, permissions)
4. Form validations
5. API endpoints

### Testing Tools

- Vitest for unit tests
- React Testing Library for component tests
- Playwright for E2E
- Supabase local dev for DB tests

---

## Git Workflow

### Branch Strategy

- `main` - Production-ready
- `develop` - Dev branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

### Commit Messages

Follow conventional commits:

```
feat: add student dashboard
fix: resolve login redirect issue
docs: update API documentation
style: format code with prettier
refactor: restructure course components
test: add enrollment flow tests
```

---

## Environment Variables

Required:

```env
# Supabase
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key

# Optional
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (admin operations only)
```

---

## Accessibility Requirements

- Semantic HTML
- ARIA labels where needed
- Keyboard navigation
- Screen reader compat
- Sufficient color contrast (WCAG AA)
- Focus indicators
- Alt text for images
- Form labels + error messages

---

## Development Workflow

### Before Starting a Feature

1. Review plan doc
2. Check DB schema requirements
3. Create necessary types
4. Implement RLS policies
5. Build UI components
6. Test functionality
7. Update docs

---

## Documentation Requirements

### Code Documentation

- JSDoc for complex functions
- README per major feature
- API docs for server functions
- DB schema docs

---

## Support & Maintenance

### Monitoring

- Error tracking (future: Sentry)
- Perf monitoring
- User analytics
- DB performance

---

_Last Updated: 2026-02-28_
_Version: 1.0.0_
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

- **Authentication:** Clerk for user authentication and session management
- **Database:** Supabase PostgreSQL (accessed via Drizzle ORM)
  - Connection: Supabase connection pooler for performance
  - Authorization: Application-level checks (no RLS)
  - Storage: Supabase Storage for media files
  - Real-time: Supabase Realtime subscriptions (when needed)
- **ORM:** Drizzle ORM for type-safe database queries
- **Server Functions:** TanStack Start server functions for API logic
- **State Management:**
  - Server state via TanStack Start
  - Client state via React Context where needed

### Database Design Principles

- **Authorization:** App-level authorization using Clerk user IDs
- **Role-based access control (RBAC):** Implemented in application code
- Use UUID for primary keys (Clerk user IDs for profiles)
- Include `created_at` and `updated_at` timestamps
- Soft deletes where appropriate (use `deleted_at` field)
- Normalize data but denormalize for performance where needed

### Authorization Pattern

All authorization is handled in application code using helper functions from `src/utils/auth.ts`:

- **Route Protection:** Use `beforeLoad` to check authentication and authorization
- **Server Functions:** Call `requireAuth()` at the start of server functions
- **Role Checks:** Use `requireRole()`, `requireAdmin()`, `requireTeacher()`
- **Resource Access:** Use `requireTeacherOfCourse()`, `requireEnrolledInCourse()`
- **Query Filtering:** Always filter queries by user ownership (e.g., `studentId`, `teacherId`)

**Example - Protected Route:**

```typescript
export const Route = createFileRoute('/_authed/courses/$courseId')({
  beforeLoad: async ({ params }) => {
    const userId = await requireAuth()
    await requireEnrolledInCourse(userId, params.courseId)
  },
})
```

**Example - Server Function:**

```typescript
const getMyEnrollments = createServerFn({ method: 'GET' }).handler(async () => {
  const userId = await requireAuth()
  return db.query.enrollments.findMany({
    where: eq(enrollments.studentId, userId),
  })
})
```

---

## Coding Standards

### TypeScript

- Use strict mode
- No `any` types - use `unknown` or proper types
- Define interfaces for all data structures
- Use type inference where obvious
- Export types alongside components/functions

### React Components

- Functional components only (no class components)
- Use hooks for state and side effects
- One component per file (except small related components)
- Props interfaces defined above component
- Use `React.FC` sparingly, prefer explicit typing

### File Naming Conventions

- Components: PascalCase (e.g., `StudentDashboard.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Routes: kebab-case following TanStack Router conventions
- Types: PascalCase with `.types.ts` suffix
- Constants: UPPER_SNAKE_CASE in `constants.ts` files

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

- Use TailwindCSS utility classes
- Create custom components for repeated patterns
- Use CSS variables for theming
- Mobile-first responsive design
- Support dark mode from the start
- Maintain consistent spacing (use Tailwind spacing scale)

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

1. **Visitor** - Unauthenticated users (public access only)
2. **Student** - Authenticated students (course access, inquiries)
3. **Teacher** - Authenticated teachers (course management, student management)
4. **Admin** - Full system access (user management, system settings)

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

- Tables: plural, snake_case (e.g., `courses`, `user_enrollments`)
- Columns: snake_case (e.g., `created_at`, `user_id`)
- Foreign keys: `{table}_id` (e.g., `course_id`, `user_id`)
- Junction tables: `{table1}_{table2}` (e.g., `course_students`)

### Standard Fields

All tables should include:

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
    const userId = await requireAuth()

    // 2. Query with user filter
    const enrollments = await db.query.enrollments.findMany({
      where: eq(enrollments.studentId, userId),
      with: { course: true },
    })

    return enrollments
  },
)

// Teacher-only server function
const updateCourse = createServerFn({ method: 'POST' }).handler(
  async ({ courseId, data }) => {
    const userId = await requireAuth()

    // Verify teacher owns this course
    await requireTeacherOfCourse(userId, courseId)

    // Update course
    return db.update(courses).set(data).where(eq(courses.id, courseId))
  },
)
```

### Error Handling

- Always handle authentication errors gracefully
- Return user-friendly error messages
- Log errors for debugging (but not sensitive data)
- Use try-catch for async operations
- Validate input data before processing
- Throw descriptive errors from auth utilities

---

## Security Best Practices

### Authentication

- Use Clerk for all authentication
- Clerk handles email verification, password requirements, and session management
- User sessions are managed via HTTP-only cookies by Clerk
- Always call `requireAuth()` in server functions and protected routes

### Authorization

- **Always check authorization on the server** - never trust client-side checks
- Use authorization utilities from `src/utils/auth.ts`
- Filter all database queries by user ownership (studentId, teacherId, etc.)
- Validate user permissions before any data mutation
- Use `beforeLoad` in routes to protect entire route trees
- For admin-only operations, use `requireAdmin(userId)`
- For teacher operations, use `requireTeacherOfCourse(userId, courseId)`
- For student operations, filter by `studentId = userId`

### Data Protection

- Sanitize user inputs
- Use parameterized queries (drizzle handles this)
- Implement rate limiting for sensitive operations
- Encrypt sensitive data at rest
- Use HTTPS only

---

## Performance Guidelines

### Optimization Strategies

- Lazy load routes and heavy components
- Implement pagination for large lists
- Use Supabase indexes for frequently queried fields
- Cache static data where appropriate
- Optimize images (WebP format, proper sizing)
- Minimize bundle size (code splitting)

### Real-time Subscriptions

- Only subscribe to necessary data
- Unsubscribe when component unmounts
- Use filters to reduce data transfer
- Batch updates where possible

---

## Testing Strategy

### Testing Priorities (Future)

1. Critical user flows (authentication, enrollment, course access)
2. Payment processing (if implemented)
3. Data integrity (RLS policies, permissions)
4. Form validations
5. API endpoints

### Testing Tools

- Vitest for unit tests
- React Testing Library for component tests
- Playwright for E2E tests
- Supabase local development for database tests

---

## Git Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Development branch
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

Required environment variables:

```env
# Supabase
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key

# Optional
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (admin operations only)
```

---

## Accessibility Requirements

- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Screen reader compatibility
- Sufficient color contrast (WCAG AA)
- Focus indicators
- Alt text for images
- Form labels and error messages

---

## Development Workflow

### Before Starting a Feature

1. Review the plan document
2. Check database schema requirements
3. Create necessary types
4. Implement RLS policies
5. Build UI components
6. Test functionality
7. Update documentation

### Code Review Checklist

- [ ] TypeScript types defined
- [ ] Error handling implemented
- [ ] RLS policies tested
- [ ] Mobile responsive
- [ ] Accessible
- [ ] No console errors
- [ ] Follows coding standards

---

## Documentation Requirements

### Code Documentation

- JSDoc comments for complex functions
- README for each major feature
- API documentation for server functions
- Database schema documentation

### User Documentation (Future)

- User guides for each role
- Admin documentation
- FAQ section
- Video tutorials

---

## Deployment Strategy

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies enabled
- [ ] Build successful
- [ ] No TypeScript errors
- [ ] Performance tested
- [ ] Security audit completed

---

## Design System

### Color Palette

- Primary: Institute brand colors (TBD)
- Secondary: Complementary colors
- Success: Green (#10b981)
- Warning: Yellow (#f59e0b)
- Error: Red (#ef4444)
- Neutral: Gray scale

### Typography

- Headings: System font stack
- Body: System font stack
- Code: Monospace font stack

### Spacing Scale

Use Tailwind's default spacing scale (0.25rem increments)

### Component Variants

- Buttons: primary, secondary, outline, ghost, destructive
- Inputs: default, error, disabled
- Cards: default, elevated, outlined

---

## Future Enhancements

### Planned Features

- Discussion forums
- Live chat/messaging
- Quiz/test system
- Advanced analytics
- Mobile app
- Multi-language support
- Payment integration
- Video conferencing integration

---

## Support & Maintenance

### Monitoring

- Error tracking (future: Sentry)
- Performance monitoring
- User analytics
- Database performance

### Backup Strategy

- Daily database backups (Supabase handles this)
- Media file backups
- Configuration backups

---

## Contact & Resources

- **Project Repository:** TBD
- **Design Files:** TBD
- **Documentation:** TBD
- **Support:** TBD

---

_Last Updated: 2026-02-28_
_Version: 1.0.0_

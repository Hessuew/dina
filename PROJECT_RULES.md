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
- **BaaS:** Supabase
  - Authentication: Supabase Auth
  - Database: PostgreSQL with Row Level Security
  - Storage: Supabase Storage for media files
  - Real-time: Supabase Realtime subscriptions
- **Server Functions:** TanStack Start server functions for API logic
- **State Management:** 
  - Server state via TanStack Start
  - Client state via React Context where needed
  - Real-time data via Supabase subscriptions

### Database Design Principles
- Use Row Level Security (RLS) for all tables
- Implement role-based access control (RBAC)
- Use UUID for primary keys
- Include `created_at` and `updated_at` timestamps
- Soft deletes where appropriate (use `deleted_at` field)
- Normalize data but denormalize for performance where needed

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
| Feature | Visitor | Student | Teacher | Admin |
|---------|---------|---------|---------|-------|
| Landing Page | ✓ | ✓ | ✓ | ✓ |
| View Courses | ✗ | ✓ | ✓ | ✓ |
| Submit Inquiries | ✗ | ✓ | ✗ | ✓ |
| Manage Courses | ✗ | ✗ | ✓ | ✓ |
| View All Students | ✗ | ✗ | ✓ | ✓ |
| User Management | ✗ | ✗ | ✗ | ✓ |

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

### RLS Policy Pattern
```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Students can view their own data
CREATE POLICY "Students can view own data"
  ON table_name FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Teachers can view their course data
CREATE POLICY "Teachers can view course data"
  ON table_name FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = table_name.course_id
      AND courses.teacher_id = auth.uid()
    )
  );
```

---

## API & Server Functions

### Server Function Patterns
```typescript
// Use TanStack Start server functions
export const getStudentCourses = createServerFn({ method: 'GET' })
  .handler(async () => {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Unauthorized')
    }
    
    const { data, error } = await supabase
      .from('enrollments')
      .select('*, courses(*)')
      .eq('student_id', user.id)
    
    if (error) throw error
    return data
  })
```

### Error Handling
- Always handle Supabase errors
- Return user-friendly error messages
- Log errors for debugging
- Use try-catch for async operations
- Validate input data before processing

---

## Security Best Practices

### Authentication
- Use Supabase Auth for all authentication
- Implement email verification
- Enforce strong password requirements
- Use HTTP-only cookies for session management
- Implement session timeout

### Authorization
- Check user roles on both client and server
- Use RLS policies for database-level security
- Validate user permissions before actions
- Never trust client-side role checks alone

### Data Protection
- Sanitize user inputs
- Use parameterized queries (Supabase handles this)
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

*Last Updated: 2026-02-28*
*Version: 1.0.0*

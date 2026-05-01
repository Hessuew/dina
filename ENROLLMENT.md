# Enrollment System Improvement Plan

This plan implements a complete enrollment management system with database schema, admin interface, and public form integration for DINA's student enrollment process.

## Database Schema Changes

### New Enums

- `enrollment_status_enum`: 'pending', 'under_review', 'approved', 'rejected', 'waitlisted', 'withdrawn', 'deferred'
- `fellowship_level_enum`: 'believer', 'filled', 'knowledge', 'communication', 'friend', 'best_friend', 'life'

### New Table: `enrollments`

```typescript
{
  id: uuid (primary key)
  name: text (not null)
  email: text (not null, unique)
  dateOfBirth: date
  country: text
  fellowshipLevel: fellowship_level_enum (not null)
  bio: text (not null)
  status: enrollment_status_enum (default 'pending')
  invitationSent: boolean (default false)
  invitationId: uuid (references invitations.id, nullable)
  createdAt: timestamp (default now)
  updatedAt: timestamp (default now)
}
```

### RLS Policies

- Public insert: Allow anyone to create enrollment (for public form)
- Admin select/update/delete: Only admins can view/modify enrollments
- Admin update status: Only admins can change enrollment status

## Server Functions (src/utils/enrollments.ts)

### Public Functions

- `createEnrollment`: Creates enrollment record from public form (status: pending)

### Admin Functions

- `getEnrollments`: Fetch all enrollments with pagination/filtering
- `getEnrollmentById`: Fetch single enrollment by ID
- `updateEnrollmentStatus`: Change enrollment status
- `deleteEnrollment`: Hard delete enrollment
- `sendInvitationForEnrollment`: Create invitation for enrollment email, link to enrollment, set invitationSent flag

## Public Enrollment Form Update

### Changes to `src/components/auth/enrolment-form.tsx`

- Add fields: date_of_birth (date picker), country (text input), fellowship_level (select dropdown with 7 levels)
- Update form submission to call `createEnrollment` server function
- Keep existing visual design (CLAUDE.md compliance)
- Add validation for new fields

## Admin Interface

### Sidebar Changes (`src/components/navigation/AppSidebar.tsx`)

- Add new admin section (only shown when role === 'admin')
- Add "Enrollments" nav item with icon (FileText or ClipboardList)
- Route: `/admin/enrollments`

### Enrollments List Route (`src/routes/_authed/admin/enrollments.tsx`)

- Admin-only route (check role, redirect if not admin)
- Loader: fetch enrollments via `getEnrollments`
- Component: DataTable with columns:
  - Name
  - Email
  - Country
  - Fellowship Level (chip display)
  - Status (chip with color coding)
  - Invitation Sent (green checkmark if true)
  - Submitted At
  - Actions (button column)

### DataTable Actions

- **Go to**: Navigate to `/admin/enrollments/$enrollmentId`
- **Change Status**: Dropdown with all status options, calls `updateEnrollmentStatus`
- **Send Invitation**: Opens modal "Send invitation now?", calls `sendInvitationForEnrollment`
- **Delete**: Opens confirmation dialog, calls `deleteEnrollment` (hard delete)

### Enrollment Detail Route (`src/routes/_authed/admin/enrollments/$enrollmentId.tsx`)

- Admin-only route
- Loader: fetch enrollment via `getEnrollmentById`
- Display all enrollment fields in a clean layout
- Same actions as list view (status change, send invitation, delete)
- Back button to list

## UI Components

### Status Chip (`src/components/table/chips.tsx`)

- Add `EnrollmentStatusChip` component
- Color coding:
  - pending: gray
  - under_review: blue
  - approved: green
  - rejected: red
  - waitlisted: yellow
  - withdrawn: gray
  - deferred: orange

### Fellowship Level Chip

- Add `FellowshipLevelChip` component
- Display level number and description
- Color gradient or badge style

### Invitation Checkmark

- Simple green checkmark icon when `invitationSent === true`

## Validation Schemas

### New file: `src/schemas/enrollment.schema.ts`

- Zod schemas for:
  - createEnrollment (public form)
  - updateEnrollmentStatus
  - deleteEnrollment
  - sendInvitationForEnrollment

## Database Migration

### New migration: `drizzle/0016_enrollments.sql`

- Create enrollment_status_enum
- Create fellowship_level_enum
- Create enrollments table
- Add RLS policies
- Add indexes (email, status, createdAt)

## Documentation

### New file: `ENROLLMENT.md`

- Purpose and overview
- Data model (fields, enums, relationships)
- Enrollment lifecycle flow
- Admin access and permissions
- API reference (server functions)
- UI patterns (DataTable, chips, modals)

### Update existing docs

- `src/db/README.md`: Add enrollments table description
- `src/utils/README.md`: Add enrollments utilities
- `src/routes/README.md`: Add admin enrollment routes

## Implementation Order

1. Database schema and migration
2. Server functions with validation schemas
3. Update public enrollment form
4. Add admin sidebar section
5. Create enrollments list route with DataTable
6. Create enrollment detail route
7. Add UI components (chips, modals)
8. Create ENROLLMENT.md documentation
9. Update existing documentation

## Design System Compliance

- Use CLAUDE.md color tokens (no invented hex values)
- Follow component patterns from CLAUDE.md
- Sharp corners (zero border-radius on premium surfaces)
- Serif typography for headings
- Geist sans for UI/body
- Restrained motion (hover effects only)
- Dark theme for admin interface (matching existing admin routes)

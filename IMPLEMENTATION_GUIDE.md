# Discipler's Institute for Nations - Implementation Guide

## Overview

This project is a modern educational platform built for Discipler's Institute for Nations, featuring role-based access for students, teachers, and administrators.

## Tech Stack

- **Frontend**: TanStack Start + React 19
- **Backend**: Supabase (Auth, Database, Storage, Real-time)
- **Styling**: TailwindCSS v4
- **Type Safety**: TypeScript (strict mode)

## Project Structure

```
src/
├── components/          # Reusable UI components
├── routes/             # TanStack Router routes
│   ├── student/       # Student portal routes
│   ├── teacher/       # Teacher portal routes
│   └── admin/         # Admin portal routes
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── constants/          # Application constants
└── styles/             # Global styles

supabase/
└── schema.sql         # Complete database schema with RLS policies
```

## Setup Instructions

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Update `.env` file:

```env
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=your-database-url
```

### 3. Set Up Database

#### Option A: Using Drizzle (Recommended)

```bash
# 1. Add DATABASE_URL to .env (see step 2)

# 2. Push schema to create tables
bun db:push

# 3. Apply RLS policies
# Copy contents of drizzle/0000_add_rls_policies.sql
# Paste into Supabase SQL Editor and execute
```

#### Option B: Using Drizzle Migrations

```bash
# 1. Generate migration
bun db:generate

# 2. Apply migrations (creates tables + RLS)
bun db:migrate
```

This will create:

- All database tables with proper relationships
- Row Level Security (RLS) policies
- Indexes for performance
- Automatic timestamp updates

### 4. Create Storage Buckets

In Supabase Dashboard > Storage, create the following buckets:

- `course-materials` - For course content files
- `media-library` - For teacher uploaded media
- `assignments` - For assignment files
- `submissions` - For student submission files
- `avatars` - For user profile pictures
- `course-thumbnails` - For course cover images

Configure bucket policies according to user roles.

### 5. Run Development Server

```bash
bun dev
```

The application will be available at `http://localhost:3000`

## Features Implemented

### Phase 1: Foundation (Current)

✅ **Database Schema**

- Complete schema with 15+ tables
- Row Level Security policies for all tables
- Role-based access control (student, teacher, admin)

✅ **Authentication System**

- Email/password authentication
- Role-based user profiles
- Session management

✅ **Role-Based Routing**

- Student portal (`/student/*`)
- Teacher portal (`/teacher/*`)
- Admin portal (`/admin/*`)
- Protected routes with role validation

✅ **Dashboard Pages**

- Student Dashboard - View enrolled courses, progress tracking
- Teacher Dashboard - Course overview, student inquiries, analytics
- Admin Dashboard - Platform statistics, user management overview

✅ **Landing Page**

- Modern, responsive design
- Feature highlights
- Call-to-action sections
- Testimonials

✅ **Type Definitions**

- Complete TypeScript types for all database models
- Type-safe database queries
- Proper type inference

## User Roles & Access

### Student

- View and enroll in courses
- Track learning progress
- Submit assignments
- Send inquiries to teachers
- Access calendar and schedule

### Teacher

- Create and manage courses
- Upload course materials
- Respond to student inquiries
- Grade assignments
- View student progress
- Access analytics

### Admin

- Manage all users
- Oversee all courses
- View platform analytics
- Configure system settings
- Moderate content

## Database Schema Highlights

### Core Tables

- `profiles` - User profiles with role information
- `courses` - Course catalog
- `modules` - Course sections
- `lessons` - Individual lessons within modules
- `enrollments` - Student course enrollments
- `lesson_progress` - Track student progress
- `assignments` - Course assignments
- `submissions` - Student assignment submissions
- `inquiries` - Student-teacher communication
- `announcements` - Course and system announcements
- `media_library` - Uploaded media files
- `calendar_events` - Scheduled events
- `notifications` - User notifications

### Security Features

- Row Level Security (RLS) enabled on all tables
- Role-based policies for data access
- Automatic timestamp management
- Soft delete support where appropriate

## Next Steps (Phase 2)

### Planned Features

1. **Course Management**
   - Full CRUD for courses, modules, lessons
   - Course publishing workflow
   - Enrollment management

2. **Assignment System**
   - Create and publish assignments
   - Student submission interface
   - Grading and feedback system

3. **Inquiry System**
   - Student inquiry form
   - Teacher response interface
   - Status tracking

4. **Calendar Integration**
   - Course schedule display
   - Assignment deadlines
   - Event management

5. **Media Management**
   - File upload interface
   - Media library browser
   - Video player integration

6. **Notifications**
   - Real-time notifications
   - Email notifications
   - Notification preferences

## Development Guidelines

### Code Style

- Follow TypeScript strict mode
- Use functional components with hooks
- Implement proper error handling
- Add loading states for async operations

### Database Queries

- Always use RLS policies
- Validate user permissions server-side
- Use proper indexes for performance
- Handle errors gracefully

### UI/UX

- Mobile-first responsive design
- Consistent spacing and typography
- Accessible components (WCAG AA)
- Loading and error states

## Testing

### Manual Testing Checklist

- [ ] User registration with different roles
- [ ] Login/logout functionality
- [ ] Role-based route access
- [ ] Dashboard data loading
- [ ] Responsive design on mobile/tablet/desktop

### Future Automated Testing

- Unit tests for utilities
- Integration tests for server functions
- E2E tests for critical flows
- RLS policy tests

## Deployment

### Prerequisites

- Supabase project configured
- Environment variables set
- Database schema applied
- Storage buckets created

### Build

```bash
bun build
```

### Deploy

Follow TanStack Start deployment guide for your hosting platform.

## Troubleshooting

### Common Issues

**TypeScript Errors**

- Ensure all dependencies are installed: `pnpm install`
- Check that types are properly imported

**Database Connection**

- Verify SUPABASE_URL and SUPABASE_ANON_KEY in `.env`
- Check Supabase project is active

**RLS Policy Errors**

- Verify user is authenticated
- Check user role matches required permissions
- Review RLS policies in Supabase dashboard

**Route Access Issues**

- Ensure user profile exists in `profiles` table
- Verify role is correctly set
- Check route protection logic

## Resources

- [TanStack Router Docs](https://tanstack.com/router)
- [TanStack Start Docs](https://tanstack.com/start)
- [Supabase Documentation](https://supabase.com/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

## Support

For questions or issues, refer to:

- `PROJECT_RULES.md` - Coding standards and architecture
- `disciplers-institute-portal-plan-ffa875.md` - Complete project plan
- Supabase documentation for database/auth issues

## License

[Specify License]

---

**Last Updated**: 2026-02-28  
**Version**: 1.0.0 (Phase 1 Complete)

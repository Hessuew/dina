# Discipler's Institute for Nations - Project Decisions

## Core Requirements & Decisions

### 1. Enrollment Process

**Decision:** Admin approval required

Students no self-enroll. Workflow:

1. Student create account, browse courses
2. Student request enrollment
3. Admin approve/reject
4. Approval → status `pending` → `active`

**Implementation Notes:**

- Enrollment table `status`: `pending`, `active`, `completed`, `dropped`
- Admin dashboard need approval UI
- Email notify on request/approval

### 2. Payment Integration

**Decision:** No payment required

All courses free. No payment gateway.

**Implementation Notes:**

- No Stripe
- Remove payment fields from planning
- Focus education delivery

### 3. Course Structure

**Decision:** Fixed curriculum

Sequential curriculum, not flexible.

**Implementation Notes:**

- Students progress modules in order
- Prerequisites enforceable
- Linear path per course
- Modules/lessons have `order_index`

### 4. Grading System

**Decision:** Letter grades (A, B, C, D, F)

**Grading Scale:**

- A: 90-100%
- B: 80-89%
- C: 70-79%
- D: 60-69%
- F: Below 60%

**Implementation Notes:**

- Store numeric (0-100) in `submissions.grade`
- Calculate letter on display
- Add grade calc utility
- Show both numeric + letter in UI

### 5. Video Hosting

**Decision:** External service (Zoom)

**Implementation Notes:**

- Store Zoom links in `lessons.video_url`
- No video upload infra needed
- Consider zoom_meeting_id + password fields
- Zoom API scheduling (future)

### 6. Email Service

**Decision:** Supabase Auth emails

**Implementation Notes:**

- Configure Supabase email templates
- Use Supabase triggers for notifications
- Custom SMTP via Supabase dashboard if needed
- Notify for: account verify, password reset, enrollment changes, new assignments, inquiry responses

### 7. Localization

**Decision:** English only

**Implementation Notes:**

- All UI/DB in English
- No i18n needed initially
- Localization future option

## Database Schema Updates Needed

### 1. Add Letter Grade Calculation Function

```sql
CREATE OR REPLACE FUNCTION get_letter_grade(numeric_grade INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF numeric_grade >= 90 THEN RETURN 'A';
  ELSIF numeric_grade >= 80 THEN RETURN 'B';
  ELSIF numeric_grade >= 70 THEN RETURN 'C';
  ELSIF numeric_grade >= 60 THEN RETURN 'D';
  ELSE RETURN 'F';
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### 2. Add Zoom Meeting Fields (Optional Enhancement)

```sql
ALTER TABLE lessons
ADD COLUMN zoom_meeting_id TEXT,
ADD COLUMN zoom_password TEXT,
ADD COLUMN scheduled_time TIMESTAMPTZ;
```

### 3. Enrollment Approval Workflow

Existing `enrollments` table already support with `status` enum. Need admin approval UI only.

## Feature Priority Updates

### High Priority (Phase 2)

1. ✅ Admin enrollment approval interface
2. ✅ Course management (create/edit courses)
3. ✅ Assignment creation and grading with letter grades
4. ✅ Zoom link integration in lessons

### Medium Priority (Phase 3)

1. Email notification system
2. Student inquiry system
3. Calendar with scheduled Zoom sessions
4. Progress tracking with grade display

### Low Priority (Phase 4)

1. Advanced analytics
2. Certificate generation
3. Zoom API integration for scheduling
4. Mobile optimization

## UI/UX Considerations

### Enrollment Flow

- "Request Enrollment" button on course pages
- Status show "Pending Approval"
- Notify on approve/reject

### Grading Display

- Show numeric + letter grade
- Color: A (green), B (blue), C (yellow), D (orange), F (red)
- Grade summary on student dashboard

### Video Access

- "Join Zoom Session" button for live classes
- Show scheduled time for upcoming sessions
- Archive recorded sessions (links only)

## Security Considerations

### Enrollment Approval

- Only admins approve
- RLS prevent students changing own status
- Audit log for changes

### Grading

- Only teacher/admin assign grades
- Students view only, no modify
- Grade history tracked

## Next Implementation Steps

1. **Update Database Schema**
   - Add letter grade function
   - Add Zoom fields (optional)

2. **Create Admin Enrollment Approval UI**
   - List pending enrollments
   - Approve/reject actions
   - Email notifications

3. **Implement Grading System**
   - Grade input for teachers
   - Letter grade calc
   - Grade display for students

4. **Add Zoom Integration**
   - Zoom link in lesson creation
   - "Join Session" buttons
   - Scheduled time display

---

**Last Updated:** 2026-02-28  
**Status:** Decisions Finalized
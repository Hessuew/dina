# Discipler's Institute for Nations - Project Decisions

## Core Requirements & Decisions

### 1. Enrollment Process

**Decision:** Admin approval required

Students cannot self-enroll in courses. The workflow is:

1. Student creates account and browses available courses
2. Student requests enrollment in a course
3. Admin reviews and approves/rejects enrollment request
4. Upon approval, enrollment status changes from `pending` to `active`

**Implementation Notes:**

- Enrollment table has `status` field: `pending`, `active`, `completed`, `dropped`
- Admin dashboard needs enrollment approval interface
- Email notifications for enrollment requests and approvals

### 2. Payment Integration

**Decision:** No payment required

All courses are free. No payment gateway integration needed.

**Implementation Notes:**

- No Stripe or payment processing
- Remove any payment-related fields from future planning
- Focus on educational content delivery

### 3. Course Structure

**Decision:** Fixed curriculum

Courses follow a structured, sequential curriculum rather than flexible module selection.

**Implementation Notes:**

- Students progress through modules in order
- Prerequisites can be enforced
- Linear learning path per course
- Modules and lessons have `order_index` for sequencing

### 4. Grading System

**Decision:** Letter grades (A, B, C, D, F)

**Grading Scale:**

- A: 90-100%
- B: 80-89%
- C: 70-79%
- D: 60-69%
- F: Below 60%

**Implementation Notes:**

- Store numeric grade (0-100) in `submissions.grade`
- Calculate letter grade on display
- Add grade calculation utility function
- Show both numeric and letter grades in UI

### 5. Video Hosting

**Decision:** External service (Zoom)

Live sessions and video content will use Zoom.

**Implementation Notes:**

- Store Zoom meeting links in `lessons.video_url`
- No need for video upload/storage infrastructure
- Consider adding Zoom meeting ID and password fields
- Integration with Zoom API for scheduling (future enhancement)

### 6. Email Service

**Decision:** clerk Auth emails

Use clerk's built-in email functionality for authentication and notifications.

**Implementation Notes:**

- Configure clerk email templates
- Use clerk triggers for notification emails
- Custom SMTP can be configured in clerk dashboard if needed
- Email notifications for:
  - Account verification
  - Password reset
  - Enrollment status changes
  - New assignments
  - Inquiry responses

### 7. Localization

**Decision:** English only

No multi-language support in initial version.

**Implementation Notes:**

- All UI text in English
- Database content in English
- No i18n library needed initially
- Can add localization in future if needed

## Database Schema Updates Needed

Based on these decisions, update the schema:

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

The existing `enrollments` table already supports this with the `status` enum.
Just need to implement the admin approval UI.

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

- Clear "Request Enrollment" button on course pages
- Status indicator showing "Pending Approval"
- Notification when approved/rejected

### Grading Display

- Show both numeric score and letter grade
- Color coding: A (green), B (blue), C (yellow), D (orange), F (red)
- Grade summary on student dashboard

### Video Access

- Prominent "Join Zoom Session" button for live classes
- Display scheduled time for upcoming sessions
- Archive recorded sessions (links only, not files)

## Security Considerations

### Enrollment Approval

- Only admins can approve enrollments
- RLS policies prevent students from changing their own status
- Audit log for enrollment changes

### Grading

- Only course teacher or admin can assign grades
- Students can view but not modify grades
- Grade history tracking

## Next Implementation Steps

1. **Update Database Schema**
   - Add letter grade function
   - Add Zoom meeting fields (optional)

2. **Create Admin Enrollment Approval UI**
   - List pending enrollments
   - Approve/reject actions
   - Email notifications

3. **Implement Grading System**
   - Grade input interface for teachers
   - Letter grade calculation
   - Grade display for students

4. **Add Zoom Integration**
   - Zoom link input in lesson creation
   - "Join Session" buttons
   - Scheduled time display

---

**Last Updated:** 2026-02-28  
**Status:** Decisions Finalized

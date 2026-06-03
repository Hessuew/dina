import {
  boolean,
  check,
  integer,
  pgEnum,
  pgPolicy,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = pgEnum('user_role', ['student', 'teacher', 'admin'])
export const submissionStatusEnum = pgEnum('submission_status', [
  'draft',
  'submitted',
  'graded',
  'returned',
])
export const mediaTypeEnum = pgEnum('media_type', [
  'video',
  'audio',
  'document',
  'image',
  'other',
])
export const notificationTypeEnum = pgEnum('notification_type', [
  'announcement',
  'assignment',
  'grade',
  'system',
])
export const postNotificationEventEnum = pgEnum('post_notification_event', [
  'post_created',
  'comment_created',
])
export const assignmentStatusEnum = pgEnum('assignment_status', [
  'draft',
  'published',
  'closed',
])
export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',
  'accepted',
  'revoked',
])
export const calendarEventCategoryEnum = pgEnum('calendar_event_category', [
  'exam',
  'chapel',
  'personal',
])
export const zoomLinkSectionEnum = pgEnum('zoom_link_section', [
  'general_class_lecture',
  'discipleship_group',
])

export const enrollmentStatusEnum = pgEnum('enrollment_status', [
  'pending',
  'under_review',
  'approved',
  'rejected',
  'waitlisted',
  'withdrawn',
  'deferred',
])

export const enrollmentGenderEnum = pgEnum('enrollment_gender', [
  'male',
  'female',
])

export const gemstoneEnum = pgEnum('gemstone', [
  'jasper',
  'sapphire',
  'chalcedony',
  'emerald',
  'sardonyx',
  'sardius',
  'chrysolite',
  'beryl',
  'topaz',
  'chrysoprasus',
  'jacinth',
  'amethyst',
])

// ============================================================================
// TABLES
// ============================================================================

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    email: text('email').notNull().unique(),
    fullName: text('full_name').notNull(),
    role: userRoleEnum('role').notNull().default('student'),
    bio: text('bio'),
    lecturerTitle: text('lecturer_title'),
    gemstone: gemstoneEnum('gemstone'),
    avatarUrl: text('avatar_url'),
    emailNotifications: boolean('email_notifications').default(true),
    notifyNewAssignments: boolean('notify_new_assignments').default(true),
    notifyGrades: boolean('notify_grades').default(true),
    resetTokenHash: text('reset_token_hash'),
    resetTokenExpiresAt: timestamp('reset_token_expires_at'),
    resetTokenAttempts: integer('reset_token_attempts').default(0).notNull(),
    lastResetRequestAt: timestamp('last_reset_request_at'),
    pendingEmail: text('pending_email'),
    emailChangeTokenHash: text('email_change_token_hash'),
    emailChangeTokenExpiresAt: timestamp('email_change_token_expires_at'),
    emailChangeTokenAttempts: integer('email_change_token_attempts')
      .default(0)
      .notNull(),
    lastEmailChangeRequestAt: timestamp('last_email_change_request_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // Users can view their own profile
    pgPolicy('users_view_own_profile', {
      for: 'select',
      to: authenticatedRole,
      using: sql`id = auth.uid()`,
    }),
    // Teachers can view all profiles (need to see student info)
    pgPolicy('teachers_view_all_profiles', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'`,
    }),
    // Admins can view all profiles
    pgPolicy('admins_view_all_profiles', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Users can update their own profile
    pgPolicy('users_update_own_profile', {
      for: 'update',
      to: authenticatedRole,
      using: sql`id = auth.uid()`,
      withCheck: sql`id = auth.uid()`,
    }),
    // Admins can update all profiles
    pgPolicy('admins_update_all_profiles', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Users can insert their own profile (for signup)
    pgPolicy('users_insert_own_profile', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`id = auth.uid()`,
    }),
    // Admins can insert profiles
    pgPolicy('admins_insert_profiles', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)

export const courses = pgTable(
  'courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    thumbnailUrl: text('thumbnail_url'),
    isPublished: boolean('is_published').default(false),
    orderIndex: integer('order_index').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // All authenticated users can view courses
    pgPolicy('authenticated_view_courses', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
    // Teachers can only update courses they're assigned to
    pgPolicy('teachers_update_assigned_courses', {
      for: 'update',
      to: authenticatedRole,
      using: sql`
        id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      `,
      withCheck: sql`
        id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can update all courses
    pgPolicy('admins_update_all_courses', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Teachers can only insert courses they're assigned to
    pgPolicy('teachers_insert_assigned_courses', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`
        id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can insert courses
    pgPolicy('admins_insert_courses', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)

export const courseTeachers = pgTable(
  'course_teachers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (_table) => [
    // Teachers can view their own course assignments
    pgPolicy('teachers_view_own_assignments', {
      for: 'select',
      to: authenticatedRole,
      using: sql`teacher_id = auth.uid()`,
    }),
    // Admins can view all course assignments
    pgPolicy('admins_view_all_assignments', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Teachers can only update their own assignments
    pgPolicy('teachers_update_own_assignments', {
      for: 'update',
      to: authenticatedRole,
      using: sql`teacher_id = auth.uid()`,
      withCheck: sql`teacher_id = auth.uid()`,
    }),
    // Admins can update all assignments
    pgPolicy('admins_update_all_assignments', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Admins can insert assignments
    pgPolicy('admins_insert_assignments', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)

export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content'),
    videoUrl: text('video_url'),
    thumbnailUrl: text('thumbnail_url'),
    duration: integer('duration'),
    orderIndex: integer('order_index').notNull().default(0),
    isPublished: boolean('is_published').default(false),
    zoomMeetingId: text('zoom_meeting_id'),
    zoomPassword: text('zoom_password'),
    scheduledTime: timestamp('scheduled_time'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // All authenticated users can view lessons
    pgPolicy('authenticated_view_lessons', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
    // Teachers can only update lessons in their assigned courses
    pgPolicy('teachers_update_assigned_lessons', {
      for: 'update',
      to: authenticatedRole,
      using: sql`
        course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      `,
      withCheck: sql`
        course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can update all lessons
    pgPolicy('admins_update_all_lessons', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Teachers can only insert lessons in their assigned courses
    pgPolicy('teachers_insert_assigned_lessons', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`
        course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can insert lessons
    pgPolicy('admins_insert_lessons', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)

export const lessonProgress = pgTable(
  'lesson_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    completed: boolean('completed').default(false),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // Students can view their own progress
    pgPolicy('students_view_own_progress', {
      for: 'select',
      to: authenticatedRole,
      using: sql`student_id = auth.uid()`,
    }),
    // Teachers can view progress for students in their courses
    pgPolicy('teachers_view_course_progress', {
      for: 'select',
      to: authenticatedRole,
      using: sql`
        lesson_id IN (
          SELECT l.id FROM lessons l
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can view all progress
    pgPolicy('admins_view_all_progress', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Students can update their own progress
    pgPolicy('students_update_own_progress', {
      for: 'update',
      to: authenticatedRole,
      using: sql`student_id = auth.uid()`,
      withCheck: sql`student_id = auth.uid()`,
    }),
    // Students can insert their own progress
    pgPolicy('students_insert_own_progress', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`student_id = auth.uid()`,
    }),
  ],
)

export const assignments = pgTable(
  'assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    dueDate: timestamp('due_date').notNull(),
    maxGrade: integer('max_grade').default(100),
    status: assignmentStatusEnum('status').notNull().default('draft'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // All authenticated users can view assignments
    pgPolicy('authenticated_view_assignments', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
    // Teachers can only update assignments in their assigned courses
    pgPolicy('teachers_update_assigned_assignments', {
      for: 'update',
      to: authenticatedRole,
      using: sql`
        lesson_id IN (
          SELECT l.id FROM lessons l
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      `,
      withCheck: sql`
        lesson_id IN (
          SELECT l.id FROM lessons l
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can update all assignments
    pgPolicy('admins_update_all_assignments', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Teachers can only insert assignments in their assigned courses
    pgPolicy('teachers_insert_assigned_assignments', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`
        lesson_id IN (
          SELECT l.id FROM lessons l
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can insert assignments
    pgPolicy('admins_insert_assignments', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)

export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => assignments.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    content: text('content'),
    fileUrl: text('file_url'),
    status: submissionStatusEnum('status').notNull().default('draft'),
    grade: integer('grade'),
    feedback: text('feedback'),
    submittedAt: timestamp('submitted_at'),
    gradedAt: timestamp('graded_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // Students can view their own submissions
    pgPolicy('students_view_own_submissions', {
      for: 'select',
      to: authenticatedRole,
      using: sql`student_id = auth.uid()`,
    }),
    // Teachers can view submissions in their courses
    pgPolicy('teachers_view_course_submissions', {
      for: 'select',
      to: authenticatedRole,
      using: sql`
        assignment_id IN (
          SELECT a.id FROM assignments a
          JOIN lessons l ON a.lesson_id = l.id
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can view all submissions
    pgPolicy('admins_view_all_submissions', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Students can update their own submissions
    pgPolicy('students_update_own_submissions', {
      for: 'update',
      to: authenticatedRole,
      using: sql`student_id = auth.uid()`,
      withCheck: sql`student_id = auth.uid()`,
    }),
    // Teachers can grade submissions in their courses
    pgPolicy('teachers_grade_course_submissions', {
      for: 'update',
      to: authenticatedRole,
      using: sql`
        assignment_id IN (
          SELECT a.id FROM assignments a
          JOIN lessons l ON a.lesson_id = l.id
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      `,
      withCheck: sql`
        assignment_id IN (
          SELECT a.id FROM assignments a
          JOIN lessons l ON a.lesson_id = l.id
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      `,
    }),
    // Students can insert their own submissions
    pgPolicy('students_insert_own_submissions', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`student_id = auth.uid()`,
    }),
  ],
)

export const announcements = pgTable(
  'announcements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id').references(() => courses.id, {
      onDelete: 'cascade',
    }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => profiles.id),
    title: text('title').notNull(),
    content: text('content').notNull(),
    isGlobal: boolean('is_global').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // All authenticated users can view announcements
    pgPolicy('authenticated_view_announcements', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
    // Users can update their own announcements
    pgPolicy('users_update_own_announcements', {
      for: 'update',
      to: authenticatedRole,
      using: sql`author_id = auth.uid()`,
      withCheck: sql`author_id = auth.uid()`,
    }),
    // Teachers can create announcements for their courses
    pgPolicy('teachers_insert_course_announcements', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`
        (is_global = false AND course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )) OR (is_global = true AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
      `,
    }),
    // Admins can create global announcements
    pgPolicy('admins_insert_global_announcements', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)

export const mediaLibrary = pgTable(
  'media_library',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    uploaderId: uuid('uploader_id')
      .notNull()
      .references(() => profiles.id),
    courseId: uuid('course_id').references(() => courses.id, {
      onDelete: 'cascade',
    }),
    title: text('title').notNull(),
    category: text('category').notNull().default('General'),
    description: text('description'),
    fileUrl: text('file_url').notNull(),
    fileType: mediaTypeEnum('file_type').notNull(),
    fileSize: integer('file_size'),
    thumbnailUrl: text('thumbnail_url'),
    isPublished: boolean('is_published').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // All authenticated users can view media
    pgPolicy('authenticated_view_media', {
      for: 'select',
      to: authenticatedRole,
      using: sql`
        is_published = true
        OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')
      `,
    }),
    // Uploaders can update their own media
    pgPolicy('uploaders_update_own_media', {
      for: 'update',
      to: authenticatedRole,
      using: sql`uploader_id = auth.uid()`,
      withCheck: sql`uploader_id = auth.uid()`,
    }),
    // Teachers can update media in their courses
    pgPolicy('teachers_update_course_media', {
      for: 'update',
      to: authenticatedRole,
      using: sql`
        course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      `,
      withCheck: sql`
        course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can update all media
    pgPolicy('admins_update_all_media', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    pgPolicy('uploaders_delete_own_media', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`uploader_id = auth.uid()`,
    }),
    pgPolicy('admins_delete_all_media', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Users can upload their own media
    pgPolicy('users_upload_own_media', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`
        uploader_id = auth.uid()
        AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')
      `,
    }),
    // Teachers can upload media for their courses
    pgPolicy('teachers_upload_course_media', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')
        AND (course_id IS NULL OR course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        ))
      `,
    }),
  ],
)

export const calendarEvents = pgTable(
  'calendar_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id').references(() => courses.id, {
      onDelete: 'cascade',
    }),
    title: text('title').notNull(),
    description: text('description'),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time').notNull(),
    location: text('location'),
    zoomLink: text('zoom_link'),
    category: calendarEventCategoryEnum('category'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // All authenticated users can view events
    pgPolicy('authenticated_view_events', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
    // Teachers can update events in their courses
    pgPolicy('teachers_update_course_events', {
      for: 'update',
      to: authenticatedRole,
      using: sql`
        course_id IS NULL OR course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      `,
      withCheck: sql`
        course_id IS NULL OR course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can update all events
    pgPolicy('admins_update_all_events', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Teachers can create events in their courses
    pgPolicy('teachers_create_course_events', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`
        course_id IS NULL OR course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can create events
    pgPolicy('admins_create_events', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)

export const zoomLinks = pgTable(
  'zoom_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    section: zoomLinkSectionEnum('section').notNull(),
    courseId: uuid('course_id').references(() => courses.id, {
      onDelete: 'set null',
    }),
    zoomUrl: text('zoom_url').notNull(),
    meetingId: text('meeting_id').notNull(),
    passcode: text('passcode').notNull(),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    pgPolicy('authenticated_view_zoom_links', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy('admins_insert_zoom_links', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    pgPolicy('admins_update_zoom_links', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    pgPolicy('admins_delete_zoom_links', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    message: text('message').notNull(),
    type: notificationTypeEnum('type').notNull(),
    link: text('link'),
    isRead: boolean('is_read').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (_table) => [
    // Users can view their own notifications
    pgPolicy('users_view_own_notifications', {
      for: 'select',
      to: authenticatedRole,
      using: sql`user_id = auth.uid()`,
    }),
    // Users can update their own notifications
    pgPolicy('users_update_own_notifications', {
      for: 'update',
      to: authenticatedRole,
      using: sql`user_id = auth.uid()`,
      withCheck: sql`user_id = auth.uid()`,
    }),
    // Teachers and admins can create notifications
    pgPolicy('staff_create_notifications', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher')`,
    }),
  ],
)

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    role: userRoleEnum('role').notNull(),
    token: text('token').notNull().unique(),
    status: invitationStatusEnum('status').notNull().default('pending'),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => profiles.id),
    invitedAt: timestamp('invited_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedAt: timestamp('accepted_at'),
    otpHash: text('otp_hash'),
    otpExpiresAt: timestamp('otp_expires_at'),
    otpAttempts: integer('otp_attempts').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // Public access for invitation token lookup during signup
    pgPolicy('public_view_invitation_by_token', {
      for: 'select',
      to: 'public',
      using: sql`token IS NOT NULL AND status = 'pending' AND expires_at > NOW()`,
    }),
    // Public access for OTP verification during signup
    pgPolicy('public_update_otp_verification', {
      for: 'update',
      to: 'public',
      using: sql`token IS NOT NULL AND status = 'pending' AND expires_at > NOW()`,
      withCheck: sql`token IS NOT NULL AND status = 'pending' AND expires_at > NOW()`,
    }),
    // Authenticated users can view invitations they created
    pgPolicy('users_view_own_invitations', {
      for: 'select',
      to: authenticatedRole,
      using: sql`invited_by = auth.uid()`,
    }),
    // Admins can view all invitations
    pgPolicy('admins_view_all_invitations', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Admins can update all invitations
    pgPolicy('admins_update_all_invitations', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Admins and teachers can insert invitations
    pgPolicy('staff_insert_invitations', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher')`,
    }),
  ],
)

export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fullLegalName: text('full_legal_name').notNull(),
    preferredName: text('preferred_name'),
    email: text('email').notNull(),
    yearOfBirth: integer('year_of_birth').notNull(),
    gender: enrollmentGenderEnum('gender').notNull(),
    nationalityCitizenship: text('nationality_citizenship'),
    phoneWhatsApp: text('phone_whatsapp').notNull(),
    currentCity: text('current_city'),
    currentCountry: text('current_country'),
    churchAffiliations: text('church_affiliations'),
    aboutYourself: text('about_yourself').notNull(),
    expectationsAlignment: text('expectations_alignment').notNull(),
    status: enrollmentStatusEnum('status').notNull().default('pending'),
    invitationSent: boolean('invitation_sent').notNull().default(false),
    invitationId: uuid('invitation_id').references(() => invitations.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    pgPolicy('public_insert_enrollments', {
      for: 'insert',
      to: 'public',
      withCheck: sql`true`,
    }),
    pgPolicy('admins_view_all_enrollments', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    pgPolicy('admins_update_all_enrollments', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    pgPolicy('admins_delete_all_enrollments', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)

export const enrollmentEvaluations = pgTable(
  'enrollment_evaluations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    evaluatorId: uuid('evaluator_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    score: smallint('score'),
    note: text('note'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('enrollment_evaluations_enrollment_evaluator_unique').on(
      table.enrollmentId,
      table.evaluatorId,
    ),
    check(
      'enrollment_evaluations_score_range',
      sql`${table.score} BETWEEN -9 AND 9`,
    ),
    // Teacher-users and admins (Evaluators) may read all evaluations.
    pgPolicy('staff_view_evaluations', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher')`,
    }),
    // Evaluators may only write their own evaluation row.
    pgPolicy('staff_insert_own_evaluations', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`evaluator_id = auth.uid() AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher')`,
    }),
    pgPolicy('staff_update_own_evaluations', {
      for: 'update',
      to: authenticatedRole,
      using: sql`evaluator_id = auth.uid()`,
      withCheck: sql`evaluator_id = auth.uid()`,
    }),
  ],
)

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id').references(() => courses.id, {
      onDelete: 'set null',
    }),
    content: text('content').notNull(),
    deletedAt: timestamp('deleted_at'),
    deletedBy: uuid('deleted_by').references(() => profiles.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    pgPolicy('authenticated_view_posts', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy('users_insert_own_posts', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`author_id = auth.uid()`,
    }),
    pgPolicy('users_update_own_posts', {
      for: 'update',
      to: authenticatedRole,
      using: sql`author_id = auth.uid()`,
      withCheck: sql`author_id = auth.uid()`,
    }),
    pgPolicy('staff_update_any_post', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher')`,
    }),
  ],
)

export const postComments = pgTable(
  'post_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    deletedAt: timestamp('deleted_at'),
    deletedBy: uuid('deleted_by').references(() => profiles.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    pgPolicy('authenticated_view_post_comments', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy('users_insert_own_comments', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`author_id = auth.uid()`,
    }),
    pgPolicy('users_update_own_comments', {
      for: 'update',
      to: authenticatedRole,
      using: sql`author_id = auth.uid()`,
      withCheck: sql`author_id = auth.uid()`,
    }),
    pgPolicy('staff_update_any_comment', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher')`,
    }),
  ],
)

export const postNotifications = pgTable(
  'post_notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').notNull(),
    event: postNotificationEventEnum('event').notNull(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    commentId: uuid('comment_id').references(() => postComments.id, {
      onDelete: 'cascade',
    }),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (_table) => [
    pgPolicy('users_view_own_post_notifications', {
      for: 'select',
      to: authenticatedRole,
      using: sql`user_id = auth.uid()`,
    }),
    pgPolicy('users_update_own_post_notifications', {
      for: 'update',
      to: authenticatedRole,
      using: sql`user_id = auth.uid()`,
      withCheck: sql`user_id = auth.uid()`,
    }),
    pgPolicy('users_insert_post_notifications', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`
        actor_id = auth.uid()
        AND (
          (
            event = 'post_created'
            AND comment_id IS NULL
            AND EXISTS (
              SELECT 1 FROM posts p WHERE p.id = post_id AND p.author_id = actor_id
            )
          )
          OR
          (
            event = 'comment_created'
            AND comment_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM post_comments c
              WHERE c.id = comment_id AND c.author_id = actor_id AND c.post_id = post_id
            )
          )
        )
      `,
    }),
  ],
)

export const postReactions = pgTable(
  'post_reactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    emoji: text('emoji').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('post_reactions_post_user_unique').on(table.postId, table.userId),
    pgPolicy('authenticated_view_post_reactions', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy('users_insert_own_reactions', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`user_id = auth.uid()`,
    }),
    pgPolicy('users_update_own_reactions', {
      for: 'update',
      to: authenticatedRole,
      using: sql`user_id = auth.uid()`,
      withCheck: sql`user_id = auth.uid()`,
    }),
    pgPolicy('users_delete_own_reactions', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`user_id = auth.uid()`,
    }),
  ],
)

export const postCommentReactions = pgTable(
  'post_comment_reactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    commentId: uuid('comment_id')
      .notNull()
      .references(() => postComments.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    emoji: text('emoji').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('post_comment_reactions_comment_user_unique').on(
      table.commentId,
      table.userId,
    ),
    pgPolicy('authenticated_view_post_comment_reactions', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy('users_insert_own_post_comment_reactions', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`user_id = auth.uid()`,
    }),
    pgPolicy('users_update_own_post_comment_reactions', {
      for: 'update',
      to: authenticatedRole,
      using: sql`user_id = auth.uid()`,
      withCheck: sql`user_id = auth.uid()`,
    }),
    pgPolicy('users_delete_own_post_comment_reactions', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`user_id = auth.uid()`,
    }),
  ],
)

// ============================================================================
// RELATIONS
// ============================================================================

export const profilesRelations = relations(profiles, ({ many }) => ({
  courseTeachers: many(courseTeachers),
  submissions: many(submissions),
  announcements: many(announcements),
  mediaUploads: many(mediaLibrary),
  notifications: many(notifications),
  invitations: many(invitations),
  posts: many(posts),
  postComments: many(postComments),
  postNotifications: many(postNotifications),
  postReactions: many(postReactions),
  postCommentReactions: many(postCommentReactions),
}))

export const coursesRelations = relations(courses, ({ many }) => ({
  courseTeachers: many(courseTeachers),
  lessons: many(lessons),
  announcements: many(announcements),
  mediaFiles: many(mediaLibrary),
  calendarEvents: many(calendarEvents),
  zoomLinks: many(zoomLinks),
  posts: many(posts),
}))

export const courseTeachersRelations = relations(courseTeachers, ({ one }) => ({
  course: one(courses, {
    fields: [courseTeachers.courseId],
    references: [courses.id],
  }),
  teacher: one(profiles, {
    fields: [courseTeachers.teacherId],
    references: [profiles.id],
  }),
}))

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  course: one(courses, {
    fields: [lessons.courseId],
    references: [courses.id],
  }),
  progress: many(lessonProgress),
  assignments: many(assignments),
}))

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
  student: one(profiles, {
    fields: [lessonProgress.studentId],
    references: [profiles.id],
  }),
  lesson: one(lessons, {
    fields: [lessonProgress.lessonId],
    references: [lessons.id],
  }),
}))

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  lesson: one(lessons, {
    fields: [assignments.lessonId],
    references: [lessons.id],
  }),
  submissions: many(submissions),
}))

export const submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignmentId],
    references: [assignments.id],
  }),
  student: one(profiles, {
    fields: [submissions.studentId],
    references: [profiles.id],
  }),
}))

export const announcementsRelations = relations(announcements, ({ one }) => ({
  author: one(profiles, {
    fields: [announcements.authorId],
    references: [profiles.id],
  }),
  course: one(courses, {
    fields: [announcements.courseId],
    references: [courses.id],
  }),
}))

export const mediaLibraryRelations = relations(mediaLibrary, ({ one }) => ({
  uploader: one(profiles, {
    fields: [mediaLibrary.uploaderId],
    references: [profiles.id],
  }),
  course: one(courses, {
    fields: [mediaLibrary.courseId],
    references: [courses.id],
  }),
}))

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  course: one(courses, {
    fields: [calendarEvents.courseId],
    references: [courses.id],
  }),
}))

export const zoomLinksRelations = relations(zoomLinks, ({ one }) => ({
  course: one(courses, {
    fields: [zoomLinks.courseId],
    references: [courses.id],
  }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(profiles, {
    fields: [notifications.userId],
    references: [profiles.id],
  }),
}))

export const invitationsRelations = relations(invitations, ({ one }) => ({
  inviter: one(profiles, {
    fields: [invitations.invitedBy],
    references: [profiles.id],
  }),
}))

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(profiles, {
    fields: [posts.authorId],
    references: [profiles.id],
  }),
  course: one(courses, {
    fields: [posts.courseId],
    references: [courses.id],
  }),
  comments: many(postComments),
  reactions: many(postReactions),
}))

export const postCommentsRelations = relations(
  postComments,
  ({ one, many }) => ({
    post: one(posts, {
      fields: [postComments.postId],
      references: [posts.id],
    }),
    author: one(profiles, {
      fields: [postComments.authorId],
      references: [profiles.id],
    }),
    reactions: many(postCommentReactions),
  }),
)

export const postReactionsRelations = relations(postReactions, ({ one }) => ({
  post: one(posts, {
    fields: [postReactions.postId],
    references: [posts.id],
  }),
  user: one(profiles, {
    fields: [postReactions.userId],
    references: [profiles.id],
  }),
}))

export const postCommentReactionsRelations = relations(
  postCommentReactions,
  ({ one }) => ({
    comment: one(postComments, {
      fields: [postCommentReactions.commentId],
      references: [postComments.id],
    }),
    user: one(profiles, {
      fields: [postCommentReactions.userId],
      references: [profiles.id],
    }),
  }),
)

export const postNotificationsRelations = relations(
  postNotifications,
  ({ one }) => ({
    user: one(profiles, {
      fields: [postNotifications.userId],
      references: [profiles.id],
    }),
    post: one(posts, {
      fields: [postNotifications.postId],
      references: [posts.id],
    }),
    comment: one(postComments, {
      fields: [postNotifications.commentId],
      references: [postComments.id],
    }),
  }),
)

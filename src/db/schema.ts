import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = pgEnum("user_role", [
  "student",
  "teacher",
  "admin",
]);
export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "pending",
  "active",
  "completed",
  "dropped",
]);
export const submissionStatusEnum = pgEnum("submission_status", [
  "draft",
  "submitted",
  "graded",
  "returned",
]);
export const inquiryStatusEnum = pgEnum("inquiry_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);
export const mediaTypeEnum = pgEnum("media_type", [
  "video",
  "audio",
  "document",
  "image",
  "other",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "announcement",
  "assignment",
  "grade",
  "inquiry",
  "enrollment",
  "system",
]);

// ============================================================================
// TABLES
// ============================================================================

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull().unique(),
    fullName: text("full_name").notNull(),
    role: userRoleEnum("role").notNull().default("student"),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    emailNotifications: boolean("email_notifications").default(true),
    notifyEnrollmentStatus: boolean("notify_enrollment_status").default(true),
    notifyNewAssignments: boolean("notify_new_assignments").default(true),
    notifyGrades: boolean("notify_grades").default(true),
    notifyInquiries: boolean("notify_inquiries").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    pgPolicy("users_view_own_profile", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.id}`,
    }),
    pgPolicy("users_update_own_profile", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.id}`,
    }),
    pgPolicy("admins_view_all_profiles", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM profiles WHERE id = ${authUid} AND role = 'admin')`,
    }),
    pgPolicy("admins_manage_all_profiles", {
      for: "all",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM profiles WHERE id = ${authUid} AND role = 'admin')`,
    }),
  ],
);

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => profiles.id),
    thumbnailUrl: text("thumbnail_url"),
    isPublished: boolean("is_published").default(false),
    orderIndex: integer("order_index").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    pgPolicy("view_published_courses", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.isPublished} = true`,
    }),
    pgPolicy("teachers_manage_own_courses", {
      for: "all",
      to: authenticatedRole,
      using: sql`${table.teacherId} = ${authUid}`,
    }),
    pgPolicy("admins_manage_all_courses", {
      for: "all",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM ${profiles} WHERE id = ${authUid} AND role = 'admin')`,
    }),
  ],
);

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    pgPolicy("view_modules_enrolled_courses", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (
      SELECT 1 FROM ${enrollments} e 
      JOIN ${courses} c ON c.id = e.course_id 
      WHERE e.student_id = ${authUid}
      AND e.status = 'active' 
      AND c.id = ${table.courseId}
    )`,
    }),
    pgPolicy("teachers_manage_own_modules", {
      for: "all",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM ${courses} WHERE id = ${table.courseId} AND teacher_id = ${authUid})`,
    }),
    pgPolicy("admins_manage_all_modules", {
      for: "all",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM ${profiles} WHERE id = ${authUid} AND role = 'admin')`,
    }),
  ],
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content"),
    videoUrl: text("video_url"),
    duration: integer("duration"),
    orderIndex: integer("order_index").notNull().default(0),
    zoomMeetingId: text("zoom_meeting_id"),
    zoomPassword: text("zoom_password"),
    scheduledTime: timestamp("scheduled_time"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    pgPolicy("view_lessons_enrolled_courses", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (
      SELECT 1 FROM ${modules} m
      JOIN ${courses} c ON c.id = m.course_id
      JOIN ${enrollments} e ON e.course_id = c.id
      WHERE m.id = ${table.moduleId}
      AND e.student_id = ${authUid}
      AND e.status = 'active'
    )`,
    }),
    pgPolicy("teachers_manage_own_lessons", {
      for: "all",
      to: authenticatedRole,
      using: sql`EXISTS (
      SELECT 1 FROM ${modules} m
      JOIN ${courses} c ON c.id = m.course_id
      WHERE m.id = ${table.moduleId} AND c.teacher_id = ${authUid}
    )`,
    }),
    pgPolicy("admins_manage_all_lessons", {
      for: "all",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM ${profiles} WHERE id = ${authUid} AND role = 'admin')`,
    }),
  ],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    status: enrollmentStatusEnum("status").notNull().default("pending"),
    approvedBy: uuid("approved_by").references(() => profiles.id),
    approvedAt: timestamp("approved_at"),
    rejectionReason: text("rejection_reason"),
    enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    pgPolicy("students_view_own_enrollments", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.studentId} = ${authUid}`,
    }),
    pgPolicy("students_insert_own_enrollments", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${table.studentId} = ${authUid} AND ${table.status} = 'pending'`,
    }),
    pgPolicy("teachers_view_course_enrollments", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM ${courses} WHERE id = ${table.courseId} AND teacher_id = ${authUid})`,
    }),
    pgPolicy("admins_manage_all_enrollments", {
      for: "all",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM ${profiles} WHERE id = ${authUid} AND role = 'admin')`,
    }),
  ],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    completed: boolean("completed").default(false),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    pgPolicy("students_manage_own_progress", {
      for: "all",
      to: authenticatedRole,
      using: sql`${table.studentId} = ${authUid}`,
      withCheck: sql`${table.studentId} = ${authUid}`,
    }),
    pgPolicy("teachers_view_course_progress", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (
      SELECT 1 FROM ${lessons} l
      JOIN ${modules} m ON m.id = l.module_id
      JOIN ${courses} c ON c.id = m.course_id
      WHERE l.id = ${table.lessonId} AND c.teacher_id = ${authUid}
    )`,
    }),
    pgPolicy("admins_view_all_progress", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM ${profiles} WHERE id = ${authUid} AND role = 'admin')`,
    }),
  ],
);

export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    dueDate: timestamp("due_date"),
    maxGrade: integer("max_grade").default(100),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    pgPolicy("students_view_enrolled_assignments", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (
      SELECT 1 FROM ${enrollments}
      WHERE course_id = ${table.courseId}
      AND student_id = ${authUid}
      AND status = 'active'
    )`,
    }),
    pgPolicy("teachers_manage_own_assignments", {
      for: "all",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM ${courses} WHERE id = ${table.courseId} AND teacher_id = ${authUid})`,
    }),
    pgPolicy("admins_manage_all_assignments", {
      for: "all",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM ${profiles} WHERE id = ${authUid} AND role = 'admin')`,
    }),
  ],
);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    content: text("content"),
    fileUrl: text("file_url"),
    status: submissionStatusEnum("status").notNull().default("draft"),
    grade: integer("grade"),
    feedback: text("feedback"),
    submittedAt: timestamp("submitted_at"),
    gradedAt: timestamp("graded_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    pgPolicy("students_manage_own_submissions", {
      for: "all",
      to: authenticatedRole,
      using: sql`${table.studentId} = ${authUid}`,
      withCheck: sql`${table.studentId} = ${authUid}`,
    }),
    pgPolicy("teachers_view_course_submissions", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (
      SELECT 1 FROM ${assignments} a
      JOIN ${courses} c ON c.id = a.course_id
      WHERE a.id = ${table.assignmentId} AND c.teacher_id = ${authUid}
    )`,
    }),
    pgPolicy("teachers_grade_course_submissions", {
      for: "update",
      to: authenticatedRole,
      using: sql`EXISTS (
      SELECT 1 FROM ${assignments} a
      JOIN ${courses} c ON c.id = a.course_id
      WHERE a.id = ${table.assignmentId} AND c.teacher_id = ${authUid}
    )`,
    }),
    pgPolicy("admins_manage_all_submissions", {
      for: "all",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM ${profiles} WHERE id = ${authUid} AND role = 'admin')`,
    }),
  ],
);

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: inquiryStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    pgPolicy("students_manage_own_inquiries", {
      for: "all",
      to: authenticatedRole,
      using: sql`${table.studentId} = ${authUid}`,
      withCheck: sql`${table.studentId} = ${authUid}`,
    }),
    pgPolicy("teachers_view_course_inquiries", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM ${courses} WHERE id = ${table.courseId} AND teacher_id = ${authUid})`,
    }),
    pgPolicy("teachers_update_course_inquiries", {
      for: "update",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM ${courses} WHERE id = ${table.courseId} AND teacher_id = ${authUid})`,
    }),
    pgPolicy("admins_manage_all_inquiries", {
      for: "all",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM ${profiles} WHERE id = ${authUid} AND role = 'admin')`,
    }),
  ],
);

export const inquiryResponses = pgTable(
  "inquiry_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    responderId: uuid("responder_id")
      .notNull()
      .references(() => profiles.id),
    message: text("message").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    pgPolicy("view_inquiry_responses", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (
      SELECT 1 FROM ${inquiries} i
      WHERE i.id = ${table.inquiryId}
      AND (i.student_id = ${authUid} OR EXISTS (
        SELECT 1 FROM ${courses} c WHERE c.id = i.course_id AND c.teacher_id = ${authUid}
      ))
    )`,
    }),
    pgPolicy("teachers_respond_to_inquiries", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`EXISTS (
      SELECT 1 FROM ${inquiries} i
      JOIN ${courses} c ON c.id = i.course_id
      WHERE i.id = ${table.inquiryId} AND c.teacher_id = ${authUid}
    ) AND ${table.responderId} = ${authUid}`,
    }),
    pgPolicy("admins_manage_all_responses", {
      for: "all",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM ${profiles} WHERE id = ${authUid} AND role = 'admin')`,
    }),
  ],
);

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id").references(() => courses.id, {
      onDelete: "cascade",
    }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profiles.id),
    title: text("title").notNull(),
    content: text("content").notNull(),
    isGlobal: boolean("is_global").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    pgPolicy("view_global_announcements", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.isGlobal} = true`,
    }),
    pgPolicy("view_course_announcements", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.courseId} IS NOT NULL AND EXISTS (
      SELECT 1 FROM ${enrollments}
      WHERE course_id = ${table.courseId}
      AND student_id = ${authUid}
      AND status = 'active'
    )`,
    }),
    pgPolicy("teachers_manage_own_announcements", {
      for: "all",
      to: authenticatedRole,
      using: sql`${table.authorId} = ${authUid} OR (${table.courseId} IS NOT NULL AND EXISTS (
      SELECT 1 FROM ${courses} WHERE id = ${table.courseId} AND teacher_id = ${authUid}
    ))`,
    }),
    pgPolicy("admins_manage_all_announcements", {
      for: "all",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM ${profiles} WHERE id = ${authUid} AND role = 'admin')`,
    }),
  ],
);

export const mediaLibrary = pgTable(
  "media_library",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uploaderId: uuid("uploader_id")
      .notNull()
      .references(() => profiles.id),
    courseId: uuid("course_id").references(() => courses.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    description: text("description"),
    fileUrl: text("file_url").notNull(),
    fileType: mediaTypeEnum("file_type").notNull(),
    fileSize: integer("file_size"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    pgPolicy("view_course_media", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.courseId} IS NULL OR EXISTS (
      SELECT 1 FROM ${enrollments}
      WHERE course_id = ${table.courseId}
      AND student_id = ${authUid}
      AND status = 'active'
    ) OR EXISTS (
      SELECT 1 FROM ${courses} WHERE id = ${table.courseId} AND teacher_id = ${authUid}
    )`,
    }),
    pgPolicy("teachers_manage_own_media", {
      for: "all",
      to: authenticatedRole,
      using: sql`${table.uploaderId} = ${authUid}`,
      withCheck: sql`${table.uploaderId} = ${authUid}`,
    }),
    pgPolicy("admins_manage_all_media", {
      for: "all",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM ${profiles} WHERE id = ${authUid} AND role = 'admin')`,
    }),
  ],
);

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id").references(() => courses.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    description: text("description"),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    location: text("location"),
    zoomLink: text("zoom_link"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    pgPolicy("view_global_events", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.courseId} IS NULL`,
    }),
    pgPolicy("view_course_events", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.courseId} IS NOT NULL AND EXISTS (
      SELECT 1 FROM ${enrollments}
      WHERE course_id = ${table.courseId}
      AND student_id = ${authUid}
      AND status = 'active'
    )`,
    }),
    pgPolicy("teachers_manage_own_events", {
      for: "all",
      to: authenticatedRole,
      using: sql`${table.courseId} IS NOT NULL AND EXISTS (
      SELECT 1 FROM ${courses} WHERE id = ${table.courseId} AND teacher_id = ${authUid}
    )`,
    }),
    pgPolicy("admins_manage_all_events", {
      for: "all",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM ${profiles} WHERE id = ${authUid} AND role = 'admin')`,
    }),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: notificationTypeEnum("type").notNull(),
    link: text("link"),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    pgPolicy("users_manage_own_notifications", {
      for: "all",
      to: authenticatedRole,
      using: sql`${table.userId} = ${authUid}`,
      withCheck: sql`${table.userId} = ${authUid}`,
    }),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const profilesRelations = relations(profiles, ({ many }) => ({
  coursesTeaching: many(courses),
  enrollments: many(enrollments),
  submissions: many(submissions),
  inquiries: many(inquiries),
  inquiryResponses: many(inquiryResponses),
  announcements: many(announcements),
  mediaUploads: many(mediaLibrary),
  notifications: many(notifications),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  teacher: one(profiles, {
    fields: [courses.teacherId],
    references: [profiles.id],
  }),
  modules: many(modules),
  enrollments: many(enrollments),
  assignments: many(assignments),
  inquiries: many(inquiries),
  announcements: many(announcements),
  mediaFiles: many(mediaLibrary),
  calendarEvents: many(calendarEvents),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, {
    fields: [modules.courseId],
    references: [courses.id],
  }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  module: one(modules, {
    fields: [lessons.moduleId],
    references: [modules.id],
  }),
  progress: many(lessonProgress),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(profiles, {
    fields: [enrollments.studentId],
    references: [profiles.id],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
  approver: one(profiles, {
    fields: [enrollments.approvedBy],
    references: [profiles.id],
  }),
}));

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
  student: one(profiles, {
    fields: [lessonProgress.studentId],
    references: [profiles.id],
  }),
  lesson: one(lessons, {
    fields: [lessonProgress.lessonId],
    references: [lessons.id],
  }),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  course: one(courses, {
    fields: [assignments.courseId],
    references: [courses.id],
  }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignmentId],
    references: [assignments.id],
  }),
  student: one(profiles, {
    fields: [submissions.studentId],
    references: [profiles.id],
  }),
}));

export const inquiriesRelations = relations(inquiries, ({ one, many }) => ({
  student: one(profiles, {
    fields: [inquiries.studentId],
    references: [profiles.id],
  }),
  course: one(courses, {
    fields: [inquiries.courseId],
    references: [courses.id],
  }),
  responses: many(inquiryResponses),
}));

export const inquiryResponsesRelations = relations(
  inquiryResponses,
  ({ one }) => ({
    inquiry: one(inquiries, {
      fields: [inquiryResponses.inquiryId],
      references: [inquiries.id],
    }),
    responder: one(profiles, {
      fields: [inquiryResponses.responderId],
      references: [profiles.id],
    }),
  }),
);

export const announcementsRelations = relations(announcements, ({ one }) => ({
  author: one(profiles, {
    fields: [announcements.authorId],
    references: [profiles.id],
  }),
  course: one(courses, {
    fields: [announcements.courseId],
    references: [courses.id],
  }),
}));

export const mediaLibraryRelations = relations(mediaLibrary, ({ one }) => ({
  uploader: one(profiles, {
    fields: [mediaLibrary.uploaderId],
    references: [profiles.id],
  }),
  course: one(courses, {
    fields: [mediaLibrary.courseId],
    references: [courses.id],
  }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  course: one(courses, {
    fields: [calendarEvents.courseId],
    references: [courses.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(profiles, {
    fields: [notifications.userId],
    references: [profiles.id],
  }),
}));

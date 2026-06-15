import { relations } from 'drizzle-orm'
import { accountSecurity } from './account-security.schema'
import { announcements } from './announcement.schema'
import { assignments, submissions } from './assignment.schema'
import { calendarEvents } from './calendar.schema'
import {
  courseTeachers,
  courses,
  lessonProgress,
  lessons,
} from './course.schema'
import { enrollmentReviewerAssignments, enrollments } from './enrollment.schema'
import { invitations } from './invitation.schema'
import { mediaLibrary } from './media.schema'
import { notifications } from './notification.schema'
import {
  postCommentReactions,
  postComments,
  postNotifications,
  postReactions,
  posts,
} from './post.schema'
import { profiles } from './profile.schema'
import { zoomLinks } from './zoom.schema'

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  accountSecurity: one(accountSecurity, {
    fields: [profiles.id],
    references: [accountSecurity.profileId],
  }),
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
  reviewerAssignments: many(enrollmentReviewerAssignments),
}))

export const accountSecurityRelations = relations(
  accountSecurity,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [accountSecurity.profileId],
      references: [profiles.id],
    }),
  }),
)

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

export const enrollmentReviewerAssignmentsRelations = relations(
  enrollmentReviewerAssignments,
  ({ one }) => ({
    enrollment: one(enrollments, {
      fields: [enrollmentReviewerAssignments.enrollmentId],
      references: [enrollments.id],
    }),
    reviewer: one(profiles, {
      fields: [enrollmentReviewerAssignments.reviewerId],
      references: [profiles.id],
    }),
  }),
)

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

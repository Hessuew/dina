import { relations } from 'drizzle-orm'
import { accountSecurity } from './account-security.schema'
import { announcements } from './announcement.schema'
import { assignments, submissions } from './assignment.schema'
import { calendarEvents } from './calendar.schema'
import { attendancePresents, attendanceSessions } from './attendance.schema'
import {
  courseSubstitutes,
  courseTeachers,
  courses,
  lessonProgress,
  lessons,
} from './course.schema'
import { enrollmentReviewerAssignments, enrollments } from './enrollment.schema'
import {
  examAnswers,
  examAttempts,
  examQuestionOptions,
  examQuestions,
  exams,
} from './exam.schema'
import {
  discipleshipAssignments,
  discipleshipGroups,
  discipleshipPairs,
} from './discipleship.schema'
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
  courseSubstitutesAsSubstitute: many(courseSubstitutes, {
    relationName: 'substitute',
  }),
  courseSubstitutesAsAbsent: many(courseSubstitutes, {
    relationName: 'absent',
  }),
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
  discipleshipAsStudent: many(discipleshipAssignments, {
    relationName: 'student',
  }),
  discipleshipAsTeacher: many(discipleshipAssignments, {
    relationName: 'teacher',
  }),
  discipleshipPairs: many(discipleshipPairs),
  discipleshipGroup: one(discipleshipGroups, {
    fields: [profiles.id],
    references: [discipleshipGroups.teacherId],
  }),
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
  courseSubstitutes: many(courseSubstitutes),
  lessons: many(lessons),
  attendanceSessions: many(attendanceSessions),
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

export const courseSubstitutesRelations = relations(
  courseSubstitutes,
  ({ one }) => ({
    course: one(courses, {
      fields: [courseSubstitutes.courseId],
      references: [courses.id],
    }),
    substitute: one(profiles, {
      fields: [courseSubstitutes.substituteTeacherId],
      references: [profiles.id],
      relationName: 'substitute',
    }),
    absent: one(profiles, {
      fields: [courseSubstitutes.absentTeacherId],
      references: [profiles.id],
      relationName: 'absent',
    }),
  }),
)

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  course: one(courses, {
    fields: [lessons.courseId],
    references: [courses.id],
  }),
  progress: many(lessonProgress),
  assignments: many(assignments),
  attendanceSession: one(attendanceSessions, {
    fields: [lessons.id],
    references: [attendanceSessions.lessonId],
  }),
}))

export const attendanceSessionsRelations = relations(
  attendanceSessions,
  ({ one, many }) => ({
    course: one(courses, {
      fields: [attendanceSessions.courseId],
      references: [courses.id],
    }),
    lesson: one(lessons, {
      fields: [attendanceSessions.lessonId],
      references: [lessons.id],
    }),
    openedByProfile: one(profiles, {
      fields: [attendanceSessions.openedBy],
      references: [profiles.id],
    }),
    presents: many(attendancePresents),
  }),
)

export const attendancePresentsRelations = relations(
  attendancePresents,
  ({ one }) => ({
    session: one(attendanceSessions, {
      fields: [attendancePresents.sessionId],
      references: [attendanceSessions.id],
    }),
    student: one(profiles, {
      fields: [attendancePresents.studentId],
      references: [profiles.id],
    }),
  }),
)

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

export const discipleshipGroupsRelations = relations(
  discipleshipGroups,
  ({ one }) => ({
    teacher: one(profiles, {
      fields: [discipleshipGroups.teacherId],
      references: [profiles.id],
    }),
  }),
)

export const discipleshipPairsRelations = relations(
  discipleshipPairs,
  ({ one, many }) => ({
    teacher: one(profiles, {
      fields: [discipleshipPairs.teacherId],
      references: [profiles.id],
    }),
    members: many(discipleshipAssignments),
  }),
)

export const discipleshipAssignmentsRelations = relations(
  discipleshipAssignments,
  ({ one }) => ({
    student: one(profiles, {
      fields: [discipleshipAssignments.studentId],
      references: [profiles.id],
      relationName: 'student',
    }),
    teacher: one(profiles, {
      fields: [discipleshipAssignments.teacherId],
      references: [profiles.id],
      relationName: 'teacher',
    }),
    pair: one(discipleshipPairs, {
      fields: [discipleshipAssignments.pairId],
      references: [discipleshipPairs.id],
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

export const examsRelations = relations(exams, ({ one, many }) => ({
  creator: one(profiles, {
    fields: [exams.createdBy],
    references: [profiles.id],
  }),
  questions: many(examQuestions),
  attempts: many(examAttempts),
}))

export const examQuestionsRelations = relations(
  examQuestions,
  ({ one, many }) => ({
    exam: one(exams, {
      fields: [examQuestions.examId],
      references: [exams.id],
    }),
    options: many(examQuestionOptions),
    answers: many(examAnswers),
  }),
)

export const examQuestionOptionsRelations = relations(
  examQuestionOptions,
  ({ one }) => ({
    question: one(examQuestions, {
      fields: [examQuestionOptions.questionId],
      references: [examQuestions.id],
    }),
  }),
)

export const examAttemptsRelations = relations(
  examAttempts,
  ({ one, many }) => ({
    exam: one(exams, {
      fields: [examAttempts.examId],
      references: [exams.id],
    }),
    student: one(profiles, {
      fields: [examAttempts.studentId],
      references: [profiles.id],
    }),
    answers: many(examAnswers),
  }),
)

export const examAnswersRelations = relations(examAnswers, ({ one }) => ({
  attempt: one(examAttempts, {
    fields: [examAnswers.attemptId],
    references: [examAttempts.id],
  }),
  question: one(examQuestions, {
    fields: [examAnswers.questionId],
    references: [examQuestions.id],
  }),
  selectedOption: one(examQuestionOptions, {
    fields: [examAnswers.selectedOptionId],
    references: [examQuestionOptions.id],
  }),
}))

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

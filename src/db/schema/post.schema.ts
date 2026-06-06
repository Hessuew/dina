import {
  boolean,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { postNotificationEventEnum } from './enums.schema'
import { profiles } from './profile.schema'
import { courses } from './course.schema'

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

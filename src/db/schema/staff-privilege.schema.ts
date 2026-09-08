import { pgPolicy, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { staffPrivilegeEnum } from './enums.schema'
import { profiles } from './profile.schema'

/**
 * Named Staff Privilege grants. Only Teacher-users hold live rows.
 * Admin insert/delete. Unique (user, privilege).
 */
export const staffPrivileges = pgTable(
  'staff_privileges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    privilege: staffPrivilegeEnum('privilege').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('staff_privileges_user_privilege_unique').on(
      table.userId,
      table.privilege,
    ),
    pgPolicy('admins_manage_staff_privileges', {
      for: 'all',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)

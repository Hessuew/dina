```mdx
Policies

To fully leverage RLS, you can define policies within a Drizzle table.
info

In PostgreSQL, policies should be linked to an existing table. Since policies are always associated with a specific table, we decided that policy definitions should be defined as a parameter of pgTable

Example of pgPolicy with all available properties

import { sql } from 'drizzle-orm'
import { integer, pgPolicy, pgRole, pgTable } from 'drizzle-orm/pg-core'

export const admin = pgRole('admin')

export const users = pgTable(
  'users',
  {
    id: integer(),
  },
  (t) => [
    pgPolicy('policy', {
      as: 'permissive',
      to: admin,
      for: 'delete',
      using: sql``,
      withCheck: sql``,
    }),
  ],
)

Policy options
as Possible values are permissive or restrictive
to Specifies the role to which the policy applies. Possible values include public, current_role, current_user, session_user, or any other role name as a string. You can also reference a pgRole object.
for Defines the commands this policy will be applied to. Possible values are all, select, insert, update, delete.
using The SQL statement that will be applied to the USING part of the policy creation statement.
withCheck An SQL statement that will be applied to the WITH CHECK part of the policy creation statement.

Link Policy to an existing table

There are situations where you need to link a policy to an existing table in your database. The most common use case is with database providers like Neon or Supabase, where you need to add a policy to their existing tables. In this case, you can use the .link() API

import { sql } from 'drizzle-orm'
import { pgPolicy } from 'drizzle-orm/pg-core'
import { authenticatedRole, realtimeMessages } from 'drizzle-orm/supabase'

export const policy = pgPolicy('authenticated role insert policy', {
  for: 'insert',
  to: authenticatedRole,
  using: sql``,
}).link(realtimeMessages)
```

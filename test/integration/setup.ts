// Per-file setup for integration tests. setupFiles run once per test file, so the
// prelude + migrations build the schema once, then each test starts from a clean DB.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach } from 'vitest'
import { getPgliteClient, truncateAll } from 'test/integration/db'
import {
  DefaultAuthorizationService,
  setAuthorizationService,
} from '@/utils/authz'

// Use the real DB-backed authz so role checks exercise seeded `profiles` rows.
// (Reset in case another test swapped in a TestAuthorizationService.)
setAuthorizationService(new DefaultAuthorizationService())

const client = getPgliteClient()

const prelude = readFileSync(
  fileURLToPath(new URL('./prelude.sql', import.meta.url)),
  'utf8',
)

await client.exec(prelude)
await runMigrations()

beforeEach(async () => {
  await truncateAll()
})

// Runs the real `drizzle/` migration SQL in journal order, statement by statement.
// We don't use drizzle's pglite migrator because PGlite tracks RLS-policy → table
// dependencies differently from the Supabase Postgres these migrations were authored
// against: a `DROP TABLE ... CASCADE` can auto-drop a policy defined on *another*
// table whose USING clause references it, after which the migration's own explicit
// `DROP POLICY` hits "policy does not exist". RLS is inert in these tests (PGlite
// runs as superuser/owner, which bypasses RLS — as production does via Hyperdrive),
// so we tolerate ONLY policy-statement idempotency errors and let every other
// failure (tables, columns, enums, constraints) throw loudly.
async function runMigrations() {
  const dir = join(process.cwd(), 'drizzle')
  const journal = JSON.parse(
    readFileSync(join(dir, 'meta', '_journal.json'), 'utf8'),
  ) as { entries: Array<{ tag: string }> }

  for (const { tag } of journal.entries) {
    const sql = readFileSync(join(dir, `${tag}.sql`), 'utf8')
    for (const raw of sql.split('--> statement-breakpoint')) {
      const stmt = raw.trim()
      if (!stmt) continue
      try {
        await client.exec(stmt)
      } catch (err) {
        const code = (err as { code?: string }).code
        const isPolicyStmt = /policy|row level security/i.test(stmt)
        // 42704 undefined_object, 42710 duplicate_object
        if (isPolicyStmt && (code === '42704' || code === '42710')) {
          // Idempotent policy-statement skip. Expected (see header comment); log
          // only when explicitly debugging setup.
          if (process.env.DEBUG_INTEGRATION_SETUP) {
            console.warn(
              `[integration setup] Skipping idempotent policy statement (code: ${code}): ${stmt.slice(0, 100)}...`,
            )
          }
          continue
        }
        throw err
      }
    }
  }
}

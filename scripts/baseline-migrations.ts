/**
 * Generates SQL INSERT statements to baseline drizzle migrations.
 *
 * Use when the DB schema is already at the latest state (applied via db:push)
 * but drizzle.__drizzle_migrations only has a partial record.
 *
 * Usage:
 *   bun run scripts/baseline-migrations.ts | pbcopy
 *   # then paste into Supabase SQL editor and run
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const DRIZZLE_DIR = path.join(process.cwd(), 'drizzle')
const JOURNAL_PATH = path.join(DRIZZLE_DIR, 'meta', '_journal.json')

const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8')) as {
  entries: Array<{ idx: number; tag: string; when: number }>
}

const lines: Array<string> = [
  '-- Baseline: record already-applied migrations in drizzle.__drizzle_migrations',
  '-- Safe to run multiple times (skips duplicates via hash check)',
  '',
]

for (const entry of journal.entries) {
  const sqlPath = path.join(DRIZZLE_DIR, `${entry.tag}.sql`)
  const content = fs.readFileSync(sqlPath, 'utf8')
  const hash = crypto.createHash('sha256').update(content).digest('hex')

  lines.push(
    `-- ${entry.idx}: ${entry.tag}`,
    `INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at")`,
    `SELECT '${hash}', ${entry.when}`,
    `WHERE NOT EXISTS (`,
    `  SELECT 1 FROM drizzle."__drizzle_migrations" WHERE hash = '${hash}'`,
    `);`,
    '',
  )
}

console.log(lines.join('\n'))

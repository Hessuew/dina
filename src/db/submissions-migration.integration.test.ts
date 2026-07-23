import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { getPgliteClient } from 'test/integration/db'

const client = getPgliteClient()

afterEach(async () => {
  await client.exec('DROP SCHEMA IF EXISTS migration_0039 CASCADE;')
})

describe('0039 submission deduplication migration', () => {
  it('merges answer, lifecycle, and grading data before deleting duplicates', async () => {
    await createLegacySubmissionsTable()
    await seedDuplicateSubmissions()
    await runMigration0039()

    const { rows } = await client.query<{
      content: string
      status: string
      grade: number
      feedback: string
      submitted_at: string
      created_at: string
      updated_at: string
    }>(`
      SELECT
        "content",
        "status",
        "grade",
        "feedback",
        to_char("submitted_at", 'YYYY-MM-DD HH24:MI:SS') AS "submitted_at",
        to_char("created_at", 'YYYY-MM-DD HH24:MI:SS') AS "created_at",
        to_char("updated_at", 'YYYY-MM-DD HH24:MI:SS') AS "updated_at"
      FROM migration_0039.submissions
    `)

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      content: 'latest answer',
      status: 'returned',
      grade: 92,
      feedback: 'graded feedback',
    })
    expect(rows[0]?.submitted_at).toBe('2026-01-02 10:00:00')
    expect(rows[0]?.created_at).toBe('2026-01-01 10:00:00')
    expect(rows[0]?.updated_at).toBe('2026-01-04 10:00:00')
  })
})

async function createLegacySubmissionsTable() {
  await client.exec(`
    CREATE SCHEMA migration_0039;
    CREATE TABLE migration_0039.submissions (
      id uuid PRIMARY KEY,
      assignment_id uuid NOT NULL,
      student_id uuid NOT NULL,
      content text,
      status public.submission_status NOT NULL,
      grade integer,
      feedback text,
      submitted_at timestamp,
      graded_at timestamp,
      created_at timestamp NOT NULL,
      updated_at timestamp NOT NULL
    );
  `)
}

async function seedDuplicateSubmissions() {
  await client.exec(`
    INSERT INTO migration_0039.submissions VALUES
      (
        '00000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        'returned answer', 'returned', NULL, NULL,
        '2026-01-02T10:00:00Z', NULL,
        '2026-01-01T10:00:00Z', '2026-01-02T10:00:00Z'
      ),
      (
        '00000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        'graded answer', 'submitted', 92, 'graded feedback',
        '2026-01-02T09:00:00Z', '2026-01-03T10:00:00Z',
        '2026-01-01T11:00:00Z', '2026-01-03T10:00:00Z'
      ),
      (
        '00000000-0000-4000-8000-000000000003',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        'latest answer', 'draft', NULL, NULL, NULL, NULL,
        '2026-01-01T12:00:00Z', '2026-01-04T10:00:00Z'
      );
  `)
}

async function runMigration0039() {
  const sql = readFileSync(
    join(
      process.cwd(),
      'drizzle/0039_submissions_assignment_student_unique.sql',
    ),
    'utf8',
  )
  await client.exec('SET search_path TO migration_0039, public;')
  try {
    for (const statement of sql.split('--> statement-breakpoint')) {
      if (statement.trim()) await client.exec(statement)
    }
  } finally {
    await client.exec('SET search_path TO public;')
  }
}

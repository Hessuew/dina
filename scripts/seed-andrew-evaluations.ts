/**
 * One-off seed: Andrew's enrollment evaluations + reviewer assignments.
 *
 * Andrew reviewed the applications from US / UK / South Africa / New Zealand /
 * Papua New Guinea. This script writes his verdicts (from enrolment_andrew.md)
 * as `enrollment_evaluations` rows authored by him, and assigns him as reviewer
 * (`enrollment_reviewer_assignments`) on every enrollment it touches.
 *
 *   Accept set : the 20 named applicants  -> score 3 + admission category
 *                (Noel Merrick & Esperanza Igarashi are "Reserve list" -> score 2, no category)
 *   Reject set : every OTHER enrollment from those 5 countries created BEFORE
 *                2026-06-01 -> score 0, no category
 *   Skip set   : enrollments from those countries created ON/AFTER 2026-06-01
 *                -> left untouched (no evaluation, no assignment)
 *
 * "From a country" = nationalityCitizenship OR currentCountry matches (either field).
 *
 * Usage:
 *   bun run scripts/seed-andrew-evaluations.ts            # dry-run report only
 *   bun run scripts/seed-andrew-evaluations.ts --apply    # writes to the DB
 */
import 'dotenv/config'
import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Client } from 'pg'
import {
  enrollmentEvaluations,
  enrollmentReviewerAssignments,
  enrollments,
  profiles,
} from '../src/db/schema'

const ANDREW_ID = '44eeceea-736b-4ef7-a973-52664a65fd26'
const CUTOFF = new Date('2026-06-01T00:00:00Z')
const APPLY = process.argv.includes('--apply')

// File term -> DB enum (enrollment_admission_category)
const CATEGORY_MAP = {
  established_leader: 'established',
  emerging_leader: 'emerging',
  young_believer: 'new',
} as const

// Reserve-list applicants: score 2, no category (DB forbids a category when score < 3).
const RESERVE = new Set(['Noel Merrick', 'Esperanza Igarashi'])

type FileCategory = keyof typeof CATEGORY_MAP

type Entry = {
  name: string
  birthYear: number
  category: FileCategory
  comment: string
  /** Optional already-normalized DB name to also match against (for name variants). */
  alias?: string
  /** Optional explicit enrollment id (when the stored name can't be matched). */
  enrollmentId?: string
}

// Verdicts copied verbatim from enrolment_andrew.md (20 applicants).
const ENTRIES: Array<Entry> = [
  {
    name: 'Dereck Gregan',
    birthYear: 1963,
    category: 'established_leader',
    comment: 'Needs discipleship teaching materials for congregation; pastor.',
    alias: 'dereck',
  },
  {
    name: 'Edson Maburutse',
    birthYear: 1963,
    category: 'established_leader',
    comment:
      'Missionary minister seeking discipleship resources for work in Zimbabwe.',
  },
  {
    name: 'Noel Merrick',
    birthYear: 1952,
    category: 'established_leader',
    comment: 'Reserve list. Does not actively need discipleship.',
  },
  {
    name: 'Peter Charles Fulton',
    birthYear: 1953,
    category: 'established_leader',
    comment:
      'Pastor seeking training to strengthen discipleship in local church.',
    enrollmentId: '90a6caa6-0169-454d-a34e-87817dffaf94',
  },
  {
    name: 'Ntsako Mganu Kubayi',
    birthYear: 1990,
    category: 'emerging_leader',
    comment: 'Youth pastor; interested in future pastoral leadership.',
  },
  {
    name: 'Frederick Fortune',
    birthYear: 1968,
    category: 'emerging_leader',
    comment: 'Wants stronger biblical knowledge and confidence in evangelism.',
  },
  {
    name: 'Andrew Christopher Wagner',
    birthYear: 1964,
    category: 'emerging_leader',
    comment: 'Focused on disciple-making rather than only conversion.',
  },
  {
    name: 'Ronald L. Garland Jr',
    birthYear: 1966,
    category: 'emerging_leader',
    comment: 'Missionary and lifelong learner pursuing spiritual growth.',
  },
  {
    name: 'Tina Haney',
    birthYear: 1976,
    category: 'emerging_leader',
    comment: 'Seeking deeper biblical understanding to help youth and others.',
  },
  {
    name: 'Suneeta Chintu Kapoor',
    birthYear: 1976,
    category: 'emerging_leader',
    comment: 'Sunday school teacher seeking training for youth ministry.',
  },
  {
    name: 'Charles Motimele',
    birthYear: 1963,
    category: 'young_believer',
    comment: '',
  },
  {
    name: 'Tshilidzi Samuel Magau',
    birthYear: 1968,
    category: 'young_believer',
    comment: '',
  },
  {
    name: 'Macdonald Mohapi',
    birthYear: 1987,
    category: 'young_believer',
    comment: '',
  },
  {
    name: 'Michael Sheppard',
    birthYear: 1988,
    category: 'young_believer',
    comment: 'Wants to grow in evangelism, outreach, and witnessing.',
  },
  {
    name: 'Qanna Cohen',
    birthYear: 1993,
    category: 'young_believer',
    comment:
      'Ordained minister seeking additional growth in knowledge and wisdom.',
  },
  {
    name: 'Chimaobi Ude',
    birthYear: 1977,
    category: 'young_believer',
    comment: 'Seeking deeper discipleship and spiritual stability.',
  },
  {
    name: 'Esperanza Igarashi',
    birthYear: 1949,
    category: 'young_believer',
    comment:
      'Reserve list. Requires one-on-one interview. Verify age before acceptance.',
  },
  {
    name: 'Sheriffay Sankoh',
    birthYear: 1993,
    category: 'young_believer',
    comment: 'Seeking deeper understanding of Christ and personal calling.',
  },
  {
    name: 'Jermane Hibbs',
    birthYear: 1987,
    category: 'young_believer',
    comment: 'Recovering spiritual health; desires renewed growth in Christ.',
  },
  {
    name: 'Georgina George',
    birthYear: 1990,
    category: 'young_believer',
    comment:
      'Interested in learning how to become a disciple and share the Gospel.',
  },
]

// Name match: lowercase, drop parenthetical aliases "(...)", drop commas, collapse spaces.
// Handles "Ronald L. Garland, Jr" and "Qanna Cohen (Hollie Dawn Richards)".
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Country matching on the two free-text fields. Bare abbreviations must equal the
// whole trimmed field; full names match as substrings (catches adjective forms too,
// e.g. "america" -> "American", "south africa" -> "South African", "brit" -> "British").
const COUNTRY_ABBR = new Set(['us', 'usa', 'uk', 'nz', 'png', 'rsa'])
const COUNTRY_SUBSTR = [
  'united states',
  'america',
  'united kingdom',
  'great britain',
  'britain',
  'brit',
  'england',
  'scotland',
  'wales',
  'south africa',
  'new zealand',
  'papua new guinea',
]

function fieldMatchesCountry(v: string | null): boolean {
  if (!v) return false
  const t = v.trim().toLowerCase()
  if (COUNTRY_ABBR.has(t)) return true
  return COUNTRY_SUBSTR.some((p) => t.includes(p))
}

type Row = {
  id: string
  fullLegalName: string
  yearOfBirth: number
  nationalityCitizenship: string | null
  currentCountry: string | null
  createdAt: Date
}

function fromTargetCountry(r: Row): boolean {
  return (
    fieldMatchesCountry(r.nationalityCitizenship) ||
    fieldMatchesCountry(r.currentCountry)
  )
}

type EvalRow = {
  enrollmentId: string
  evaluatorId: string
  score: number
  admissionCategory: 'new' | 'emerging' | 'established' | null
  note: string | null
}

function maskHost(connectionString: string): string {
  try {
    const u = new URL(connectionString)
    return `${u.hostname}:${u.port || '5432'}${u.pathname}`
  } catch {
    return '(unparseable DATABASE_URL)'
  }
}

const day = (d: Date) => d.toISOString().slice(0, 10)

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL is not set.')
    process.exit(1)
  }

  const client = new Client({ connectionString })
  await client.connect()
  const db = drizzle(client)

  console.log(`\nDB host        : ${maskHost(connectionString)}`)
  console.log(
    `Mode           : ${APPLY ? 'APPLY (writes)' : 'DRY-RUN (no writes)'}`,
  )
  console.log(
    `Cutoff         : reject if created before ${CUTOFF.toISOString()}\n`,
  )

  // 1. Resolve Andrew.
  const [andrew] = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      role: profiles.role,
    })
    .from(profiles)
    .where(eq(profiles.id, ANDREW_ID))
  if (!andrew) {
    console.error(`ERROR: no profile with id ${ANDREW_ID}.`)
    await client.end()
    process.exit(1)
  }
  if (andrew.role !== 'teacher' && andrew.role !== 'admin') {
    console.error(
      `ERROR: profile ${ANDREW_ID} has role '${andrew.role}', expected teacher/admin.`,
    )
    await client.end()
    process.exit(1)
  }
  console.log(
    `Evaluator      : ${andrew.fullName} (${andrew.role}) ${andrew.id}\n`,
  )

  // Fetch all enrollments once; match + partition in JS.
  const all: Array<Row> = await db
    .select({
      id: enrollments.id,
      fullLegalName: enrollments.fullLegalName,
      yearOfBirth: enrollments.yearOfBirth,
      nationalityCitizenship: enrollments.nationalityCitizenship,
      currentCountry: enrollments.currentCountry,
      createdAt: enrollments.createdAt,
    })
    .from(enrollments)

  const byNorm = new Map<string, Array<Row>>()
  const byId = new Map<string, Row>()
  for (const r of all) {
    byId.set(r.id, r)
    const key = normalizeName(r.fullLegalName)
    const list = byNorm.get(key) ?? []
    list.push(r)
    byNorm.set(key, list)
  }

  // 2. Accept set — match each file entry (explicit enrollment id wins, else by name).
  const matched: Array<{ entry: Entry; row: Row }> = []
  const unmatched: Array<string> = []
  const ambiguous: Array<string> = []

  for (const entry of ENTRIES) {
    if (entry.enrollmentId) {
      const row = byId.get(entry.enrollmentId)
      if (row) matched.push({ entry, row })
      else unmatched.push(`${entry.name} (id ${entry.enrollmentId} not found)`)
      continue
    }
    const keys = [
      normalizeName(entry.name),
      ...(entry.alias ? [entry.alias] : []),
    ]
    const candidates = keys.flatMap((k) => byNorm.get(k) ?? [])
    let row = candidates.length === 1 ? candidates[0] : undefined
    if (candidates.length > 1) {
      const narrowed = candidates.filter(
        (r) => r.yearOfBirth === entry.birthYear,
      )
      row = narrowed.length === 1 ? narrowed[0] : undefined
    }
    if (row) matched.push({ entry, row })
    else if (candidates.length === 0) unmatched.push(entry.name)
    else ambiguous.push(`${entry.name} (birthYear ${entry.birthYear})`)
  }

  const acceptIds = new Set(matched.map((m) => m.row.id))

  // 3. Reject set + skip set (country pool minus the accept set).
  const fromCountry = all.filter(
    (r) => !acceptIds.has(r.id) && fromTargetCountry(r),
  )
  const rejectRows = fromCountry.filter((r) => r.createdAt < CUTOFF)
  const skipRows = fromCountry.filter((r) => r.createdAt >= CUTOFF)

  // --- Report ---
  console.log(`Accept set     : ${matched.length}/${ENTRIES.length} matched`)
  for (const { entry, row } of matched) {
    const reserve = RESERVE.has(entry.name)
    const score = reserve ? 2 : 3
    const cat = reserve ? '—' : CATEGORY_MAP[entry.category]
    const variant =
      normalizeName(entry.name) === normalizeName(row.fullLegalName)
        ? ''
        : `  [DB: "${row.fullLegalName}"]`
    console.log(`  ✓ ${entry.name} -> score ${score}, ${cat}${variant}`)
  }
  if (unmatched.length)
    console.log(
      `  UNMATCHED / absent (${unmatched.length}): ${unmatched.join(', ')}`,
    )
  if (ambiguous.length)
    console.log(`  AMBIGUOUS (${ambiguous.length}): ${ambiguous.join(', ')}`)

  console.log(
    `\nReject set     : ${rejectRows.length} (score 0, created before June 1, from countries, not accepted)`,
  )
  for (const r of rejectRows) {
    console.log(
      `  - ${r.fullLegalName.trim()} | nat=${r.nationalityCitizenship ?? '∅'} | country=${r.currentCountry ?? '∅'} | ${day(r.createdAt)}`,
    )
  }

  console.log(
    `\nSkip set       : ${skipRows.length} (created on/after June 1 — UNTOUCHED)`,
  )
  for (const r of skipRows) {
    console.log(
      `  - ${r.fullLegalName.trim()} | nat=${r.nationalityCitizenship ?? '∅'} | country=${r.currentCountry ?? '∅'} | ${day(r.createdAt)}`,
    )
  }

  const assignCount = acceptIds.size + rejectRows.length
  console.log(
    `\nWould write    : ${matched.length + rejectRows.length} evaluations, ${assignCount} assignments (skip-if-exists)\n`,
  )

  if (!APPLY) {
    console.log('DRY-RUN complete. Re-run with --apply to write.\n')
    await client.end()
    process.exit(0)
  }

  // 4. Apply — evaluations (upsert) + assignments (insert-if-absent), one transaction.
  const evalRows: Array<EvalRow> = [
    ...matched.map(({ entry, row }): EvalRow => {
      const reserve = RESERVE.has(entry.name)
      return {
        enrollmentId: row.id,
        evaluatorId: ANDREW_ID,
        score: reserve ? 2 : 3,
        admissionCategory: reserve ? null : CATEGORY_MAP[entry.category],
        note: entry.comment.trim() || null,
      }
    }),
    ...rejectRows.map(
      (r): EvalRow => ({
        enrollmentId: r.id,
        evaluatorId: ANDREW_ID,
        score: 0,
        admissionCategory: null,
        note: null,
      }),
    ),
  ]

  const assignRows = [...acceptIds, ...rejectRows.map((r) => r.id)].map(
    (enrollmentId) => ({
      enrollmentId,
      reviewerId: ANDREW_ID,
    }),
  )

  await db.transaction(async (tx) => {
    if (evalRows.length > 0) {
      await tx
        .insert(enrollmentEvaluations)
        .values(evalRows)
        .onConflictDoUpdate({
          target: [
            enrollmentEvaluations.enrollmentId,
            enrollmentEvaluations.evaluatorId,
          ],
          set: {
            score: sql`excluded.score`,
            admissionCategory: sql`excluded.admission_category`,
            note: sql`excluded.note`,
            updatedAt: new Date(),
          },
        })
    }
    if (assignRows.length > 0) {
      await tx
        .insert(enrollmentReviewerAssignments)
        .values(assignRows)
        .onConflictDoNothing()
    }
  })

  console.log(
    `APPLIED: ${evalRows.length} evaluations upserted, ${assignRows.length} assignments inserted (skip-if-exists).\n`,
  )
  await client.end()
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

const EXPAND_PATTERNS = [
  /\bCREATE\s+(?:OR\s+REPLACE\s+)?(?:TABLE|(?:UNIQUE\s+)?INDEX|TYPE|POLICY|TRIGGER|FUNCTION|VIEW)\b/iu,
  /\bALTER\s+TABLE\b[\s\S]*\bADD\s+(?:COLUMN|CONSTRAINT)\b/iu,
  /\bALTER\s+TYPE\b[\s\S]*\bADD\s+VALUE\b/iu,
  /\bENABLE\s+ROW\s+LEVEL\s+SECURITY\b/iu,
]

const BACKFILL_PATTERNS = [
  /\bUPDATE\s+(?:(?:"[^"]+"|[A-Za-z_][\w$]*)(?:\.(?:"[^"]+"|[A-Za-z_][\w$]*))?)\s+SET\b/iu,
  /\bINSERT\s+INTO\b/iu,
]

const CONTRACT_PATTERNS = [
  /\bDROP\s+(?:TABLE|COLUMN|INDEX|CONSTRAINT|TYPE|POLICY|TRIGGER|VIEW|FUNCTION|SEQUENCE|SCHEMA|EXTENSION)\b/iu,
  /\bTRUNCATE\b/iu,
  /\bDELETE\s+FROM\b/iu,
  /\bALTER\s+TABLE\b[\s\S]*\bRENAME\s+(?:COLUMN|TO)\b/iu,
  /\bALTER\s+TABLE\b[\s\S]*\bALTER\s+COLUMN\b[\s\S]*\bSET\s+DATA\s+TYPE\b/iu,
]

const PHASE_ORDER = ['expand', 'backfill', 'contract']

const dollarTagPattern = /\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/uy

function quotedLiteralEnd(sql, start) {
  let cursor = start + 1
  while (cursor < sql.length) {
    if (sql[cursor] !== "'") {
      cursor += 1
      continue
    }
    if (sql[cursor + 1] === "'") {
      cursor += 2
      continue
    }
    return cursor + 1
  }
  return sql.length
}

function dollarTagAt(sql, index) {
  dollarTagPattern.lastIndex = index
  const match = dollarTagPattern.exec(sql)
  return match ? match[0] : null
}

function lineCommentEnd(sql, start) {
  const end = sql.indexOf('\n', start)
  return end === -1 ? sql.length : end
}

function blockCommentEnd(sql, start) {
  const end = sql.indexOf('*/', start + 2)
  return end === -1 ? sql.length : end + 2
}

function dollarQuoteEnd(sql, start, tag) {
  const end = sql.indexOf(tag, start + tag.length)
  return end === -1 ? null : end + tag.length
}

function ignoredSqlSegmentEnd(sql, cursor) {
  if (sql.startsWith('--', cursor)) return lineCommentEnd(sql, cursor)
  if (sql.startsWith('/*', cursor)) return blockCommentEnd(sql, cursor)
  if (sql[cursor] === "'") return quotedLiteralEnd(sql, cursor)

  const tag = dollarTagAt(sql, cursor)
  return tag ? dollarQuoteEnd(sql, cursor, tag) : null
}

function extractSqlCode(sql) {
  let output = ''
  let cursor = 0

  while (cursor < sql.length) {
    const ignoredEnd = ignoredSqlSegmentEnd(sql, cursor)
    if (ignoredEnd !== null) {
      cursor = ignoredEnd
      output += ' '
      continue
    }

    output += sql[cursor]
    cursor += 1
  }

  return output
}

function statementPhases(statement) {
  const code = extractSqlCode(statement)
  const phases = new Set()

  if (EXPAND_PATTERNS.some((pattern) => pattern.test(code))) {
    phases.add('expand')
  }
  if (BACKFILL_PATTERNS.some((pattern) => pattern.test(code))) {
    phases.add('backfill')
  }
  if (CONTRACT_PATTERNS.some((pattern) => pattern.test(code))) {
    phases.add('contract')
  }

  return [...phases]
}

function hasNonNullColumnAddition(statement) {
  const code = extractSqlCode(statement)
  return /\bALTER\s+TABLE\b[\s\S]*\bADD\s+COLUMN\b[\s\S]*\bNOT\s+NULL\b/iu.test(
    code,
  )
}

export function analyzeMigration(sql) {
  const statements = sql
    .split(/-->\s*statement-breakpoint/iu)
    .map((statement) => statement.trim())
    .filter(Boolean)
  const phases = new Set()
  const nonNullColumnAdditions = []

  for (const [index, statement] of statements.entries()) {
    for (const phase of statementPhases(statement)) phases.add(phase)
    if (hasNonNullColumnAddition(statement)) {
      nonNullColumnAdditions.push(index + 1)
    }
  }

  return {
    phases: PHASE_ORDER.filter((phase) => phases.has(phase)),
    nonNullColumnAdditions,
    statementCount: statements.length,
  }
}

export function checkMigrationSafety(fileName, sql) {
  const analysis = analyzeMigration(sql)
  const errors = []
  const { phases } = analysis
  const hasContractMarker = /--\s*safe-delivery:\s*contract\b/iu.test(sql)

  if (phases.length > 1) {
    errors.push(
      `${fileName}: mixes ${phases.join(' + ')} work; split expand, backfill, and contract into separate migrations`,
    )
  }

  if (phases.includes('contract') && !hasContractMarker) {
    errors.push(
      `${fileName}: contract/destructive SQL requires a '-- safe-delivery: contract' marker and a separately reviewed migration`,
    )
  }

  if (analysis.nonNullColumnAdditions.length > 0) {
    errors.push(
      `${fileName}: add new columns nullable first; backfill and enforce NOT NULL in later migrations`,
    )
  }

  return { ...analysis, errors }
}

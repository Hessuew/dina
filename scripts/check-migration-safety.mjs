import { readFileSync } from 'node:fs'

import { checkMigrationSafety } from './migration-safety.domain.mjs'

const migrationFiles = process.argv
  .slice(2)
  .filter((fileName) => fileName.endsWith('.sql'))

if (migrationFiles.length === 0) {
  console.error(
    'No migration files supplied. Pass the changed drizzle/*.sql files to check them.',
  )
  process.exit(2)
}

let failed = false

for (const fileName of migrationFiles) {
  let sql
  try {
    sql = readFileSync(fileName, 'utf8')
  } catch (error) {
    console.error(
      `${fileName}: could not read migration (${error instanceof Error ? error.message : 'unknown error'})`,
    )
    failed = true
    continue
  }

  const result = checkMigrationSafety(fileName, sql)
  if (result.errors.length > 0) {
    for (const error of result.errors)
      console.error(`migration safety: ${error}`)
    failed = true
    continue
  }

  console.log(
    `migration safety passed: ${fileName} (${result.phases.join(', ') || 'schema-neutral'})`,
  )
}

if (failed) process.exit(1)

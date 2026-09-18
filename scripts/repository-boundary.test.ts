import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const utilsDirectory = join(process.cwd(), 'src/utils')

function findRepositoryFiles(directory: string): Array<string> {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return findRepositoryFiles(path)
    return entry.name.endsWith('.repository.ts') ? [path] : []
  })
}

function findUtilityFiles(directory: string): Array<string> {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return findUtilityFiles(path)
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')
      ? [path]
      : []
  })
}

function findSchemaTableImports(source: string): Array<string> {
  return [
    ...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]@\/db\/schema['"]/g),
  ]
    .flatMap(([, bindings]) => bindings.split(','))
    .map((binding) => binding.trim().split(/\s+as\s+/)[0])
    .filter(Boolean)
}

function findQueryTableReferences(source: string): Array<string> {
  return [...source.matchAll(/\b(?:db|tx)\.query\.([A-Za-z0-9_]+)/g)].map(
    ([, table]) => table,
  )
}

function findDatabaseClientImports(source: string): Array<string> {
  return [...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]@\/db['"]/g)]
    .flatMap(([, bindings]) => bindings.split(','))
    .map((binding) => binding.trim().split(/\s+as\s+/)[0])
    .filter((binding) => binding === 'getDb' || binding === 'withDbConnection')
}

function isDatabaseSeam(file: string): boolean {
  return (
    file.startsWith('repository/') ||
    file.includes('/transaction/') ||
    file === 'health/db-readiness.ts' ||
    file === 'request-scope.ts'
  )
}

describe('utils repository boundaries', () => {
  it('keeps every utils repository bound to one table without relation joins', () => {
    const repositoryFiles = findRepositoryFiles(utilsDirectory)

    expect(repositoryFiles.length).toBeGreaterThan(0)
    const tableOwners = new Map<string, string>()

    for (const repositoryPath of repositoryFiles) {
      const source = readFileSync(repositoryPath, 'utf8')
      const file = repositoryPath.slice(utilsDirectory.length + 1)
      const importedTables = findSchemaTableImports(source)
      expect(importedTables, file).toHaveLength(1)
      const [table] = importedTables
      expect(
        tableOwners.get(table),
        `${table} is already owned`,
      ).toBeUndefined()
      tableOwners.set(table, file)
      expect(
        findQueryTableReferences(source).every((queryTable) =>
          importedTables.includes(queryTable),
        ),
        `${file} queries a table it does not import`,
      ).toBe(true)
      expect(source, file).not.toMatch(/\bwith\s*:/)
      expect(source, file).not.toMatch(
        /\b(?:innerJoin|leftJoin|rightJoin|fullJoin|crossJoin)\s*\(/,
      )
    }
  })

  it('keeps database clients behind repository or infrastructure seams', () => {
    const offenders = findUtilityFiles(utilsDirectory)
      .map((utilityPath) => ({
        file: utilityPath.slice(utilsDirectory.length + 1),
        imports: findDatabaseClientImports(readFileSync(utilityPath, 'utf8')),
      }))
      .filter(
        ({ file, imports }) => imports.length > 0 && !isDatabaseSeam(file),
      )

    expect(offenders).toEqual([])
  })
})

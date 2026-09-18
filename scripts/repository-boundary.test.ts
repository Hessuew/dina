import { readFileSync, readdirSync } from 'node:fs'
import { join, sep } from 'node:path'
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

function findTransactionFiles(directory: string): Array<string> {
  return findUtilityFiles(directory).filter((file) =>
    file.includes(`${sep}transaction${sep}`),
  )
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

function findRuntimeSchemaImports(source: string): Array<string> {
  return [
    ...source.matchAll(
      /import\s*(?!type\b)\{([^}]*)\}\s*from\s*['"]@\/db\/schema['"]/g,
    ),
  ]
    .flatMap(([, bindings]) => bindings.split(','))
    .map((binding) => binding.trim())
    .filter((binding) => binding.length > 0 && !binding.startsWith('type '))
}

function findDirectRepositoryImports(source: string): Array<string> {
  return [
    ...source.matchAll(/from\s*['"]@\/utils\/repository\/[^'"]+['"]/g),
  ].map(([match]) => match)
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
  it('keeps repository modules in the shared repository seam', () => {
    const misplacedRepositories = findRepositoryFiles(utilsDirectory)
      .map((repositoryPath) => repositoryPath.slice(utilsDirectory.length + 1))
      .filter((file) => {
        const pathParts = file.split(sep)
        return pathParts.length !== 2 || pathParts[0] !== 'repository'
      })

    expect(misplacedRepositories).toEqual([])
  })

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

  it('keeps runtime schema imports behind shared repositories', () => {
    const offenders = findUtilityFiles(utilsDirectory)
      .map((utilityPath) => ({
        file: utilityPath.slice(utilsDirectory.length + 1),
        imports: findRuntimeSchemaImports(readFileSync(utilityPath, 'utf8')),
      }))
      .filter(
        ({ file, imports }) =>
          !file.startsWith(`repository${sep}`) && imports.length > 0,
      )

    expect(offenders).toEqual([])
  })

  it('routes production utility callers through the shared repository barrel', () => {
    const offenders = findUtilityFiles(utilsDirectory)
      .map((utilityPath) => ({
        file: utilityPath.slice(utilsDirectory.length + 1),
        imports: findDirectRepositoryImports(readFileSync(utilityPath, 'utf8')),
      }))
      .filter(
        ({ file, imports }) =>
          !file.startsWith(`repository${sep}`) && imports.length > 0,
      )

    expect(offenders).toEqual([])
  })

  it('keeps transaction modules as orchestration-only seams', () => {
    const transactionFiles = findTransactionFiles(utilsDirectory)

    expect(transactionFiles.length).toBeGreaterThan(0)

    for (const transactionPath of transactionFiles) {
      const source = readFileSync(transactionPath, 'utf8')
      const file = transactionPath.slice(utilsDirectory.length + 1)

      expect(findSchemaTableImports(source), file).toHaveLength(0)
      expect(source, file).not.toMatch(
        /\b(?:db|tx)\.(?:query|select|insert|update|delete)\b/,
      )
    }
  })
})

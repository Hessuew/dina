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

function findUtilityFilesIncludingTests(directory: string): Array<string> {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return findUtilityFilesIncludingTests(path)
    return entry.name.endsWith('.ts') ? [path] : []
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

function findTableReferences(source: string): Array<string> {
  return [
    ...source.matchAll(/\b(?:db|tx)\.query\.([A-Za-z0-9_]+)/g),
    ...source.matchAll(/\b(?:insert|update|delete)\(\s*([A-Za-z0-9_]+)\s*\)/g),
    ...source.matchAll(/\.from\(\s*([A-Za-z0-9_]+)\s*\)/g),
  ].map(([, table]) => table)
}

function findDirectDatabaseOperations(source: string): Array<string> {
  return [
    ...source.matchAll(
      /\b(?:db|tx|database|connection|dbClient|txClient)\.query\.[A-Za-z0-9_]+/g,
    ),
    ...source.matchAll(
      /\b(?:db|tx|database|connection|dbClient|txClient)\.(?:select|insert|update|delete|execute|transaction)\s*\(/g,
    ),
  ].map(([match]) => match)
}

function findDatabaseClientImports(source: string): Array<string> {
  return [
    ...source.matchAll(
      /(?:import\s+(?!type\b)(?:(?:(?!\bimport\b)[\s\S])*?\s+from\s+)?['"](?:@\/db|(?:\.\.?\/)+db)(?:\/index)?['"]|(?:import|require)\s*\(\s*['"](?:@\/db|(?:\.\.?\/)+db)(?:\/index)?['"]\s*\))/g,
    ),
  ].map(([match]) => match)
}

function findRuntimeSchemaImports(source: string): Array<string> {
  return [
    ...source.matchAll(
      /(?:import\s+(?!type\b)(?:(?:(?!\bimport\b)[\s\S])*?\s+from\s+)?['"](?:@\/db\/schema(?:\/[^'"]+)?|(?:\.\.?\/)+db\/schema(?:\/[^'"]+)?)['"]|(?:import|require)\s*\(\s*['"](?:@\/db\/schema(?:\/[^'"]+)?|(?:\.\.?\/)+db\/schema(?:\/[^'"]+)?)['"]\s*\))/g,
    ),
  ].map(([match]) => match)
}

function findNonNamedSchemaImports(source: string): Array<string> {
  return findRuntimeSchemaImports(source).filter(
    (statement) => !/^import\s*\{/.test(statement),
  )
}

function findDirectRepositoryImports(source: string): Array<string> {
  return [
    ...source.matchAll(
      /(?:from\s*|import\s*\(|require\s*\()\s*['"](?:@\/utils\/repository\/|(?:\.\.?\/)+repository\/)[^'"]+['"]/g,
    ),
  ].map(([match]) => match)
}

function findRepositoryBarrelExports(source: string): Array<string> {
  return [...source.matchAll(/export\s+\*\s+from\s+['"]\.\/([^'"]+)['"]/g)].map(
    ([, repository]) => repository,
  )
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
  it('detects namespace and relative database imports', () => {
    expect(
      findDatabaseClientImports("import * as database from '@/db'"),
    ).toHaveLength(1)
    expect(
      findDatabaseClientImports("import { getDb } from '../../db'"),
    ).toHaveLength(1)
    expect(findDatabaseClientImports("import('@/db')")).toHaveLength(1)
    expect(findDatabaseClientImports("require('../db')")).toHaveLength(1)
    expect(
      findRuntimeSchemaImports("import * as schema from '../db/schema'"),
    ).toHaveLength(1)
    expect(findRuntimeSchemaImports("import('@/db/schema')")).toHaveLength(1)
    expect(findRuntimeSchemaImports("require('../db/schema')")).toHaveLength(1)
    expect(
      findRuntimeSchemaImports("import type { profiles } from '@/db/schema'"),
    ).toHaveLength(0)
    expect(
      findNonNamedSchemaImports("import * as schema from '@/db/schema'"),
    ).toHaveLength(1)
    expect(
      findNonNamedSchemaImports("import { profiles } from '@/db/schema'"),
    ).toHaveLength(0)
  })

  it('detects direct Drizzle table references outside relation queries', () => {
    expect(
      findTableReferences(
        'db.insert(assignments).values(values); db.update(profiles); db.delete(courses); db.select().from(lessons)',
      ),
    ).toEqual(['assignments', 'profiles', 'courses', 'lessons'])
  })

  it('detects direct Drizzle operations on database handles', () => {
    expect(
      findDirectDatabaseOperations(
        'db.query.profiles.findFirst(); db.select().from(profiles); tx.insert(profiles); database.execute(sql); connection.transaction(run)',
      ),
    ).toEqual([
      'db.query.profiles',
      'db.select(',
      'tx.insert(',
      'database.execute(',
      'connection.transaction(',
    ])
    expect(
      findDirectDatabaseOperations(
        'supabase.auth.admin.updateUser(id); crypto.createHash("sha256").update(value)',
      ),
    ).toEqual([])
  })

  it('detects aliased and relative direct repository imports', () => {
    expect(
      findDirectRepositoryImports(
        "import { findProfileById } from '@/utils/repository/profiles.repository'",
      ),
    ).toHaveLength(1)
    expect(
      findDirectRepositoryImports(
        "import('../repository/profiles.repository')",
      ),
    ).toHaveLength(1)
    expect(
      findDirectRepositoryImports(
        "require('../../repository/profiles.repository')",
      ),
    ).toHaveLength(1)
    expect(
      findDirectRepositoryImports(
        "import { findProfileById } from '@/utils/repository'",
      ),
    ).toHaveLength(0)
  })

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
      expect(findNonNamedSchemaImports(source), file).toHaveLength(0)
      expect(importedTables, file).toHaveLength(1)
      const [table] = importedTables
      expect(
        tableOwners.get(table),
        `${table} is already owned`,
      ).toBeUndefined()
      tableOwners.set(table, file)
      expect(
        findTableReferences(source).every((queryTable) =>
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

  it('keeps direct Drizzle operations behind repository or infrastructure seams', () => {
    const offenders = findUtilityFiles(utilsDirectory)
      .map((utilityPath) => ({
        file: utilityPath.slice(utilsDirectory.length + 1),
        operations: findDirectDatabaseOperations(
          readFileSync(utilityPath, 'utf8'),
        ),
      }))
      .filter(
        ({ file, operations }) =>
          operations.length > 0 && !isDatabaseSeam(file),
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

  it('routes all utility callers through the shared repository barrel', () => {
    const offenders = findUtilityFilesIncludingTests(utilsDirectory)
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

  it('exports every shared repository from the repository barrel', () => {
    const repositoryDirectory = join(utilsDirectory, 'repository')
    const repositoryFiles = findRepositoryFiles(repositoryDirectory).map(
      (file) => file.slice(file.lastIndexOf(sep) + 1).replace(/\.ts$/, ''),
    )
    const barrelExports = findRepositoryBarrelExports(
      readFileSync(join(repositoryDirectory, 'index.ts'), 'utf8'),
    )

    expect(new Set(barrelExports)).toEqual(new Set(repositoryFiles))
    expect(barrelExports).toHaveLength(new Set(barrelExports).size)
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

import { readFileSync, readdirSync } from 'node:fs'
import { join, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const utilsDirectory = join(process.cwd(), 'src/utils')
const sourceDirectory = join(process.cwd(), 'src')
const schemaDirectory = join(process.cwd(), 'src/db/schema')

type SchemaTable = { symbol: string; sqlName: string }

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

function findSourceFilesIncludingTests(directory: string): Array<string> {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return findSourceFilesIncludingTests(path)
    return /\.tsx?$/.test(entry.name) ? [path] : []
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

function findSchemaTables(): Array<SchemaTable> {
  return readdirSync(schemaDirectory, { withFileTypes: true }).flatMap(
    (entry) => {
      if (!entry.isFile() || !entry.name.endsWith('.ts')) return []
      const source = readFileSync(join(schemaDirectory, entry.name), 'utf8')
      return [
        ...source.matchAll(
          /export const (\w+)\s*=\s*pgTable\(\s*['"]([^'"]+)['"]/gs,
        ),
      ].map(([, symbol, sqlName]) => ({ symbol, sqlName }))
    },
  )
}

function findInterpolatedTableReferences(
  source: string,
  schemaTables: Array<SchemaTable>,
): Array<string> {
  const symbols = new Set(schemaTables.map(({ symbol }) => symbol))
  return [...source.matchAll(/\$\{\s*([A-Za-z0-9_]+)/g)]
    .map(([, symbol]) => symbol)
    .filter((symbol) => symbols.has(symbol))
}

function findRawSqlTableReferences(
  source: string,
  schemaTables: Array<SchemaTable>,
): Array<string> {
  const symbolsBySqlName = new Map(
    schemaTables.map(({ symbol, sqlName }) => [sqlName, symbol]),
  )
  return [
    ...source.matchAll(
      /\b(?:from|join|update|into)\s+["']?([a-z_][a-z0-9_]*)/gi,
    ),
  ]
    .map(([, sqlName]) => symbolsBySqlName.get(sqlName.toLowerCase()))
    .filter((symbol): symbol is string => Boolean(symbol))
}

function findTableReferences(source: string): Array<string> {
  return [
    ...source.matchAll(
      /\b(?:db|tx)\s*(?:\?\s*\.\s*|\.\s*)query\s*(?:\?\s*\.\s*|\.\s*)([A-Za-z0-9_]+)/g,
    ),
    ...source.matchAll(
      /\b(?:db|tx)\s*(?:\?\s*\.\s*|\.\s*)query\s*(?:\?\s*\.\s*)?\[\s*['"]([A-Za-z0-9_]+)['"]\s*\]/g,
    ),
    ...source.matchAll(/\b(?:insert|update|delete)\(\s*([A-Za-z0-9_]+)\s*\)/g),
    ...source.matchAll(/\.from\(\s*([A-Za-z0-9_]+)\s*\)/g),
  ].map(([, table]) => table)
}

function findDirectDatabaseOperations(source: string): Array<string> {
  const handle = String.raw`\b(?:db|tx|database|connection|dbClient|txClient)`
  const member = String.raw`(?:\?\s*\.\s*|\.\s*)`
  const computedMember = String.raw`(?:\?\s*\.\s*)?\[\s*['"]`
  const queryMember = String.raw`\s*${member}query\s*(?:${member}[A-Za-z0-9_]+|${computedMember}[A-Za-z0-9_]+['"]\s*\])`
  const operationMember = String.raw`(?:${member}(?:select|insert|update|delete|execute|transaction)|${computedMember}(?:select|insert|update|delete|execute|transaction)['"]\s*\])`

  return [
    ...source.matchAll(new RegExp(`${handle}${queryMember}`, 'g')),
    ...source.matchAll(
      new RegExp(String.raw`${handle}\s*${operationMember}\s*\(`, 'g'),
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
  const repositoryPath = String.raw`(?:@/utils/repository/[^'"]+|@/utils/(?:[^'"]+/)*[^'"]+\.repository|(?:\.\.?/)+(?:[^'"]+/)*(?:repository/[^'"]+|[^'"]+\.repository))`

  return [
    ...source.matchAll(
      new RegExp(
        String.raw`(?:from\s*|import\s*\(|require\s*\()\s*['"]${repositoryPath}['"]`,
        'g',
      ),
    ),
  ].map(([match]) => match)
}

function findRuntimeRepositoryImports(source: string): Array<string> {
  const repositoryPath = String.raw`(?:@/utils/repository(?:/[^'"]+)?|@/utils/(?:[^'"]+/)*[^'"]+\.repository|(?:\.\.?/)+(?:[^'"]+/)*(?:repository(?:/[^'"]+)?|[^'"]+\.repository))`

  return [
    ...source.matchAll(
      new RegExp(
        String.raw`import\s+(?!type\b)(?:(?!\bimport\b)[\s\S])*?\s+from\s*['"]${repositoryPath}['"]`,
        'g',
      ),
    ),
    ...source.matchAll(
      new RegExp(
        String.raw`(?:import|require)\s*\(\s*['"]${repositoryPath}['"]\s*\)`,
        'g',
      ),
    ),
  ].map(([match]) => match)
}

function findRepositoryBarrelExports(source: string): Array<string> {
  return [...source.matchAll(/export\s+\*\s+from\s+['"]\.\/([^'"]+)['"]/g)].map(
    ([, repository]) => repository,
  )
}

function isDatabaseSeam(file: string): boolean {
  const isRepositoryAdapter =
    (file.startsWith('repository/') || file.startsWith('utils/repository/')) &&
    file.endsWith('.repository.ts')

  return (
    file.startsWith('db/') ||
    isRepositoryAdapter ||
    file.includes('/transaction/') ||
    file === 'health/db-readiness.ts' ||
    file === 'utils/health/db-readiness.ts' ||
    file === 'request-scope.ts' ||
    file === 'utils/request-scope.ts'
  )
}

describe('utils repository boundaries', () => {
  it('keeps only named repository adapters in the database seam', () => {
    expect(isDatabaseSeam('repository/profiles.repository.ts')).toBe(true)
    expect(isDatabaseSeam('utils/repository/profiles.repository.ts')).toBe(true)
    expect(isDatabaseSeam('repository/index.ts')).toBe(false)
    expect(isDatabaseSeam('utils/repository/query-helpers.ts')).toBe(false)
  })

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
        "db.insert(assignments).values(values); db.update(profiles); db.delete(courses); db.select().from(lessons); db.query['profiles'].findFirst()",
      ),
    ).toEqual(['profiles', 'assignments', 'profiles', 'courses', 'lessons'])
    expect(
      findTableReferences('db\n  . query\n  . courses.findFirst()'),
    ).toEqual(['courses'])
    expect(
      findTableReferences(
        'db?.query?.courses.findFirst(); tx?.query["profiles"].findFirst()',
      ),
    ).toEqual(['courses', 'profiles'])
  })

  it('detects table references hidden in SQL templates', () => {
    const schemaTables = findSchemaTables()

    expect(
      findInterpolatedTableReferences('sql`${profiles.id}`', schemaTables),
    ).toEqual(['profiles'])
    expect(
      findRawSqlTableReferences(
        'sql`select * from enrollments join profiles on profiles.id = enrollments.id`',
        schemaTables,
      ),
    ).toEqual(['enrollments', 'profiles'])
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
    expect(
      findDirectDatabaseOperations(
        "db['select'](); tx[\"execute\"](sql); database . query [ 'profiles' ].findFirst()",
      ),
    ).toHaveLength(3)
    expect(findDirectDatabaseOperations('db\n  . select()')).toHaveLength(1)
    expect(
      findDirectDatabaseOperations(
        'db?.query?.profiles.findFirst(); tx?.select()?.from(profiles); database?.["execute"](sql)',
      ),
    ).toHaveLength(3)
  })

  it('detects aliased and relative direct repository imports', () => {
    expect(
      findDirectRepositoryImports(
        "import { findProfileById } from '@/utils/repository/profiles.repository'",
      ),
    ).toHaveLength(1)
    expect(
      findDirectRepositoryImports(
        "import { findProfileById } from '../utils/repository/profiles.repository'",
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
        "import { findAssignmentById } from '@/utils/assignments/assignments.repository'",
      ),
    ).toHaveLength(1)
    expect(
      findDirectRepositoryImports("import('../assignments.repository')"),
    ).toHaveLength(1)
    expect(
      findDirectRepositoryImports("require('../../assignments.repository')"),
    ).toHaveLength(1)
    expect(
      findDirectRepositoryImports(
        "import { findProfileById } from '@/utils/repository'",
      ),
    ).toHaveLength(0)
  })

  it('detects runtime repository imports while allowing type-only imports', () => {
    expect(
      findRuntimeRepositoryImports(
        "import { findProfileById } from './profiles.repository'",
      ),
    ).toHaveLength(1)
    expect(
      findRuntimeRepositoryImports(
        "import { findProfileById } from '@/utils/repository'",
      ),
    ).toHaveLength(1)
    expect(
      findRuntimeRepositoryImports(
        "import('./attendance-sessions.repository')",
      ),
    ).toHaveLength(1)
    expect(
      findRuntimeRepositoryImports(
        "import { findAssignmentById } from '@/utils/assignments/assignments.repository'",
      ),
    ).toHaveLength(1)
    expect(
      findRuntimeRepositoryImports(
        "import('@/utils/assignments/assignments.repository')",
      ),
    ).toHaveLength(1)
    expect(
      findRuntimeRepositoryImports(
        "import type { AttendanceSessionsTransactionClient } from './attendance-sessions.repository'",
      ),
    ).toHaveLength(0)
  })

  it('keeps repository modules in the shared repository seam', () => {
    const misplacedRepositories = findRepositoryFiles(sourceDirectory)
      .map((repositoryPath) => repositoryPath.slice(sourceDirectory.length + 1))
      .filter((file) => {
        const pathParts = file.split(sep)
        return (
          pathParts.length !== 3 ||
          pathParts[0] !== 'utils' ||
          pathParts[1] !== 'repository'
        )
      })

    expect(misplacedRepositories).toEqual([])
  })

  it('keeps every utils repository bound to one table without relation joins', () => {
    const repositoryFiles = findRepositoryFiles(utilsDirectory)
    const schemaTables = findSchemaTables()

    expect(repositoryFiles.length).toBeGreaterThan(0)
    const tableOwners = new Map<string, string>()

    for (const repositoryPath of repositoryFiles) {
      const source = readFileSync(repositoryPath, 'utf8')
      const file = repositoryPath.slice(utilsDirectory.length + 1)
      const importedTables = findSchemaTableImports(source)
      const referencedTables = [
        ...findTableReferences(source),
        ...findInterpolatedTableReferences(source, schemaTables),
        ...findRawSqlTableReferences(source, schemaTables),
      ]
      expect(findNonNamedSchemaImports(source), file).toHaveLength(0)
      expect(importedTables, file).toHaveLength(1)
      const [table] = importedTables
      expect(
        tableOwners.get(table),
        `${table} is already owned`,
      ).toBeUndefined()
      tableOwners.set(table, file)
      expect(
        referencedTables.every((queryTable) =>
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

  it('keeps repositories independent from other runtime repository modules', () => {
    const offenders = findRepositoryFiles(utilsDirectory)
      .map((repositoryPath) => ({
        file: repositoryPath.slice(utilsDirectory.length + 1),
        imports: findRuntimeRepositoryImports(
          readFileSync(repositoryPath, 'utf8'),
        ),
      }))
      .filter(({ imports }) => imports.length > 0)

    expect(offenders).toEqual([])
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

  it('keeps database clients behind seams across all application source', () => {
    const offenders = findSourceFilesIncludingTests(sourceDirectory)
      .filter((sourcePath) => !sourcePath.endsWith('.test.ts'))
      .map((sourcePath) => ({
        file: sourcePath.slice(sourceDirectory.length + 1),
        imports: findDatabaseClientImports(readFileSync(sourcePath, 'utf8')),
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

  it('routes all application callers through the shared repository barrel', () => {
    const offenders = findSourceFilesIncludingTests(sourceDirectory)
      .map((sourcePath) => ({
        file: sourcePath.slice(sourceDirectory.length + 1),
        imports: findDirectRepositoryImports(readFileSync(sourcePath, 'utf8')),
      }))
      .filter(
        ({ file, imports }) =>
          !file.startsWith(`utils/repository${sep}`) && imports.length > 0,
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

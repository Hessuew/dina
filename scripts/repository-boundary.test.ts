import { readFileSync, readdirSync } from 'node:fs'
import { join, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const utilsDirectory = join(process.cwd(), 'src/utils')
const sourceDirectory = join(process.cwd(), 'src')
const schemaDirectory = join(process.cwd(), 'src/db/schema')

type SchemaTable = { module: string; symbol: string; sqlName: string }
type SchemaTableBinding = { importedName: string; localName: string }

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

function findSchemaTableBindings(source: string): Array<SchemaTableBinding> {
  return [
    ...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]@\/db\/schema['"]/g),
  ]
    .flatMap(([, bindings]) => bindings.split(','))
    .map((binding) => {
      const [importedName, localName = importedName] = binding
        .trim()
        .split(/\s+as\s+/)
      return { importedName, localName }
    })
    .filter(({ importedName }) => Boolean(importedName))
}

function findSchemaTableImports(source: string): Array<string> {
  return findSchemaTableBindings(source).map(({ importedName }) => importedName)
}

function findRuntimeSchemaTableImports(
  source: string,
  schemaTables: Array<SchemaTable>,
): Array<string> {
  const tableSymbols = new Set(schemaTables.map(({ symbol }) => symbol))
  const tableModules = new Set(
    schemaTables.map(({ module }) => module.replace(/\.ts$/, '')),
  )

  return findRuntimeSchemaImports(source).flatMap((statement) => {
    const importPath = statement.match(
      /['"]((?:@\/db\/schema|(?:\.\.?\/)+db\/schema)(?:\.ts)?(?:\/[^'"]+)?)['"]/,
    )?.[1]
    if (!importPath) return []

    const isSchemaBarrel =
      /(?:@\/db\/schema|(?:\.\.?\/)+db\/schema)(?:\.ts)?$/.test(importPath)
    const moduleName = isSchemaBarrel
      ? undefined
      : importPath.split('/').at(-1)?.replace(/\.ts$/, '')
    const isTableModule = moduleName ? tableModules.has(moduleName) : false
    const bindings = statement.match(/import\s+(?!type\b)\{([^}]*)\}/)?.[1]

    if (bindings) {
      return bindings
        .split(',')
        .map((binding) => binding.trim().split(/\s+as\s+/)[0])
        .filter((binding) => tableSymbols.has(binding))
    }

    return isSchemaBarrel || isTableModule ? [statement] : []
  })
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
      ].map(([, symbol, sqlName]) => ({
        module: entry.name,
        symbol,
        sqlName,
      }))
    },
  )
}

function findInterpolatedTableReferences(
  source: string,
  schemaTables: Array<SchemaTable>,
  aliases?: ReadonlyMap<string, string>,
): Array<string> {
  const symbols = new Set(schemaTables.map(({ symbol }) => symbol))
  return [...source.matchAll(/\$\{\s*([A-Za-z0-9_]+)/g)]
    .map(([, symbol]) => symbol)
    .map((symbol) => aliases?.get(symbol) ?? symbol)
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
      /\b(?:from|join|update|into|using|references|copy|lock\s+table|truncate(?:\s+table)?|(?:alter|create|drop)\s+table)\s+(?:(?:if\s+(?:not\s+)?exists|only)\s+)*(?:(?:["'][^"']+["']|[a-z_][a-z0-9_]*)\s*\.\s*)?["']?([a-z_][a-z0-9_]*)/gi,
    ),
    ...source.matchAll(
      /\bsql\s*(?:(?:\.\s*|\?\.\s*)(?:raw|identifier)|\[\s*["'](?:raw|identifier)["']\s*\])\s*\(\s*["'`](?:[a-z_][a-z0-9_]*\s*\.\s*)?([a-z_][a-z0-9_]*)["'`]\s*\)/gi,
    ),
  ]
    .map(([, sqlName]) => symbolsBySqlName.get(sqlName.toLowerCase()))
    .filter((symbol): symbol is string => Boolean(symbol))
}

function findDynamicRawSqlTableReferences(source: string): Array<string> {
  const sqlSelector = String.raw`\bsql\s*(?:(?:\.\s*|\?\.\s*)(?:raw|identifier)|\[\s*["'](?:raw|identifier)["']\s*\])\s*\(\s*([^)]*?)\s*\)`
  const literalTable =
    /^['"`](?:[a-z_][a-z0-9_]*\s*\.\s*)?[a-z_][a-z0-9_]*['"`]$/i

  return [...source.matchAll(new RegExp(sqlSelector, 'gi'))]
    .filter(([, argument]) => !literalTable.test(argument.trim()))
    .map(([match]) => match)
}

const objectHandle = String.raw`\b[A-Za-z_$][A-Za-z0-9_$]*`
const databaseHandle = String.raw`\b(?:db|tx|database|connection|dbClient|txClient)`
const identifier = String.raw`[A-Za-z_$][A-Za-z0-9_$]*`
const memberAccess = String.raw`(?:\?\s*\.\s*|\.\s*)`
const computedMemberAccess = String.raw`(?:\?\s*\.\s*)?\[\s*['"]`
const queryAccess = String.raw`(?:${memberAccess}query|${computedMemberAccess}query['"]\s*\])`
const typeArguments = String.raw`(?:<[^()]*>)?`
const optionalCallAccess = String.raw`(?:\?\s*\.\s*)?`
const tableCall = String.raw`(?:${memberAccess}(?:insert|update|delete|from)|${computedMemberAccess}(?:insert|update|delete|from)['"]\s*\])\s*${optionalCallAccess}${typeArguments}\(\s*([A-Za-z0-9_]+)\s*\)`

function findTableReferences(
  source: string,
  aliases?: ReadonlyMap<string, string>,
): Array<string> {
  return [
    ...source.matchAll(
      new RegExp(
        `${objectHandle}\\s*${queryAccess}\\s*${memberAccess}([A-Za-z0-9_]+)`,
        'g',
      ),
    ),
    ...source.matchAll(
      new RegExp(
        `${objectHandle}\\s*${queryAccess}\\s*${computedMemberAccess}([A-Za-z0-9_]+)['"]\\s*\\]`,
        'g',
      ),
    ),
    ...source.matchAll(
      new RegExp(
        `${objectHandle}\\s*(?:${memberAccess}\\$count|${computedMemberAccess}\\$count['"]\\s*\\])\\s*(?:\\?\\s*\\.\\s*)?\\(\\s*([A-Za-z0-9_]+)\\s*\\)`,
        'g',
      ),
    ),
    ...source.matchAll(new RegExp(tableCall, 'g')),
  ].map(([, table]) => aliases?.get(table) ?? table)
}

function findDynamicTableReferences(source: string): Array<string> {
  return [
    ...source.matchAll(
      new RegExp(
        String.raw`${objectHandle}\s*${queryAccess}\s*(?:\?\s*\.\s*)?\[\s*(?!['"])${identifier}\s*\]`,
        'g',
      ),
    ),
  ].map(([match]) => match)
}

function findDirectDatabaseOperations(source: string): Array<string> {
  const handle = databaseHandle
  const queryMember = String.raw`\s*${queryAccess}\s*(?:${memberAccess}[A-Za-z0-9_]+|${computedMemberAccess}[A-Za-z0-9_]+['"]\s*\])`
  const operationMember = String.raw`(?:${memberAccess}(?:\$?with|\$count|selectDistinctOn|selectDistinct|select|insert|update|delete|execute|transaction)|${computedMemberAccess}(?:\$?with|\$count|selectDistinctOn|selectDistinct|select|insert|update|delete|execute|transaction)['"]\s*\])`
  const operationCall = String.raw`\s*${optionalCallAccess}${typeArguments}\(`

  return [
    ...source.matchAll(new RegExp(`${handle}${queryMember}`, 'g')),
    ...source.matchAll(
      new RegExp(
        String.raw`${handle}\s*${operationMember}${operationCall}`,
        'g',
      ),
    ),
  ].map(([match]) => match)
}

function findDatabaseClientImports(source: string): Array<string> {
  return [
    ...source.matchAll(
      /(?:(?:import|export)\s+(?!type\b)(?:(?:(?!\b(?:import|export)\b)[\s\S])*?\s+from\s+)?['"](?:@\/db|(?:\.\.?\/)+db)(?:\/index)?(?:\.ts)?['"]|(?:import|require)\s*\(\s*['"](?:@\/db|(?:\.\.?\/)+db)(?:\/index)?(?:\.ts)?['"]\s*\))/g,
    ),
    ...source.matchAll(
      /(?:import|require)\s*\(\s*`(?:@\/db|(?:\.\.?\/)+db)(?:\/index)?(?:\.ts)?[^`]*`\s*\)/g,
    ),
    ...source.matchAll(
      /(?:import|require)\s*\(\s*['"](?:@\/db|(?:\.\.?\/)+db)(?:\/index)?(?:\.ts)?[^'"]*['"]\s*\+/g,
    ),
  ].map(([match]) => match)
}

function findRuntimeSchemaImports(source: string): Array<string> {
  return [
    ...source.matchAll(
      /(?:(?:import|export)\s+(?!type\b)(?:(?:(?!\b(?:import|export)\b)[\s\S])*?\s+from\s+)?['"](?:@\/db\/schema(?:\.ts)?(?:\/[^'"]+)?|(?:\.\.?\/)+db\/schema(?:\.ts)?(?:\/[^'"]+)?)['"]|(?:import|require)\s*\(\s*['"](?:@\/db\/schema(?:\.ts)?(?:\/[^'"]+)?|(?:\.\.?\/)+db\/schema(?:\.ts)?(?:\/[^'"]+)?)['"]\s*\))/g,
    ),
    ...source.matchAll(
      /(?:import|require)\s*\(\s*`(?:@\/db\/schema(?:\.ts)?(?:\/[^`]+)?|(?:\.\.?\/)+db\/schema(?:\.ts)?(?:\/[^`]+)?)`\s*\)/g,
    ),
    ...source.matchAll(
      /(?:import|require)\s*\(\s*['"](?:@\/db\/schema(?:\.ts)?(?:\/[^'"]*)?|(?:\.\.?\/)+db\/schema(?:\.ts)?(?:\/[^'"]*)?)['"]\s*\+/g,
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
    ...source.matchAll(
      /(?:import|require)\s*\(\s*`(?:@\/utils\/repository\/[^`]+|@\/utils\/(?:[^`]+\/)*[^`]+\.repository|(?:\.\.?\/)+(?:[^`]+\/)*(?:repository\/[^`]+|[^`]+\.repository))`\s*\)/g,
    ),
    ...source.matchAll(
      /(?:import|require)\s*\(\s*['"](?:@\/utils\/repository\/[^'"]*|@\/utils\/(?:[^'"]+\/)*[^'"]+\.repository|(?:\.\.?\/)+(?:[^'"]+\/)*(?:repository\/[^'"]+|[^'"]+\.repository))['"]\s*\+/g,
    ),
    ...source.matchAll(
      /(?:import|require)\s*\(\s*['"](?:@\/utils\/|(?:\.\.?\/)+)[^'"]*['"][^)]*\.repository[^)]*\)/g,
    ),
  ].map(([match]) => match)
}

function findRuntimeRepositoryImports(source: string): Array<string> {
  const repositoryPath = String.raw`(?:@/utils/repository(?:/[^'"]+)?|@/utils/(?:[^'"]+/)*[^'"]+\.repository|(?:\.\.?/)+(?:[^'"]+/)*(?:repository(?:/[^'"]+)?|[^'"]+\.repository))`

  return [
    ...source.matchAll(
      new RegExp(
        String.raw`(?:import|export)\s+(?!type\b)(?:(?!\b(?:import|export)\b)[\s\S])*?\s+from\s*['"]${repositoryPath}['"]`,
        'g',
      ),
    ),
    ...source.matchAll(
      new RegExp(
        String.raw`(?:import|require)\s*\(\s*['"]${repositoryPath}['"]\s*\)`,
        'g',
      ),
    ),
    ...source.matchAll(
      /(?:import|require)\s*\(\s*`(?:@\/utils\/repository(?:\/[^`]+)?|@\/utils\/(?:[^`]+\/)*[^`]+\.repository|(?:\.\.?\/)+(?:[^`]+\/)*(?:repository(?:\/[^`]+)?|[^`]+\.repository))`\s*\)/g,
    ),
    ...source.matchAll(
      /(?:import|require)\s*\(\s*['"](?:@\/utils\/repository(?:\/[^'"]*)?|@\/utils\/(?:[^'"]+\/)*[^'"]+\.repository|(?:\.\.?\/)+(?:[^'"]+\/)*(?:repository(?:\/[^'"]+)?|[^'"]+\.repository))['"]\s*\+/g,
    ),
    ...source.matchAll(
      /(?:import|require)\s*\(\s*['"](?:@\/utils\/|(?:\.\.?\/)+)[^'"]*['"][^)]*\.repository[^)]*\)/g,
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
    const schemaTables = findSchemaTables()

    expect(
      findDatabaseClientImports("import * as database from '@/db'"),
    ).toHaveLength(1)
    expect(
      findDatabaseClientImports("import { getDb } from '../../db'"),
    ).toHaveLength(1)
    expect(
      findDatabaseClientImports("import { getDb } from '@/db/index.ts'"),
    ).toHaveLength(1)
    expect(findDatabaseClientImports("import('@/db')")).toHaveLength(1)
    expect(findDatabaseClientImports("import('@/db/index.ts')")).toHaveLength(1)
    expect(
      findDatabaseClientImports('import(`@/db/${moduleName}`)'),
    ).toHaveLength(1)
    expect(
      findDatabaseClientImports("import('@/db/' + moduleName)"),
    ).toHaveLength(1)
    expect(findDatabaseClientImports("require('../db')")).toHaveLength(1)
    expect(
      findDatabaseClientImports("export { getDb } from '@/db'"),
    ).toHaveLength(1)
    expect(
      findDatabaseClientImports("export type { Db } from '@/db'"),
    ).toHaveLength(0)
    expect(
      findRuntimeSchemaImports("import * as schema from '../db/schema'"),
    ).toHaveLength(1)
    expect(
      findRuntimeSchemaImports("import * as schema from '../db/schema.ts'"),
    ).toHaveLength(1)
    expect(findRuntimeSchemaImports("import('@/db/schema')")).toHaveLength(1)
    expect(findRuntimeSchemaImports("import('@/db/schema.ts')")).toHaveLength(1)
    expect(
      findRuntimeSchemaImports('import(`@/db/schema/${tableName}.schema`)'),
    ).toHaveLength(1)
    expect(
      findRuntimeSchemaImports("import('@/db/schema/' + tableName)"),
    ).toHaveLength(1)
    expect(findRuntimeSchemaImports("require('../db/schema')")).toHaveLength(1)
    expect(
      findRuntimeSchemaImports("export { profiles } from '@/db/schema'"),
    ).toHaveLength(1)
    expect(
      findRuntimeSchemaImports("export type { profiles } from '@/db/schema'"),
    ).toHaveLength(0)
    expect(
      findRuntimeSchemaImports("import type { profiles } from '@/db/schema'"),
    ).toHaveLength(0)
    expect(
      findNonNamedSchemaImports("import * as schema from '@/db/schema'"),
    ).toHaveLength(1)
    expect(
      findNonNamedSchemaImports("import { profiles } from '@/db/schema'"),
    ).toHaveLength(0)
    expect(
      findRuntimeSchemaTableImports(
        "import { profiles as profileTable } from '../db/schema/profile.schema'",
        schemaTables,
      ),
    ).toEqual(['profiles'])
    expect(
      findRuntimeSchemaTableImports(
        "import type { profiles } from '@/db/schema'",
        schemaTables,
      ),
    ).toEqual([])
    expect(
      findRuntimeSchemaTableImports(
        "import * as schema from '../db/schema'",
        schemaTables,
      ),
    ).toHaveLength(1)
    expect(
      findRuntimeSchemaTableImports(
        "import * as schema from '../db/schema.ts'",
        schemaTables,
      ),
    ).toHaveLength(1)
    expect(
      findRuntimeSchemaTableImports(
        "import('@/db/schema/profile.schema')",
        schemaTables,
      ),
    ).toHaveLength(1)
    expect(
      findSchemaTableBindings(
        "import { profiles as profileTable } from '@/db/schema'",
      ),
    ).toEqual([{ importedName: 'profiles', localName: 'profileTable' }])
  })

  it('detects direct Drizzle table references outside relation queries', () => {
    expect(
      findTableReferences(
        'db.insert(assignments).values(values); db.update(profiles); db.delete(courses); db.select().from(lessons); db.query[\'profiles\'].findFirst(); db.$count(enrollments); tx["$count"](profiles)',
      ),
    ).toEqual([
      'profiles',
      'enrollments',
      'profiles',
      'assignments',
      'profiles',
      'courses',
      'lessons',
    ])
    expect(
      findTableReferences('db\n  . query\n  . courses.findFirst()'),
    ).toEqual(['courses'])
    expect(
      findTableReferences(
        'db?.query?.courses.findFirst(); tx?.query["profiles"].findFirst()',
      ),
    ).toEqual(['courses', 'profiles'])
    expect(
      findTableReferences(
        'db["query"].assignments.findFirst(); tx?.["query"]?.["profiles"].findFirst()',
      ),
    ).toEqual(['assignments', 'profiles'])
    expect(
      findTableReferences(
        'db?.insert?.(assignments); tx?.["update"]?.(profiles); db.select?.().from?.(lessons); client["delete"](courses)',
      ),
    ).toEqual(['assignments', 'profiles', 'lessons', 'courses'])
    expect(
      findTableReferences(
        'db.insert<AssignmentInsert>(assignments); tx["update"]<ProfilePatch>(profiles); db.select<LessonRow>().from<LessonTable>(lessons); client["delete"]<CourseRow>(courses)',
      ),
    ).toEqual(['assignments', 'profiles', 'lessons', 'courses'])
    expect(
      findTableReferences(
        'repositoryClient.query.courses.findMany(); injectedTx?.query?.["lessons"].findFirst()',
      ),
    ).toEqual(['courses', 'lessons'])
    expect(
      findTableReferences(
        'db.insert(profileTable).values(values); db.query.profileTable.findFirst()',
        new Map([['profileTable', 'profiles']]),
      ),
    ).toEqual(['profiles', 'profiles'])
    expect(
      findTableReferences(
        'db.$count(profileTable); tx?.["$count"]?.(profileTable)',
        new Map([['profileTable', 'profiles']]),
      ),
    ).toEqual(['profiles', 'profiles'])
  })

  it('detects dynamically selected Drizzle tables', () => {
    expect(
      findDynamicTableReferences(
        'db.query[tableName].findFirst(); tx?.["query"]?.[tableName].findMany()',
      ),
    ).toHaveLength(2)
    expect(
      findDynamicTableReferences(
        'db.query["profiles"].findFirst(); tx.query.profiles.findMany()',
      ),
    ).toHaveLength(0)
  })

  it('detects table references hidden in SQL templates', () => {
    const schemaTables = findSchemaTables()

    expect(
      findInterpolatedTableReferences('sql`${profiles.id}`', schemaTables),
    ).toEqual(['profiles'])
    expect(
      findInterpolatedTableReferences(
        'sql`${profileTable.id}`',
        schemaTables,
        new Map([['profileTable', 'profiles']]),
      ),
    ).toEqual(['profiles'])
    expect(
      findRawSqlTableReferences(
        'sql`select * from enrollments join profiles on profiles.id = enrollments.id`',
        schemaTables,
      ),
    ).toEqual(['enrollments', 'profiles'])
    expect(
      findRawSqlTableReferences(
        'sql`delete from announcements using public.profiles where profiles.id = announcements.author_id`',
        schemaTables,
      ),
    ).toEqual(['announcements', 'profiles'])
    expect(
      findRawSqlTableReferences(
        'sql`truncate table public.notifications; alter table announcements add column archived_at timestamp`',
        schemaTables,
      ),
    ).toEqual(['notifications', 'announcements'])
    expect(
      findRawSqlTableReferences(
        "sql`select * from only profiles join public.enrollments on true; update only profiles set role = 'student'; insert into enrollments default values; delete from only profiles`",
        schemaTables,
      ),
    ).toEqual([
      'profiles',
      'enrollments',
      'profiles',
      'enrollments',
      'profiles',
    ])
    expect(
      findRawSqlTableReferences(
        'sql`truncate table only notifications; alter table if exists only announcements add column archived_at timestamp; create table if not exists announcements (id uuid); drop table if exists announcements; lock table profiles; copy profiles from stdin; select 1 references enrollments`',
        schemaTables,
      ),
    ).toEqual([
      'notifications',
      'announcements',
      'announcements',
      'announcements',
      'profiles',
      'profiles',
      'enrollments',
    ])
    expect(
      findRawSqlTableReferences(
        "db.select().from(sql.raw('public.profiles'))",
        schemaTables,
      ),
    ).toEqual(['profiles'])
    expect(
      findRawSqlTableReferences(
        "db.select().from(sql . raw ( `public.profiles` )); db.select().from(sql?.raw('announcements'))",
        schemaTables,
      ),
    ).toEqual(['profiles', 'announcements'])
    expect(
      findRawSqlTableReferences(
        "db.select().from(sql.identifier('profiles')); db.select().from(sql?.identifier(`announcements`)); db.select().from(sql['identifier']('notifications'))",
        schemaTables,
      ),
    ).toEqual(['profiles', 'announcements', 'notifications'])
  })

  it('detects dynamically selected raw SQL tables', () => {
    expect(
      findDynamicRawSqlTableReferences(
        "sql.raw(tableName); sql?.identifier(`public.${tableName}`); sql['raw']('public.' + tableName); sql.identifier(getTableName())",
      ),
    ).toHaveLength(4)
    expect(
      findDynamicRawSqlTableReferences(
        "sql.raw('public.profiles'); sql?.identifier(`announcements`); sql['raw']('notifications')",
      ),
    ).toHaveLength(0)
  })

  it('detects direct Drizzle operations on database handles', () => {
    expect(
      findDirectDatabaseOperations(
        'db.query.profiles.findFirst(); db.select().from(profiles); tx.insert(profiles); tx.execute(sql); database.execute(sql); connection.transaction(run)',
      ),
    ).toEqual([
      'db.query.profiles',
      'db.select(',
      'tx.insert(',
      'tx.execute(',
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
    expect(
      findDirectDatabaseOperations(
        'db["query"].profiles.findFirst(); tx?.["query"]?.["courses"].findFirst()',
      ),
    ).toHaveLength(2)
    expect(
      findDirectDatabaseOperations(
        'db.$count(profiles); tx["$count"](courses)',
      ),
    ).toEqual(['db.$count(', 'tx["$count"]('])
    expect(
      findDirectDatabaseOperations(
        'db.with(cte).selectDistinct().from(cte); tx.$with("cte"); database.selectDistinctOn([profiles.id]).from(profiles)',
      ),
    ).toHaveLength(3)
    expect(
      findDirectDatabaseOperations(
        'db["with"](cte).select(); tx["$with"]("cte"); connection["selectDistinct"]().from(profiles)',
      ),
    ).toHaveLength(3)
    expect(
      findDirectDatabaseOperations(
        'db?.select?.(); tx?.["execute"]?.(sql); connection?.transaction?.(run)',
      ),
    ).toEqual([
      'db?.select?.(',
      'tx?.["execute"]?.(',
      'connection?.transaction?.(',
    ])
    expect(
      findDirectDatabaseOperations(
        'db.select<{ id: string }>(); tx["execute"]<SqlResult>(sql); connection?.transaction?.<TxResult>(run)',
      ),
    ).toEqual([
      'db.select<{ id: string }>(',
      'tx["execute"]<SqlResult>(',
      'connection?.transaction?.<TxResult>(',
    ])
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
        'import(`@/utils/repository/${repositoryName}.repository`)',
      ),
    ).toHaveLength(1)
    expect(
      findDirectRepositoryImports(
        "import('@/utils/repository/' + repositoryName)",
      ),
    ).toHaveLength(1)
    expect(
      findDirectRepositoryImports(
        "import('@/utils/assignments/' + repositoryName + '.repository')",
      ),
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
        'import(`@/utils/repository/${repositoryName}.repository`)',
      ),
    ).toHaveLength(1)
    expect(
      findRuntimeRepositoryImports(
        "import('@/utils/repository/' + repositoryName)",
      ),
    ).toHaveLength(1)
    expect(
      findRuntimeRepositoryImports(
        "import('@/utils/assignments/' + repositoryName + '.repository')",
      ),
    ).toHaveLength(1)
    expect(
      findRuntimeRepositoryImports(
        "import type { AttendanceSessionsTransactionClient } from './attendance-sessions.repository'",
      ),
    ).toHaveLength(0)
    expect(
      findRuntimeRepositoryImports("export * from './profiles.repository'"),
    ).toHaveLength(1)
    expect(
      findRuntimeRepositoryImports(
        "export type { AttendanceSessionsTransactionClient } from './attendance-sessions.repository'",
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
    const schemaTableSymbols = new Set(schemaTables.map(({ symbol }) => symbol))

    expect(repositoryFiles.length).toBeGreaterThan(0)
    const tableOwners = new Map<string, string>()

    for (const repositoryPath of repositoryFiles) {
      const source = readFileSync(repositoryPath, 'utf8')
      const file = repositoryPath.slice(utilsDirectory.length + 1)
      const tableBindings = findSchemaTableBindings(source)
      const importedTables = tableBindings.map(
        ({ importedName }) => importedName,
      )
      const tableAliases = new Map(
        tableBindings.map(({ importedName, localName }) => [
          localName,
          importedName,
        ]),
      )
      const referencedTables = [
        ...findTableReferences(source, tableAliases),
        ...findInterpolatedTableReferences(source, schemaTables, tableAliases),
        ...findRawSqlTableReferences(source, schemaTables),
      ]
      expect(findDynamicTableReferences(source), file).toHaveLength(0)
      expect(findDynamicRawSqlTableReferences(source), file).toHaveLength(0)
      expect(findNonNamedSchemaImports(source), file).toHaveLength(0)
      expect(importedTables, file).toHaveLength(1)
      const [table] = importedTables
      const tableMetadata = schemaTables.find(({ symbol }) => symbol === table)
      expect(
        schemaTableSymbols.has(table),
        `${table} is not a schema table`,
      ).toBe(true)
      expect(
        file
          .split(sep)
          .at(-1)
          ?.replace(/\.repository\.ts$/, ''),
        `${file} must be named after its owned SQL table`,
      ).toBe(tableMetadata?.sqlName.replaceAll('_', '-'))
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

    const schemaOnlyTables = schemaTables
      .map(({ symbol }) => symbol)
      .filter((symbol) => !tableOwners.has(symbol))
      .sort()

    expect(schemaOnlyTables).toEqual([])
  })

  it('keeps runtime schema-table imports behind shared repositories across application source', () => {
    const schemaTables = findSchemaTables()
    const offenders = findSourceFilesIncludingTests(sourceDirectory)
      .filter((sourcePath) => !sourcePath.endsWith('.test.ts'))
      .map((sourcePath) => ({
        file: sourcePath.slice(sourceDirectory.length + 1),
        imports: findRuntimeSchemaTableImports(
          readFileSync(sourcePath, 'utf8'),
          schemaTables,
        ),
      }))
      .filter(
        ({ file, imports }) =>
          !file.startsWith(`utils/repository${sep}`) && imports.length > 0,
      )

    expect(offenders).toEqual([])
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

  it('keeps direct schema-table references behind repository or infrastructure seams', () => {
    const schemaTables = findSchemaTables()
    const offenders = findSourceFilesIncludingTests(sourceDirectory)
      .filter((sourcePath) => !sourcePath.endsWith('.test.ts'))
      .map((sourcePath) => ({
        file: sourcePath.slice(sourceDirectory.length + 1),
        references: findTableReferences(
          readFileSync(sourcePath, 'utf8'),
        ).filter((reference) =>
          schemaTables.some(({ symbol }) => symbol === reference),
        ),
      }))
      .filter(
        ({ file, references }) =>
          references.length > 0 && !isDatabaseSeam(file),
      )

    expect(offenders).toEqual([])
  })

  it('keeps dynamically selected tables behind repository or infrastructure seams', () => {
    const offenders = findSourceFilesIncludingTests(sourceDirectory)
      .filter((sourcePath) => !sourcePath.endsWith('.test.ts'))
      .map((sourcePath) => ({
        file: sourcePath.slice(sourceDirectory.length + 1),
        references: findDynamicTableReferences(
          readFileSync(sourcePath, 'utf8'),
        ),
      }))
      .filter(
        ({ file, references }) =>
          references.length > 0 && !isDatabaseSeam(file),
      )

    expect(offenders).toEqual([])
  })

  it('keeps raw SQL table references behind repository or infrastructure seams', () => {
    const schemaTables = findSchemaTables()
    const offenders = findSourceFilesIncludingTests(sourceDirectory)
      .filter((sourcePath) => !sourcePath.endsWith('.test.ts'))
      .map((sourcePath) => ({
        file: sourcePath.slice(sourceDirectory.length + 1),
        references: findRawSqlTableReferences(
          readFileSync(sourcePath, 'utf8'),
          schemaTables,
        ),
      }))
      .filter(
        ({ file, references }) =>
          references.length > 0 && !isDatabaseSeam(file),
      )

    expect(offenders).toEqual([])
  })

  it('keeps dynamically selected raw SQL tables behind repository or infrastructure seams', () => {
    const offenders = findSourceFilesIncludingTests(sourceDirectory)
      .filter((sourcePath) => !sourcePath.endsWith('.test.ts'))
      .map((sourcePath) => ({
        file: sourcePath.slice(sourceDirectory.length + 1),
        references: findDynamicRawSqlTableReferences(
          readFileSync(sourcePath, 'utf8'),
        ),
      }))
      .filter(
        ({ file, references }) =>
          references.length > 0 && !isDatabaseSeam(file),
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
    const schemaTables = findSchemaTables()

    expect(transactionFiles.length).toBeGreaterThan(0)

    for (const transactionPath of transactionFiles) {
      const source = readFileSync(transactionPath, 'utf8')
      const file = transactionPath.slice(utilsDirectory.length + 1)

      expect(findSchemaTableImports(source), file).toHaveLength(0)
      expect(source, file).not.toMatch(
        /\b(?:db|tx)\.(?:query|select|insert|update|delete)\b/,
      )
      expect(
        findDirectDatabaseOperations(source).filter(
          (operation) =>
            !/^db\s*(?:\?\s*\.\s*|\.\s*)transaction\($/.test(operation),
        ),
        file,
      ).toEqual([])
      expect(findRawSqlTableReferences(source, schemaTables), file).toEqual([])
      expect(findDynamicRawSqlTableReferences(source), file).toEqual([])
    }
  })
})

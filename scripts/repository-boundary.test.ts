import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const repositoryDirectory = join(process.cwd(), 'src/utils/repository')

function findSchemaTableImports(source: string): Array<string> {
  return [
    ...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]@\/db\/schema['"]/g),
  ]
    .flatMap(([, bindings]) => bindings.split(','))
    .map((binding) => binding.trim().split(/\s+as\s+/)[0])
    .filter(Boolean)
}

describe('shared repository boundaries', () => {
  it('keeps every repository bound to one table without relation joins', () => {
    const repositoryFiles = readdirSync(repositoryDirectory).filter((file) =>
      file.endsWith('.repository.ts'),
    )

    expect(repositoryFiles.length).toBeGreaterThan(0)

    for (const file of repositoryFiles) {
      const source = readFileSync(join(repositoryDirectory, file), 'utf8')
      expect(findSchemaTableImports(source), file).toHaveLength(1)
      expect(source, file).not.toMatch(/\bwith\s*:/)
      expect(source, file).not.toMatch(
        /\b(?:innerJoin|leftJoin|rightJoin|fullJoin|crossJoin)\s*\(/,
      )
    }
  })
})

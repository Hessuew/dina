import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { collectCompareHistory } = require('./release-history.cjs') as {
  collectCompareHistory: (
    github: unknown,
    request: Record<string, string>,
    perPage?: number,
  ) => Promise<{ commits: Array<unknown>; files: Array<unknown> }>
}

describe('collectCompareHistory', () => {
  it('collects every paginated compare page', async () => {
    const requests: Array<Record<string, unknown>> = []
    const pages = [
      {
        commits: [{ sha: 'first' }, { sha: 'second' }],
        files: [{ filename: 'first.ts' }, { filename: 'second.ts' }],
      },
      {
        commits: [{ sha: 'third' }],
        files: [{ filename: 'third.ts' }],
      },
    ]
    const github = {
      rest: {
        repos: {
          compareCommits: async (request: Record<string, unknown>) => {
            requests.push(request)
            return { data: pages[Number(request.page) - 1] }
          },
        },
      },
    }

    await expect(
      collectCompareHistory(
        github,
        { owner: 'owner', repo: 'repo', base: 'base', head: 'head' },
        2,
      ),
    ).resolves.toEqual({
      commits: [{ sha: 'first' }, { sha: 'second' }, { sha: 'third' }],
      files: [
        { filename: 'first.ts' },
        { filename: 'second.ts' },
        { filename: 'third.ts' },
      ],
    })
    expect(requests).toEqual([
      {
        owner: 'owner',
        repo: 'repo',
        base: 'base',
        head: 'head',
        page: 1,
        per_page: 2,
      },
      {
        owner: 'owner',
        repo: 'repo',
        base: 'base',
        head: 'head',
        page: 2,
        per_page: 2,
      },
    ])
  })
})

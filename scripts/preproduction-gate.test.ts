import { describe, expect, it, vi } from 'vitest'
import {
  findGateRunWithPreproductionEvidence,
  isSuccessfulPreproductionJob,
  isTrustedReleaseCommit,
  verifyPreproductionGate,
} from './preproduction-gate.cjs'

const targetSha = 'b'.repeat(40)
const currentSha = 'c'.repeat(40)
const repository = { owner: 'dina', repo: 'dina' }

function preproductionJob(conclusion: string) {
  return { name: 'Deploy and verify pre-production', conclusion }
}

function mockGithub({
  jobs = [] as Array<Record<string, unknown>>,
  runs = [] as Array<Record<string, unknown>>,
  mainSha = currentSha,
  releases = [] as Array<Record<string, unknown>>,
  deployments = [] as Array<Record<string, unknown>>,
  deploymentStatuses = [] as Array<Record<string, unknown>>,
  productionRuns = [] as Array<Record<string, unknown>>,
  tagCommits = {} as Record<string, string>,
} = {}) {
  const endpoints = {
    listJobsForWorkflowRun: vi.fn(),
    listWorkflowRuns: vi.fn(),
    listDeployments: vi.fn(),
    listDeploymentStatuses: vi.fn(),
    listReleases: vi.fn(),
  }
  return {
    paginate: vi.fn(
      (
        endpoint: unknown,
        params: Record<string, unknown>,
      ): Promise<Array<unknown>> => {
        if (endpoint === endpoints.listJobsForWorkflowRun) {
          return Promise.resolve(jobs)
        }
        if (endpoint === endpoints.listWorkflowRuns) {
          return Promise.resolve(
            params.workflow_id === 'main-release.yml' ? runs : productionRuns,
          )
        }
        if (endpoint === endpoints.listDeployments) {
          return Promise.resolve(deployments)
        }
        if (endpoint === endpoints.listDeploymentStatuses) {
          return Promise.resolve(deploymentStatuses)
        }
        if (endpoint === endpoints.listReleases) {
          return Promise.resolve(releases)
        }
        throw new Error('unexpected endpoint')
      },
    ),
    rest: {
      actions: {
        listJobsForWorkflowRun: endpoints.listJobsForWorkflowRun,
        listWorkflowRuns: endpoints.listWorkflowRuns,
      },
      git: {
        getRef: vi.fn(({ ref }: { ref: string }) => {
          const sha = tagCommits[ref.replace(/^tags\//u, '')]
          if (!sha) throw new Error(`unknown tag ${ref}`)
          return Promise.resolve({ data: { object: { sha, type: 'commit' } } })
        }),
      },
      repos: {
        getBranch: vi.fn(() =>
          Promise.resolve({ data: { commit: { sha: mainSha } } }),
        ),
        listDeployments: endpoints.listDeployments,
        listDeploymentStatuses: endpoints.listDeploymentStatuses,
        listReleases: endpoints.listReleases,
      },
    },
  }
}

describe('isSuccessfulPreproductionJob', () => {
  it('matches the gate job only when it succeeded', () => {
    expect(isSuccessfulPreproductionJob(preproductionJob('success'))).toBe(true)
    expect(isSuccessfulPreproductionJob(preproductionJob('skipped'))).toBe(
      false,
    )
    expect(isSuccessfulPreproductionJob(preproductionJob('failure'))).toBe(
      false,
    )
    expect(
      isSuccessfulPreproductionJob({ name: 'release', conclusion: 'success' }),
    ).toBe(false)
    expect(isSuccessfulPreproductionJob(null)).toBe(false)
  })
})

describe('isTrustedReleaseCommit', () => {
  it('matches only committed production release bindings', () => {
    const bindings = {
      'v2026.10.30.1': { commitSha: targetSha },
      'v2026.10.29.1': { commitSha: 'd'.repeat(40) },
    }

    expect(isTrustedReleaseCommit(targetSha, bindings)).toBe(true)
    expect(isTrustedReleaseCommit(currentSha, bindings)).toBe(false)
    expect(isTrustedReleaseCommit(targetSha, {})).toBe(false)
  })
})

describe('verifyPreproductionGate', () => {
  it('accepts the triggering gate run when its pre-production job succeeded', async () => {
    const github = mockGithub({ jobs: [preproductionJob('success')] })

    await expect(
      verifyPreproductionGate(github, repository, {
        targetSha,
        gateRunId: '42',
      }),
    ).resolves.toEqual({ source: 'gate-run', runId: 42 })
  })

  it.each([
    { jobs: [] },
    { jobs: [preproductionJob('skipped')] },
    { jobs: [preproductionJob('failure')] },
    { jobs: [{ name: 'release', conclusion: 'success' }] },
  ])(
    'rejects the triggering gate run without evidence %o',
    async ({ jobs }) => {
      const github = mockGithub({ jobs })

      await expect(
        verifyPreproductionGate(github, repository, {
          targetSha,
          gateRunId: '42',
        }),
      ).rejects.toThrowError(/pre-production/u)
    },
  )

  it('exempts a trusted production release commit on manual dispatch', async () => {
    const releaseTag = 'v2026.10.30.1'
    const github = mockGithub({
      mainSha: currentSha,
      releases: [
        {
          author: { login: 'github-actions[bot]' },
          body: `- Validated main SHA: \`${targetSha}\`\n- Production workflow run: \`42\``,
          draft: false,
          prerelease: false,
          published_at: '2026-10-30T10:30:00.000Z',
          tag_name: releaseTag,
        },
      ],
      deployments: [
        {
          created_at: '2026-10-30T10:40:00.000Z',
          creator: { login: 'github-actions[bot]' },
          environment: 'production',
          id: 100,
          payload: {
            cloudflareVersionId: 'version-1',
            commitSha: targetSha,
            productionRunId: '42',
            releaseTag,
          },
          production_environment: true,
          ref: releaseTag,
          sha: targetSha,
        },
      ],
      deploymentStatuses: [
        {
          created_at: '2026-10-30T10:45:00.000Z',
          creator: { login: 'github-actions[bot]' },
          environment: 'production',
          state: 'success',
        },
      ],
      productionRuns: [
        {
          conclusion: 'success',
          display_title: `Production release ${targetSha}`,
          head_branch: 'main',
          id: 42,
          run_started_at: '2026-10-30T10:00:00.000Z',
          updated_at: '2026-10-30T11:00:00.000Z',
        },
      ],
      runs: [
        { conclusion: 'success', head_branch: 'main', head_sha: targetSha },
      ],
      tagCommits: { [releaseTag]: targetSha },
    })

    await expect(
      verifyPreproductionGate(github, repository, { targetSha }),
    ).resolves.toEqual({ source: 'trusted-release' })
  })

  it('requires gate-run evidence for the current main commit on manual dispatch', async () => {
    const github = mockGithub({
      mainSha: targetSha,
      runs: [
        {
          conclusion: 'success',
          head_branch: 'main',
          head_sha: targetSha,
          id: 7,
        },
      ],
      jobs: [preproductionJob('success')],
    })

    await expect(
      verifyPreproductionGate(github, repository, { targetSha }),
    ).resolves.toEqual({ source: 'gate-run', runId: 7 })
  })

  it('fails closed when no gate run for the target recorded pre-production evidence', async () => {
    const github = mockGithub({
      mainSha: targetSha,
      runs: [
        {
          conclusion: 'success',
          head_branch: 'main',
          head_sha: targetSha,
          id: 7,
        },
      ],
      jobs: [preproductionJob('skipped')],
    })

    await expect(
      verifyPreproductionGate(github, repository, { targetSha }),
    ).rejects.toThrowError(/pre-production gate evidence/u)
  })

  it('rejects an invalid target SHA before querying', async () => {
    const github = mockGithub()

    await expect(
      verifyPreproductionGate(github, repository, { targetSha: 'main' }),
    ).rejects.toThrowError(/full target commit SHA/u)
  })
})

describe('findGateRunWithPreproductionEvidence', () => {
  it('skips failed or mismatched gate runs for the target SHA', async () => {
    const github = mockGithub({
      runs: [
        { conclusion: 'failure', head_sha: targetSha, id: 1 },
        { conclusion: 'success', head_sha: 'd'.repeat(40), id: 2 },
        { conclusion: 'success', head_sha: targetSha, id: 3 },
      ],
      jobs: [preproductionJob('success')],
    })

    await expect(
      findGateRunWithPreproductionEvidence(github, repository, targetSha),
    ).resolves.toMatchObject({ id: 3 })
  })
})

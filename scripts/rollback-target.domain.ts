type DeploymentVersion = {
  version_id: string
  percentage: number
}

type Deployment = {
  created_on: string
  versions: Array<DeploymentVersion>
}

type DeploymentWithTimestamp = {
  createdAt: number
  deployment: Deployment
}

type VersionMetadata = {
  id: string
  annotations?: {
    'workers/tag'?: unknown
    'workers/message'?: unknown
  }
}

const RELEASE_TAG_PATTERN = /^v\d{4}\.\d{2}\.\d{2}\.\d+$/u
const RELEASE_MESSAGE_PATTERN =
  /^DINA (v\d{4}\.\d{2}\.\d{2}\.\d+) \(([0-9a-f]{40})\)$/u

export type RollbackTarget = {
  versionId: string
  legacyCompatible: boolean
  releaseTag: string | null
}

type RollbackTargetInput = {
  versionId: string
  version: VersionMetadata
  legacyVersionIds: Set<string>
  verifiedReleaseBindings: Record<string, unknown>
}

export function selectRollbackTarget(value: unknown): string {
  if (!Array.isArray(value))
    throw new Error('Deployments response must be an array')

  const deployments: Array<DeploymentWithTimestamp> = value
    .map(readDeployment)
    .map((deployment) => {
      const createdAt = Date.parse(deployment.created_on)
      if (Number.isNaN(createdAt)) {
        throw new Error('Deployment created_on must be a valid timestamp')
      }
      return { createdAt, deployment }
    })
    .sort(
      (left: DeploymentWithTimestamp, right: DeploymentWithTimestamp) =>
        right.createdAt - left.createdAt,
    )
  if (deployments.length === 0)
    throw new Error('No Cloudflare deployments were found')
  const newest = deployments[0]
  if (deployments[1]?.createdAt === newest.createdAt) {
    throw new Error('Cloudflare deployments have ambiguous newest timestamp')
  }

  const activeVersions = newest.deployment.versions
    .filter(
      (version: DeploymentVersion) =>
        version.version_id.trim() &&
        Number.isFinite(version.percentage) &&
        version.percentage >= 0 &&
        version.percentage <= 100,
    )
    .sort(
      (left: DeploymentVersion, right: DeploymentVersion) =>
        right.percentage - left.percentage,
    )
  if (activeVersions.length === 0) {
    throw new Error('Newest Cloudflare deployment has no active version')
  }
  const activeVersion = activeVersions[0]
  const highestPercentageVersions = activeVersions.filter(
    (version: DeploymentVersion) =>
      version.percentage === activeVersion.percentage,
  )
  if (highestPercentageVersions.length !== 1) {
    throw new Error(
      'Newest Cloudflare deployment has ambiguous active versions',
    )
  }
  return activeVersion.version_id
}

export function selectRollbackTargetInfo(value: unknown): RollbackTarget {
  const input = readRollbackTargetInput(value)
  if (input.version.id !== input.versionId)
    throw new Error('Rollback target version metadata did not match')
  return resolveRollbackTarget(input)
}

function readRollbackTargetInput(value: unknown): RollbackTargetInput {
  if (!isRecord(value))
    throw new Error('Rollback target input must be an object')
  if (
    !Array.isArray(value.deployments) ||
    !isRecord(value.version) ||
    !Array.isArray(value.legacyVersionIds)
  ) {
    throw new Error(
      'Rollback target input is missing deployments, version, or legacy version IDs',
    )
  }

  const versionId = selectRollbackTarget(value.deployments)
  const version = readVersionMetadata(value.version)
  return {
    versionId,
    version,
    legacyVersionIds: new Set(value.legacyVersionIds.map(readLegacyVersionId)),
    verifiedReleaseBindings: isRecord(value.verifiedReleaseBindings)
      ? value.verifiedReleaseBindings
      : {},
  }
}

function resolveRollbackTarget(input: RollbackTargetInput): RollbackTarget {
  const tag = readAnnotation(input.version.annotations?.['workers/tag'])
  const message = readAnnotation(input.version.annotations?.['workers/message'])
  if (tag && message) {
    return selectStrictRollbackTarget(input, tag, message)
  }
  if (!tag && !message) {
    return selectLegacyRollbackTarget(input)
  }
  throw new Error('Rollback target version has incomplete release metadata')
}

function selectStrictRollbackTarget(
  input: RollbackTargetInput,
  tag: string,
  message: string,
): RollbackTarget {
  if (!RELEASE_TAG_PATTERN.test(tag)) {
    throw new Error('Rollback target has an invalid release tag')
  }
  const identity = readReleaseIdentity(message)
  if (
    !identity ||
    identity.tag !== tag ||
    !isVerifiedReleaseBinding(
      input.verifiedReleaseBindings,
      tag,
      input.versionId,
      identity.commit,
    )
  ) {
    throw new Error('Rollback target release identity was not verified')
  }
  return {
    versionId: input.versionId,
    legacyCompatible: false,
    releaseTag: tag,
  }
}

function selectLegacyRollbackTarget(
  input: RollbackTargetInput,
): RollbackTarget {
  if (input.legacyVersionIds.has(input.versionId)) {
    return {
      versionId: input.versionId,
      legacyCompatible: true,
      releaseTag: null,
    }
  }
  throw new Error('Rollback target lacks explicit legacy verification')
}

function readDeployment(value: unknown): Deployment {
  if (!isRecord(value)) throw new Error('Deployment must be an object')
  if (typeof value.created_on !== 'string' || !Array.isArray(value.versions)) {
    throw new Error('Deployment is missing required fields')
  }
  return {
    created_on: value.created_on,
    versions: value.versions.map(readDeploymentVersion),
  }
}

function readDeploymentVersion(value: unknown): DeploymentVersion {
  if (!isRecord(value)) throw new Error('Deployment version must be an object')
  if (
    typeof value.version_id !== 'string' ||
    typeof value.percentage !== 'number'
  ) {
    throw new Error('Deployment version is missing required fields')
  }
  return { version_id: value.version_id, percentage: value.percentage }
}

function readVersionMetadata(value: unknown): VersionMetadata {
  if (!isRecord(value) || typeof value.id !== 'string') {
    throw new Error('Worker version metadata is missing an id')
  }
  const rawAnnotations = value.annotations
  if (rawAnnotations !== undefined && !isRecord(rawAnnotations)) {
    throw new Error('Worker version annotations must be an object')
  }
  const annotations = rawAnnotations
    ? {
        'workers/tag': rawAnnotations['workers/tag'],
        'workers/message': rawAnnotations['workers/message'],
      }
    : undefined
  return {
    id: value.id,
    annotations,
  }
}

function readAnnotation(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function readLegacyVersionId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Legacy rollback version IDs must be non-empty strings')
  }
  return value.trim()
}

function isVerifiedReleaseBinding(
  verifiedReleaseBindings: Record<string, unknown>,
  tag: string,
  versionId: string,
  commit: string,
): boolean {
  const binding = verifiedReleaseBindings[tag]
  return (
    isRecord(binding) &&
    binding.commitSha === commit &&
    binding.cloudflareVersionId === versionId
  )
}

function readReleaseIdentity(
  message: string,
): { tag: string; commit: string } | null {
  const match = RELEASE_MESSAGE_PATTERN.exec(message)
  return match ? { tag: match[1], commit: match[2] } : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

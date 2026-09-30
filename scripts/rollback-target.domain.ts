type DeploymentVersion = {
  version_id: string
  percentage: number
}

type Deployment = {
  created_on: string
  versions: Array<DeploymentVersion>
}

type VersionMetadata = {
  id: string
  annotations?: {
    'workers/tag'?: unknown
    'workers/message'?: unknown
  }
}

export type RollbackTarget = {
  versionId: string
  legacyCompatible: boolean
}

export function selectRollbackTarget(value: unknown): string {
  if (!Array.isArray(value))
    throw new Error('Deployments response must be an array')

  const deployments = value.map(readDeployment).toSorted((left, right) => {
    const leftTime = Date.parse(left.created_on)
    const rightTime = Date.parse(right.created_on)
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
      throw new Error('Deployment created_on must be a valid timestamp')
    }
    return rightTime - leftTime
  })
  const newest = deployments[0]
  if (!newest) throw new Error('No Cloudflare deployments were found')

  const activeVersion = newest.versions
    .filter(
      (version) =>
        version.version_id.trim() &&
        Number.isFinite(version.percentage) &&
        version.percentage >= 0 &&
        version.percentage <= 100,
    )
    .toSorted((left, right) => right.percentage - left.percentage)[0]
  if (!activeVersion) {
    throw new Error('Newest Cloudflare deployment has no active version')
  }
  return activeVersion.version_id
}

export function selectRollbackTargetInfo(value: unknown): RollbackTarget {
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
  const legacyVersionIds = new Set(
    value.legacyVersionIds.map(readLegacyVersionId),
  )
  if (version.id !== versionId)
    throw new Error('Rollback target version metadata did not match')

  const tag = readAnnotation(version.annotations?.['workers/tag'])
  const message = readAnnotation(version.annotations?.['workers/message'])
  if (tag && message) return { versionId, legacyCompatible: false }
  if (!tag && !message && legacyVersionIds.has(versionId)) {
    return { versionId, legacyCompatible: true }
  }
  if (!tag && !message) {
    throw new Error('Rollback target lacks explicit legacy verification')
  }
  throw new Error('Rollback target version has incomplete release metadata')
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// fallow-ignore-file unused-file -- invoked directly by production-release.yml

import {
  createReleaseTag,
  evaluateGuardrails,
  parseVersionMetrics,
  selectRolloutPlan,
  validateTargetSha,
  validateRolloutStageWaitSeconds,
} from './release-policy.domain'

const [command, ...args] = process.argv.slice(2)

if (command === 'validate-sha') {
  console.log(validateTargetSha(readOption(args, '--sha')))
} else if (command === 'tag') {
  const date = readOption(args, '--date')
  const tags = (readOptionalOption(args, '--tags') ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
  console.log(createReleaseTag(date, tags))
} else if (command === 'rollout') {
  const profile = readOption(args, '--profile')
  if (profile !== 'standard' && profile !== 'gradual') {
    throw new Error('rollout profile must be standard or gradual')
  }
  const requestsValue = readOptionalOption(args, '--requests')
  const requests =
    requestsValue === undefined ? undefined : Number(requestsValue)
  if (requests !== undefined && (!Number.isFinite(requests) || requests < 0)) {
    throw new Error('--requests must be a non-negative number')
  }
  console.log(JSON.stringify(selectRolloutPlan(profile, requests)))
} else if (command === 'guardrails') {
  const metrics = parseVersionMetrics(JSON.parse(readOption(args, '--metrics')))
  const result = evaluateGuardrails(metrics)
  console.log(JSON.stringify(result))
  if (!result.passed) process.exitCode = 1
} else if (command === 'rollout-wait') {
  console.log(validateRolloutStageWaitSeconds(readOption(args, '--seconds')))
} else {
  throw new Error(
    'Usage: release-policy.ts validate-sha|tag|rollout|rollout-wait|guardrails ...',
  )
}

function readOption(optionArgs: Array<string>, name: string): string {
  const value = readOptionalOption(optionArgs, name)
  if (!value) throw new Error(`${name} is required`)
  return value
}

function readOptionalOption(
  optionArgs: Array<string>,
  name: string,
): string | undefined {
  const index = optionArgs.indexOf(name)
  return index === -1 ? undefined : optionArgs[index + 1]
}

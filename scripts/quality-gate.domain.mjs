export function resolveVerdict(output) {
  return output?.verdict ?? 'unknown'
}

export function collectIntroducedComplexity(output) {
  // Block on every introduced finding: cyclomatic, cognitive, and CRAP alike.
  // Fallow only emits a finding when a threshold is exceeded, so the presence of
  // an introduced finding is itself the signal. See docs/rules/complexity.md.
  return (output?.complexity?.findings ?? []).filter(
    (finding) => finding.introduced === true,
  )
}

export function fallowVerdictAllowsSubmit(verdict) {
  return verdict === 'pass' || verdict === 'warn'
}

export function blockingFallowVerdictMessage(verdict) {
  return verdict === 'fail'
    ? 'Fallow reported fail; blocking submit.'
    : `Fallow returned unknown verdict "${verdict}"; blocking submit.`
}

export function fallowExitStatusPasses(status, verdict) {
  return status === 0 || verdict === 'warn'
}

export function fallowExitStatusError(status) {
  return `Fallow exited with code ${status ?? 'unknown'}; blocking submit.`
}

export function assertJsonMatch(match) {
  if (match === null) throw new Error('No JSON object found in Fallow output')
  return match[0]
}

export function extractJson(text) {
  try {
    const jsonStr = assertJsonMatch(text.trim().match(/\{[\s\S]*\}/u))
    return JSON.parse(jsonStr)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse JSON: ${error.message}`)
    }
    throw error
  }
}

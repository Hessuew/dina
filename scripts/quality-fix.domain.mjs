export function formatCommand(command, args) {
  return [command, ...args].join(' ')
}

export function describeCheck({ name, command, args, skip = false }) {
  if (skip) {
    return { skip: true, log: `\n==> ${name}: skipped` }
  }

  return { skip: false, log: `\n==> ${name}: ${formatCommand(command, args)}` }
}

export function interpretCheckResult(name, result) {
  if (result.error) {
    return {
      ok: false,
      error: `\n${name} failed to start: ${result.error.message}`,
    }
  }

  if (result.status !== 0) {
    return {
      ok: false,
      error: `\n${name} failed with exit code ${result.status ?? 'unknown'}.`,
    }
  }

  return { ok: true, error: null }
}

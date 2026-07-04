#!/usr/bin/env node
// sentry-axi — Agent-ergonomic Sentry CLI
// AXI-compliant: TOON output, structured errors, no interactive prompts
// Exit codes: 0 success/no-op, 1 error, 2 usage error

// ── TOON output helpers ───────────────────────────────────────────────────────

/** Escape a single value for TOON: quote if it contains commas, quotes, or newlines */
function tval(v) {
  if (v == null) return ''
  const s = String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
    : s
}

function tScalar(key, value) {
  return `${key}: ${tval(value)}\n`
}

function tObject(key, obj) {
  return (
    `${key}:\n` +
    Object.entries(obj)
      .map(([k, v]) => `  ${k}: ${tval(v)}\n`)
      .join('')
  )
}

function tList(key, fields, rows, total) {
  const n = rows.length
  const count = total != null && total > n ? `${n}/${total}` : `${n}`
  return (
    `${key}[${count}]{${fields.join(',')}}:\n` +
    rows.map((r) => '  ' + r.map(tval).join(',') + '\n').join('')
  )
}

function tHelp(hints) {
  if (!hints?.length) return ''
  return `help[${hints.length}]:\n` + hints.map((h) => `  ${h}\n`).join('')
}

function tError(message, code, hints = []) {
  return `error: ${message}\ncode: ${code}\n${tHelp(hints)}`
}

// ── IO helpers ────────────────────────────────────────────────────────────────

const print = (s) => process.stdout.write(s)

function die(message, code = 'ERROR', hints = [], exitCode = 1) {
  print(tError(message, code, hints))
  process.exit(exitCode)
}

async function run(fn) {
  try {
    await fn()
  } catch (err) {
    if (err.httpStatus === 401 || err.httpStatus === 403) {
      die('Authentication failed or insufficient permissions', 'AUTH_ERROR', [
        'Check that SENTRY_AUTH_TOKEN is valid and has required scopes',
        'Required scopes: org:read event:read event:admin',
        `API error: ${err.message}`,
      ])
    }
    if (err.httpStatus === 404) {
      die(`Not found: ${err.message}`, 'NOT_FOUND', [
        'Run `sentry-axi issues list` to find valid issue IDs',
      ])
    }
    die(`Unexpected error: ${err.message}`, 'UNEXPECTED_ERROR', [
      'Set SENTRY_URL if using a self-hosted Sentry instance',
    ])
  }
}

// ── Auth & context ────────────────────────────────────────────────────────────

function requireToken() {
  const token = process.env.SENTRY_AUTH_TOKEN
  if (!token) {
    die('SENTRY_AUTH_TOKEN is not set', 'AUTH_REQUIRED', [
      'Export SENTRY_AUTH_TOKEN=<your-token>',
      'Get a token: https://sentry.io/settings/account/api/auth-tokens/',
      'Required scopes: org:read event:read event:admin',
    ])
  }
  return token
}

const getSentryUrl = () =>
  (process.env.SENTRY_URL || 'https://sentry.io').replace(/\/$/, '')

function resolveContext(flags) {
  return {
    org: flags.org || process.env.SENTRY_ORG || null,
    project: flags.project || process.env.SENTRY_PROJECT || null,
  }
}

// ── Sentry REST API client ────────────────────────────────────────────────────

async function apiFetch(token, path, opts = {}) {
  const url = `${getSentryUrl()}/api/0${path}`
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  })
  if (res.ok) return res.status === 204 ? {} : res.json()
  let msg
  try {
    msg = (await res.json()).detail || `HTTP ${res.status}`
  } catch {
    msg = `HTTP ${res.status}`
  }
  const err = new Error(msg)
  err.httpStatus = res.status
  throw err
}

const apiGet = (token, path) => apiFetch(token, path)
const apiPatch = (token, path, body) =>
  apiFetch(token, path, { method: 'PATCH', body: JSON.stringify(body) })

async function resolveIssueId(token, idOrShort, org) {
  if (/^\d+$/.test(idOrShort)) return idOrShort
  if (!org) {
    die(
      '--org required to resolve short IDs like PROJ-123',
      'MISSING_REQUIRED_ARG',
      [
        'Pass --org <slug> or set SENTRY_ORG',
        'Or use the numeric issue ID shown in `issues list`',
      ],
    )
  }
  const data = await apiGet(
    token,
    `/organizations/${org}/shortids/${encodeURIComponent(idOrShort)}/`,
  )
  return data.issueId
}

// ── Time formatting ───────────────────────────────────────────────────────────

function relativeTime(iso) {
  if (!iso) return '-'
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`
  if (s < 31536000) return `${Math.floor(s / 2592000)}mo ago`
  return `${Math.floor(s / 31536000)}y ago`
}

// ── Arg parser ────────────────────────────────────────────────────────────────

function parseArgs(args) {
  const flags = {},
    positional = []
  let i = 0
  while (i < args.length) {
    const a = args[i]
    if (a === '--') {
      positional.push(...args.slice(i + 1))
      break
    }
    if (a.startsWith('--')) {
      const eqIdx = a.indexOf('=')
      if (eqIdx > 0) {
        flags[a.slice(2, eqIdx)] = a.slice(eqIdx + 1)
      } else {
        const key = a.slice(2)
        const next = args[i + 1]
        flags[key] = !next || next.startsWith('-') ? true : (i++, next)
      }
    } else if (a.startsWith('-') && a.length === 2) {
      const next = args[i + 1]
      flags[a.slice(1)] = !next || next.startsWith('-') ? true : (i++, next)
    } else {
      positional.push(a)
    }
    i++
  }
  return { flags, positional }
}

// ── Commands: orgs / projects / whoami ────────────────────────────────────────

async function cmdOrgs(token) {
  const orgs = await apiGet(token, '/organizations/')
  if (!orgs.length) {
    print('organizations: 0 found\n')
    return
  }
  print(
    tList(
      'organizations',
      ['slug', 'name'],
      orgs.map((o) => [o.slug, o.name]),
    ),
  )
  print(tHelp(['Run `sentry-axi projects --org <slug>` to list projects']))
}

async function cmdProjects(token, flags) {
  const { org } = resolveContext(flags)
  const path = org ? `/organizations/${org}/projects/` : '/projects/'
  const projects = await apiGet(token, path)
  if (!projects.length) {
    print('projects: 0 found\n')
    return
  }
  print(
    tList(
      'projects',
      ['slug', 'name', 'platform'],
      projects.map((p) => [p.slug, p.name, p.platform || '-']),
    ),
  )
  print(tHelp(['Run `sentry-axi issues list --project <slug>` to list issues']))
}

async function cmdWhoami(token, flags) {
  const auth = await apiGet(token, '/auth/')
  print(
    tObject('auth', {
      user: auth.user?.name || auth.user?.username || '-',
      email: auth.user?.email || '-',
    }),
  )
  const { org, project } = resolveContext(flags)
  print(
    tObject('context', {
      org: org || '(not set)',
      project: project || '(not set)',
    }),
  )
  if (!org)
    print(
      tHelp(['Set SENTRY_ORG and SENTRY_PROJECT env vars for default context']),
    )
}

// ── Command: issues list ──────────────────────────────────────────────────────

async function cmdIssuesList(token, flags) {
  const { org, project } = resolveContext(flags)
  if (!org)
    die('--org is required (or set SENTRY_ORG)', 'MISSING_REQUIRED_ARG', [
      'Run `sentry-axi orgs` to list your organizations',
    ])
  const status = flags.status || 'unresolved'
  const limit = parseInt(flags.limit) || 25
  const query = flags.query || `is:${status}`
  let path = `/organizations/${org}/issues/?query=${encodeURIComponent(query)}&limit=${limit}`
  if (project) path += `&project=${encodeURIComponent(project)}`
  const issues = await apiGet(token, path)
  if (!issues.length) {
    print(`issues: 0 ${status} issues found\n`)
    return
  }
  print(
    tList(
      'issues',
      ['id', 'title', 'events', 'last_seen', 'culprit'],
      issues.map((i) => [
        i.shortId || i.id,
        (i.title || '').substring(0, 60),
        i.count,
        relativeTime(i.lastSeen),
        (i.culprit || '-').substring(0, 40),
      ]),
    ),
  )
  print(
    tHelp([
      'Run `sentry-axi issues view <id>` for full detail + stack trace',
      'Flags: --status resolved|muted, --limit <n>, --query <sentry-query>',
    ]),
  )
}

// ── Command: issues view ──────────────────────────────────────────────────────

function extractFrames(event) {
  const ex = event?.exception?.values?.[0]
  const st = ex?.stacktrace || event?.stacktrace
  return (st?.frames || []).filter(
    (f) => f.inApp || !String(f.filename || '').includes('node_modules'),
  )
}

function formatStack(frames, full) {
  const relevant = full ? frames : frames.slice(-10)
  return relevant
    .reverse()
    .map((f) => {
      const loc = f.absPath || f.filename || f.module || '?'
      const fn = f.function || '(anonymous)'
      return `at ${fn} (${loc}${f.lineNo ? `:${f.lineNo}` : ''})`
    })
    .join('\n')
}

async function cmdIssuesView(token, idOrShort, flags) {
  const { org } = resolveContext(flags)
  const issueId = await resolveIssueId(token, idOrShort, org)
  const [issue, event] = await Promise.all([
    apiGet(token, `/issues/${issueId}/`),
    apiGet(token, `/issues/${issueId}/events/latest/`).catch(() => null),
  ])
  print(
    tObject('issue', {
      id: issue.shortId || issue.id,
      title: issue.title,
      status: issue.status,
      level: issue.level || '-',
      times_seen: issue.count,
      users_affected: issue.userCount || '0',
      culprit: issue.culprit || '-',
      first_seen: relativeTime(issue.firstSeen),
      last_seen: relativeTime(issue.lastSeen),
      project: issue.project?.slug || '-',
    }),
  )
  if (!event) {
    print('stack_trace: (no events found)\n')
    return
  }
  const frames = extractFrames(event)
  const stackStr = frames.length
    ? formatStack(frames, flags.full)
    : '(no in-app frames)'
  const LIMIT = 1500
  const body = stackStr
    .split('\n')
    .map((l) => `  ${l}`)
    .join('\n')
  if (flags.full || stackStr.length <= LIMIT) {
    print(`stack_trace:\n${body}\n`)
  } else {
    print(
      `stack_trace:\n${body.substring(0, LIMIT)}\n  ... (truncated, ${stackStr.length} chars total)\n`,
    )
    print(
      tHelp([
        `Run \`sentry-axi issues view ${idOrShort} --full\` to see complete stack trace`,
      ]),
    )
  }
  print(
    tHelp([
      `Run \`sentry-axi issues resolve ${idOrShort}\` to mark as resolved`,
      `Run \`sentry-axi issues mute ${idOrShort}\` to mute`,
    ]),
  )
}

// ── Command: issues mutate ────────────────────────────────────────────────────

async function cmdIssuesMutate(token, idOrShort, verb, flags) {
  const statusMap = {
    resolve: 'resolved',
    mute: 'ignored',
    unresolve: 'unresolved',
  }
  const newStatus = statusMap[verb]
  const { org } = resolveContext(flags)
  const issueId = await resolveIssueId(token, idOrShort, org)
  const issue = await apiGet(token, `/issues/${issueId}/`)
  const cur = issue.status
  const alreadyDone =
    (verb === 'resolve' && cur === 'resolved') ||
    (verb === 'mute' && cur === 'ignored') ||
    (verb === 'unresolve' && cur === 'unresolved')
  if (alreadyDone) {
    print(`issue: ${idOrShort} already ${newStatus} (no-op)\n`)
    return
  }
  await apiPatch(token, `/issues/${issueId}/`, { status: newStatus })
  print(`issue: ${idOrShort} → ${newStatus}\n`)
}

// ── Commands: releases ────────────────────────────────────────────────────────

async function cmdReleasesList(token, flags) {
  const { org, project } = resolveContext(flags)
  if (!org)
    die('--org is required (or set SENTRY_ORG)', 'MISSING_REQUIRED_ARG', [
      'Run `sentry-axi orgs` to list your organizations',
    ])
  const limit = parseInt(flags.limit) || 10
  let path = `/organizations/${org}/releases/?limit=${limit}`
  if (project) path += `&project=${encodeURIComponent(project)}`
  const releases = await apiGet(token, path)
  if (!releases.length) {
    print('releases: 0 found\n')
    return
  }
  print(
    tList(
      'releases',
      ['version', 'created', 'new_issues', 'projects'],
      releases.map((r) => [
        r.shortVersion || r.version,
        relativeTime(r.dateCreated),
        r.newGroups || '0',
        (r.projects || []).map((p) => p.slug).join(';') || '-',
      ]),
    ),
  )
  print(tHelp(['Run `sentry-axi releases view <version>` for details']))
}

async function cmdReleasesView(token, version, flags) {
  const { org } = resolveContext(flags)
  if (!org)
    die('--org is required (or set SENTRY_ORG)', 'MISSING_REQUIRED_ARG', [
      'Run `sentry-axi orgs` to list your organizations',
    ])
  const rel = await apiGet(
    token,
    `/organizations/${org}/releases/${encodeURIComponent(version)}/`,
  )
  print(
    tObject('release', {
      version: rel.shortVersion || rel.version,
      status: rel.status || '-',
      created: relativeTime(rel.dateCreated),
      released: relativeTime(rel.dateReleased),
      new_issues: rel.newGroups || '0',
      commits: rel.commitCount || '0',
      projects: (rel.projects || []).map((p) => p.slug).join(', ') || '-',
    }),
  )
}

// ── Command: home ─────────────────────────────────────────────────────────────

async function cmdHome(token, flags) {
  const { org, project } = resolveContext(flags)
  if (!org) {
    const auth = await apiGet(token, '/auth/')
    print(
      tObject('sentry', {
        status: 'authenticated',
        user: auth.user?.email || auth.user?.username || '-',
      }),
    )
    const orgs = await apiGet(token, '/organizations/')
    if (orgs.length === 1) {
      print(
        tHelp([
          `Set SENTRY_ORG=${orgs[0].slug} then re-run for issue dashboard`,
        ]),
      )
    } else {
      print(
        tList(
          'organizations',
          ['slug', 'name'],
          orgs.map((o) => [o.slug, o.name]),
        ),
      )
      print(tHelp(['Set SENTRY_ORG=<slug> then re-run for issue dashboard']))
    }
    return
  }
  let issuePath = `/organizations/${org}/issues/?query=is:unresolved&limit=5`
  if (project) issuePath += `&project=${encodeURIComponent(project)}`
  const relPath = `/organizations/${org}/releases/?limit=1${project ? `&project=${encodeURIComponent(project)}` : ''}`
  const [issues, releases] = await Promise.all([
    apiGet(token, issuePath).catch(() => []),
    apiGet(token, relPath).catch(() => []),
  ])
  print(tScalar('context', project ? `${org}/${project}` : org))
  if (!issues.length) {
    print('issues: 0 unresolved\n')
  } else {
    print(
      tList(
        'top_issues',
        ['id', 'title', 'events', 'last_seen'],
        issues.map((i) => [
          i.shortId || i.id,
          (i.title || '').substring(0, 50),
          i.count,
          relativeTime(i.lastSeen),
        ]),
      ),
    )
  }
  if (releases.length) {
    const r = releases[0]
    print(
      tObject('latest_release', {
        version: r.shortVersion || r.version,
        new_issues: r.newGroups || '0',
        created: relativeTime(r.dateCreated),
      }),
    )
  }
  print(
    tHelp([
      'Run `sentry-axi issues list` for all unresolved issues',
      'Run `sentry-axi issues view <id>` for issue detail + stack trace',
      'Run `sentry-axi releases list` for all releases',
    ]),
  )
}

// ── Command: setup ────────────────────────────────────────────────────────────

function cmdSetup() {
  const scriptPath = new URL(import.meta.url).pathname
  print(tObject('setup', { script: scriptPath, invoke: `node ${scriptPath}` }))
  print('\nTo install as a Claude Code session hook (project-level):\n')
  print('  Add to .claude/settings.json under hooks.SessionStart:\n')
  print(`  { "type": "command", "command": "node ${scriptPath}" }\n\n`)
  print(
    '  (Ensure SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT are set in the environment)\n\n',
  )
  print(
    tHelp([
      'Docs: https://docs.anthropic.com/en/docs/claude-code/hooks',
      'The home command (no args) provides a compact session-start dashboard',
    ]),
  )
}

// ── Help text ─────────────────────────────────────────────────────────────────

function printHelp() {
  print(`sentry-axi — Agent-ergonomic Sentry CLI

Usage: node scripts/sentry-axi.mjs [command] [subcommand] [id] [flags]

Commands:
  (none)                     Home: top unresolved issues + latest release
  issues list                List issues (default: is:unresolved)
  issues view <id>           Issue detail + stack trace  (--full for all frames)
  issues resolve <id>        Mark as resolved (idempotent)
  issues mute <id>           Mute/ignore an issue (idempotent)
  issues unresolve <id>      Re-open an issue (idempotent)
  releases list              List recent releases
  releases view <version>    Release detail
  projects                   List projects
  orgs                       List accessible organizations
  whoami                     Show authenticated user + active context
  setup                      Print session hook install instructions

Global flags:
  --org <slug>               Sentry org slug  (or SENTRY_ORG env var)
  --project <slug>           Project slug     (or SENTRY_PROJECT env var)
  --help, -h                 Show this help
  --version                  Print version

Per-command flags:
  issues list:  --status unresolved|resolved|muted  --limit <n>  --query <q>
  issues view:  --full (complete stack trace)
  releases list: --limit <n>

Auth:
  export SENTRY_AUTH_TOKEN=<token>
  Required scopes: org:read  event:read  event:admin
  Get a token: https://sentry.io/settings/account/api/auth-tokens/

Context (set once, used by all commands):
  export SENTRY_ORG=<your-org-slug>
  export SENTRY_PROJECT=<your-project-slug>   # optional, scopes all commands

Self-hosted:
  export SENTRY_URL=https://your-sentry.example.com

Output: TOON format (token-efficient; ~40% smaller than JSON)
Exit codes: 0 success/no-op, 1 error, 2 usage error
`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(args) {
  const { flags, positional } = parseArgs(args)

  if (flags.help || flags.h) {
    printHelp()
    return
  }
  if (flags.version) {
    print('sentry-axi 1.0.0\n')
    return
  }

  const [noun, verb, id] = positional

  if (noun === 'setup') {
    cmdSetup()
    return
  }

  // Validate command before requiring auth (fail fast with usage error, not auth error)
  const KNOWN_NOUNS = new Set([
    undefined,
    'home',
    'issues',
    'releases',
    'projects',
    'orgs',
    'organizations',
    'whoami',
  ])
  if (!KNOWN_NOUNS.has(noun)) {
    die(
      `Unknown command: ${noun}`,
      'UNKNOWN_COMMAND',
      [
        'Valid: issues, releases, projects, orgs, whoami, setup',
        'Run sentry-axi --help for usage',
      ],
      2,
    )
  }

  const token = requireToken()

  switch (noun) {
    case undefined:
    case 'home':
      await run(() => cmdHome(token, flags))
      break
    case 'orgs':
    case 'organizations':
      await run(() => cmdOrgs(token))
      break
    case 'projects':
      await run(() => cmdProjects(token, flags))
      break
    case 'whoami':
      await run(() => cmdWhoami(token, flags))
      break
    case 'issues':
      switch (verb) {
        case undefined:
        case 'list':
          await run(() => cmdIssuesList(token, flags))
          break
        case 'view':
          if (!id)
            die(
              'Issue ID required',
              'MISSING_ARG',
              ['Usage: sentry-axi issues view <id>'],
              2,
            )
          await run(() => cmdIssuesView(token, id, flags))
          break
        case 'resolve':
        case 'mute':
        case 'unresolve':
          if (!id)
            die(
              'Issue ID required',
              'MISSING_ARG',
              [`Usage: sentry-axi issues ${verb} <id>`],
              2,
            )
          await run(() => cmdIssuesMutate(token, id, verb, flags))
          break
        default:
          die(
            `Unknown subcommand: issues ${verb}`,
            'UNKNOWN_SUBCOMMAND',
            ['Valid: list, view <id>, resolve <id>, mute <id>, unresolve <id>'],
            2,
          )
      }
      break
    case 'releases':
      switch (verb) {
        case undefined:
        case 'list':
          await run(() => cmdReleasesList(token, flags))
          break
        case 'view':
          if (!id)
            die(
              'Version required',
              'MISSING_ARG',
              ['Usage: sentry-axi releases view <version>'],
              2,
            )
          await run(() => cmdReleasesView(token, id, flags))
          break
        default:
          die(
            `Unknown subcommand: releases ${verb}`,
            'UNKNOWN_SUBCOMMAND',
            ['Valid: list, view <version>'],
            2,
          )
      }
      break
  }
}

main(process.argv.slice(2)).catch((err) => {
  process.stdout.write(tError(`Fatal: ${err.message}`, 'FATAL', []))
  process.exit(1)
})

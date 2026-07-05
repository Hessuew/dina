#!/usr/bin/env node
// linear-axi - AXI wrapper around linear-cli.
// Output: TOON on stdout. Exit codes: 0 success, 1 error, 2 usage.

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const DESCRIPTION =
  'Agent-ergonomic Linear CLI wrapper for the current workspace'
const DEFAULT_LIMIT = '10'
const DETAIL_LIMIT = 1200
const SAFE_GLOBALS = [
  '--output',
  'json',
  '--compact',
  '--quiet',
  '--no-color',
  '--no-pager',
]

const COMMANDS = {
  issues: {
    list: new Set([
      'team',
      'state',
      'assignee',
      'mine',
      'project',
      'label',
      'limit',
      'after',
      'before',
      'all',
      'archived',
      'dry-run',
      'help',
      'h',
    ]),
    view: new Set(['comments', 'history', 'full', 'help', 'h']),
    create: new Set([
      'team',
      'description',
      'description-file',
      'priority',
      'state',
      'assignee',
      'label',
      'project',
      'due',
      'estimate',
      'template',
      'dry-run',
      'help',
      'h',
    ]),
    update: new Set([
      'title',
      'description',
      'description-file',
      'priority',
      'state',
      'assignee',
      'label',
      'project',
      'due',
      'estimate',
      'dry-run',
      'help',
      'h',
    ]),
  },
  comments: {
    list: new Set(['limit', 'after', 'before', 'all', 'help', 'h']),
    create: new Set(['body', 'body-file', 'parent-id', 'help', 'h']),
  },
  teams: { list: new Set(['limit', 'help', 'h']) },
  projects: { list: new Set(['limit', 'archived', 'help', 'h']) },
  statuses: { list: new Set(['team', 'help', 'h']) },
  search: { issues: new Set(['limit', 'help', 'h']) },
}

function print(text) {
  process.stdout.write(text)
}

function homePath(path) {
  const home = process.env.HOME
  return home && path.startsWith(home) ? `~${path.slice(home.length)}` : path
}

function tval(value) {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\n\r]/.test(text)
    ? `"${text
        .replaceAll('\\', '\\\\')
        .replaceAll('"', '\\"')
        .replaceAll('\n', '\\n')
        .replaceAll('\r', '')}"`
    : text
}

function tScalar(key, value) {
  return `${key}: ${tval(value)}\n`
}

function tObject(key, obj) {
  const rows = Object.entries(obj).map(([name, value]) => {
    return `  ${name}: ${tval(value)}\n`
  })
  return `${key}:\n${rows.join('')}`
}

function tList(key, fields, rows, total) {
  const count =
    total && total > rows.length ? `${rows.length}/${total}` : rows.length
  const body = rows.map((row) => `  ${row.map(tval).join(',')}\n`).join('')
  return `${key}[${count}]{${fields.join(',')}}:\n${body}`
}

function tHelp(hints) {
  if (!hints.length) return ''
  return `help[${hints.length}]:\n${hints.map((hint) => `  ${hint}\n`).join('')}`
}

function tError(message, code, hints = []) {
  return `error: ${tval(message)}\ncode: ${code}\n${tHelp(hints)}`
}

function die(message, code = 'ERROR', hints = [], exitCode = 1) {
  print(tError(message, code, hints))
  process.exit(exitCode)
}

function parseArgs(args) {
  const flags = {}
  const positional = []

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--') {
      positional.push(...args.slice(i + 1))
      break
    }
    if (!arg.startsWith('-') || arg === '-') {
      positional.push(arg)
      continue
    }

    const normalized = arg.startsWith('--') ? arg.slice(2) : shortFlagName(arg)
    const eqIndex = normalized.indexOf('=')
    const key = eqIndex === -1 ? normalized : normalized.slice(0, eqIndex)
    const inlineValue = eqIndex === -1 ? null : normalized.slice(eqIndex + 1)
    const next = args[i + 1]
    const value =
      inlineValue ?? (!next || next.startsWith('-') ? true : ((i += 1), next))

    if (flags[key] === undefined) flags[key] = value
    else if (Array.isArray(flags[key])) flags[key].push(value)
    else flags[key] = [flags[key], value]
  }

  return { flags, positional }
}

function shortFlagName(arg) {
  const map = {
    '-a': 'assignee',
    '-d': 'description',
    '-e': 'estimate',
    '-h': 'h',
    '-l': 'label',
    '-p': 'priority',
    '-s': 'state',
    '-t': 'team',
    '-T': 'title',
  }
  return map[arg] ?? arg.slice(1)
}

function validateFlags(scope, flags, allowed) {
  const unknown = Object.keys(flags).filter((flag) => !allowed.has(flag))
  if (unknown.length) {
    die(
      `unknown flag --${unknown[0]} for ${scope}`,
      'USAGE_ERROR',
      [
        `Valid flags: ${[...allowed].map((flag) => `--${flag}`).join(', ')}`,
        `Run \`node scripts/linear-axi.mjs ${scope} --help\` for examples`,
      ],
      2,
    )
  }
}

function readTextFlag(flags, inlineName, fileName) {
  if (flags[fileName]) return readFileSync(String(flags[fileName]), 'utf8')
  return flags[inlineName] ? String(flags[inlineName]) : null
}

function flagValues(flags, name) {
  if (flags[name] === undefined) return []
  return Array.isArray(flags[name]) ? flags[name] : [flags[name]]
}

function addFlag(args, name, value) {
  if (value === undefined || value === false || value === null) return
  args.push(`--${name}`)
  if (value !== true) args.push(String(value))
}

function addRepeated(args, name, values) {
  for (const value of values) addFlag(args, name, value)
}

function issueListArgs(flags) {
  const args = ['issues', 'list']
  for (const key of [
    'team',
    'state',
    'assignee',
    'project',
    'limit',
    'after',
    'before',
  ]) {
    addFlag(args, key, flags[key])
  }
  addFlag(args, 'mine', flags.mine)
  addFlag(args, 'all', flags.all)
  addFlag(args, 'archived', flags.archived)
  addFlag(args, 'dry-run', flags['dry-run'])
  addFlag(args, 'label', flags.label)
  if (!flags.limit && !flags.all) addFlag(args, 'limit', DEFAULT_LIMIT)
  return args
}

function issueCreateArgs(title, flags) {
  const args = ['issues', 'create', title]
  for (const key of [
    'team',
    'priority',
    'state',
    'assignee',
    'project',
    'due',
    'estimate',
    'template',
  ]) {
    addFlag(args, key, flags[key])
  }
  addFlag(
    args,
    'description',
    readTextFlag(flags, 'description', 'description-file'),
  )
  addRepeated(args, 'labels', flagValues(flags, 'label'))
  addFlag(args, 'dry-run', flags['dry-run'])
  return args
}

function issueUpdateArgs(id, flags) {
  const args = ['issues', 'update', id]
  for (const key of [
    'title',
    'priority',
    'state',
    'assignee',
    'project',
    'due',
    'estimate',
  ]) {
    addFlag(args, key, flags[key])
  }
  addFlag(
    args,
    'description',
    readTextFlag(flags, 'description', 'description-file'),
  )
  addRepeated(args, 'labels', flagValues(flags, 'label'))
  addFlag(args, 'dry-run', flags['dry-run'])
  return args
}

function normalizeLinearError(result) {
  const stdout = result.stdout?.trim()
  const stderr = result.stderr?.trim()
  const parsed = safeJson(stdout)
  const message =
    parsed?.message || parsed?.error || stderr || stdout || 'linear-cli failed'

  if (result.error?.code === 'ENOENT') {
    return {
      code: 'DEPENDENCY_MISSING',
      message: 'linear-cli is not installed or not on PATH',
      hints: ['Install and authenticate linear-cli before using linear-axi'],
    }
  }
  if (/panicked at|called `Result::unwrap/.test(message)) {
    return {
      code: 'DEPENDENCY_CRASH',
      message: 'linear-cli crashed before returning Linear data',
      hints: [
        'Run API-backed Linear commands outside the restricted sandbox/with approval',
        'Known cause: linear-cli uses reqwest system proxy detection, which can panic in the sandbox on macOS',
      ],
    }
  }
  if (/auth|api key|unauthorized|forbidden/i.test(message)) {
    return {
      code: 'AUTH_REQUIRED',
      message,
      hints: [
        'Run `linear-cli auth` or configure the Linear API key for linear-cli',
      ],
    }
  }
  return {
    code: parsed?.code ? `LINEAR_${parsed.code}` : 'LINEAR_ERROR',
    message,
    hints: [
      'Run `linear-cli doctor` for dependency and authentication diagnostics',
    ],
  }
}

function runLinear(args, options = {}) {
  if (process.env.LINEAR_AXI_DEBUG_ARGS) {
    process.stderr.write(
      `${JSON.stringify(['linear-cli', ...args, ...SAFE_GLOBALS])}\n`,
    )
  }
  const child = spawnSync('linear-cli', [...args, ...SAFE_GLOBALS], {
    cwd: process.cwd(),
    encoding: 'utf8',
    input: options.input,
    maxBuffer: 1024 * 1024 * 20,
  })

  if (child.error || child.status !== 0) {
    throw Object.assign(
      new Error('linear-cli failed'),
      normalizeLinearError(child),
      {
        status: child.status,
      },
    )
  }

  if (options.rawText) return child.stdout.trim()
  const parsed = safeJson(child.stdout)
  if (parsed === null) {
    throw Object.assign(new Error('linear-cli returned non-JSON output'), {
      code: 'PARSE_ERROR',
      message: 'linear-cli returned non-JSON output',
      hints: [
        'Run the same command through `linear-cli ... --output json` to inspect it',
      ],
    })
  }
  return parsed
}

function safeJson(text) {
  if (!text?.trim()) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function asArray(data) {
  if (Array.isArray(data)) return data
  for (const key of [
    'issues',
    'nodes',
    'data',
    'results',
    'comments',
    'teams',
    'projects',
    'statuses',
  ]) {
    if (Array.isArray(data?.[key])) return data[key]
  }
  return data ? [data] : []
}

function text(value, fallback = '-') {
  return value === null || value === undefined || value === ''
    ? fallback
    : String(value)
}

function prop(item, path, fallback = '-') {
  const value = path.split('.').reduce((obj, key) => obj?.[key], item)
  return text(value, fallback)
}

function truncate(value, full) {
  const body = text(value, '')
  if (full || body.length <= DETAIL_LIMIT) return body
  return `${body.slice(0, DETAIL_LIMIT)}... (truncated, ${body.length} chars total)`
}

function renderIssuesList(data) {
  const issues = asArray(data)
  if (!issues.length) return print('issues: 0 found\n')
  print(
    tList(
      'issues',
      ['identifier', 'title', 'state', 'assignee', 'priority'],
      issues.map((issue) => [
        prop(issue, 'identifier', prop(issue, 'id')),
        prop(issue, 'title'),
        prop(issue, 'state.name', prop(issue, 'state')),
        prop(issue, 'assignee.name', prop(issue, 'assignee')),
        prop(issue, 'priority'),
      ]),
      data?.totalCount,
    ),
  )
  print(
    tHelp(['Run `node scripts/linear-axi.mjs issues view <id>` for detail']),
  )
}

function renderIssueDetail(data, flags) {
  const issue = Array.isArray(data) ? data[0] : data
  if (!issue) return print('issue: not found\n')
  const id = prop(issue, 'identifier', prop(issue, 'id'))
  print(
    tObject('issue', {
      id,
      title: prop(issue, 'title'),
      state: prop(issue, 'state.name', prop(issue, 'state')),
      assignee: prop(issue, 'assignee.name', prop(issue, 'assignee')),
      priority: prop(issue, 'priority'),
      project: prop(issue, 'project.name', prop(issue, 'project')),
      url: prop(issue, 'url'),
    }),
  )
  print(
    `description:\n  ${truncate(issue.description, flags.full).replaceAll('\n', '\n  ')}\n`,
  )
  if (!flags.full && issue.description?.length > DETAIL_LIMIT) {
    print(
      tHelp([
        `Run \`node scripts/linear-axi.mjs issues view ${id} --full\` for full text`,
      ]),
    )
  }
}

function renderMutation(key, data) {
  const item = Array.isArray(data) ? data[0] : data
  if (!item || typeof item !== 'object') return print(`${key}: ok\n`)
  print(
    tObject(key, {
      id: prop(item, 'identifier', prop(item, 'id')),
      title: prop(item, 'title'),
      state: prop(item, 'state.name', prop(item, 'state')),
      url: prop(item, 'url'),
    }),
  )
}

function renderComments(data, flags) {
  const comments = asArray(data)
  if (!comments.length) return print('comments: 0 found\n')
  print(
    tList(
      'comments',
      ['id', 'author', 'body'],
      comments.map((comment) => [
        prop(comment, 'id'),
        prop(comment, 'user.name', prop(comment, 'author.name')),
        truncate(comment.body ?? comment.text, flags.full).replaceAll(
          '\n',
          ' ',
        ),
      ]),
      data?.totalCount,
    ),
  )
}

function renderTeams(data) {
  const teams = asArray(data)
  if (!teams.length) return print('teams: 0 found\n')
  print(
    tList(
      'teams',
      ['key', 'name', 'id'],
      teams.map((team) => [
        prop(team, 'key'),
        prop(team, 'name'),
        prop(team, 'id'),
      ]),
      data?.totalCount,
    ),
  )
}

function renderProjects(data) {
  const projects = asArray(data)
  if (!projects.length) return print('projects: 0 found\n')
  print(
    tList(
      'projects',
      ['name', 'state', 'lead', 'id'],
      projects.map((project) => [
        prop(project, 'name'),
        prop(project, 'state'),
        prop(project, 'lead.name', prop(project, 'lead')),
        prop(project, 'id'),
      ]),
      data?.totalCount,
    ),
  )
}

function renderStatuses(data) {
  const statuses = asArray(data)
  if (!statuses.length) return print('statuses: 0 found\n')
  print(
    tList(
      'statuses',
      ['name', 'type', 'id'],
      statuses.map((status) => [
        prop(status, 'name'),
        prop(status, 'type'),
        prop(status, 'id'),
      ]),
      data?.totalCount,
    ),
  )
}

function renderRaw(data) {
  if (Array.isArray(data)) {
    return print(
      tList(
        'rows',
        ['json'],
        data.map((row) => [JSON.stringify(row)]),
      ),
    )
  }
  if (data && typeof data === 'object')
    return print(tObject('result', flattenObject(data)))
  print(tScalar('result', data))
}

function flattenObject(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      typeof value === 'object' && value !== null
        ? JSON.stringify(value)
        : value,
    ]),
  )
}

function printHelp() {
  print(`linear-axi - AXI wrapper around linear-cli

Usage:
  node scripts/linear-axi.mjs
  node scripts/linear-axi.mjs issues list [--mine] [--team TEAM] [--state STATE]
  node scripts/linear-axi.mjs issues view <id> [--comments] [--full]
  node scripts/linear-axi.mjs issues create "Title" --team TEAM [--dry-run]
  node scripts/linear-axi.mjs issues update <id> --state Done
  node scripts/linear-axi.mjs comments list <issue-id>
  node scripts/linear-axi.mjs comments create <issue-id> --body "Markdown"
  node scripts/linear-axi.mjs teams list
  node scripts/linear-axi.mjs projects list
  node scripts/linear-axi.mjs statuses list --team TEAM
  node scripts/linear-axi.mjs search issues "query"
  node scripts/linear-axi.mjs done
  node scripts/linear-axi.mjs raw -- <linear-cli args...>

Output:
  TOON on stdout. Errors are structured on stdout.

Dependency:
  linear-cli must be installed and authenticated.
`)
}

function cmdHome() {
  print(
    tObject('linear_axi', {
      bin: homePath(SCRIPT_PATH),
      description: DESCRIPTION,
    }),
  )
  try {
    const context = runLinear(['context'])
    renderMutation('branch_issue', context)
  } catch (error) {
    print(tObject('branch_issue', { status: 'none', detail: error.message }))
  }
  const mine = runLinear(['issues', 'list', '--mine', '--limit', DEFAULT_LIMIT])
  renderIssuesList(mine)
  print(
    tHelp([
      'Run `node scripts/linear-axi.mjs issues view <id>` for full issue detail',
      'Run `node scripts/linear-axi.mjs issues create "Title" --team <team> --dry-run` to preview creation',
    ]),
  )
}

function commandDef(noun, verb) {
  return COMMANDS[noun]?.[verb]
}

function requireArg(value, name, scope) {
  if (!value) {
    die(
      `${name} is required`,
      'USAGE_ERROR',
      [`Run \`node scripts/linear-axi.mjs ${scope} --help\``],
      2,
    )
  }
}

function dispatch(positional, flags) {
  const [noun, verb, first, ...rest] = positional
  if (!noun || noun === 'home') return cmdHome()
  if (noun === 'help' || flags.help || flags.h) return printHelp()
  if (noun === 'done') return renderMutation('issue', runLinear(['done']))
  if (noun === 'raw') return renderRaw(runLinear(positional.slice(1)))

  const allowed = commandDef(noun, verb)
  if (!allowed) {
    die(
      `unknown command ${[noun, verb].filter(Boolean).join(' ')}`,
      'USAGE_ERROR',
      [
        'Run `node scripts/linear-axi.mjs --help` for supported commands',
        'Use `node scripts/linear-axi.mjs raw -- <linear-cli args...>` for unsupported commands',
      ],
      2,
    )
  }
  validateFlags(`${noun} ${verb}`, flags, allowed)
  if (flags.help || flags.h) return printHelp()

  if (noun === 'issues' && verb === 'list') {
    return renderIssuesList(runLinear(issueListArgs(flags)))
  }
  if (noun === 'issues' && verb === 'view') {
    requireArg(first, '<id>', 'issues view')
    return renderIssueDetail(
      runLinear(
        [
          'issues',
          'get',
          first,
          flags.comments && '--comments',
          flags.history && '--history',
        ].filter(Boolean),
      ),
      flags,
    )
  }
  if (noun === 'issues' && verb === 'create') {
    requireArg(first, '<title>', 'issues create')
    return renderMutation('issue', runLinear(issueCreateArgs(first, flags)))
  }
  if (noun === 'issues' && verb === 'update') {
    requireArg(first, '<id>', 'issues update')
    return renderMutation('issue', runLinear(issueUpdateArgs(first, flags)))
  }
  if (noun === 'comments' && verb === 'list') {
    requireArg(first, '<issue-id>', 'comments list')
    return renderComments(runLinear(['comments', 'list', first]), flags)
  }
  if (noun === 'comments' && verb === 'create') {
    requireArg(first, '<issue-id>', 'comments create')
    const body = readTextFlag(flags, 'body', 'body-file')
    requireArg(body, '--body', 'comments create')
    return renderMutation(
      'comment',
      runLinear(
        [
          'comments',
          'create',
          first,
          '--body',
          body,
          flags['parent-id'] && '--parent-id',
          flags['parent-id'],
        ].filter(Boolean),
      ),
    )
  }
  if (noun === 'teams' && verb === 'list') {
    return renderTeams(
      runLinear(['teams', 'list', '--limit', flags.limit ?? DEFAULT_LIMIT]),
    )
  }
  if (noun === 'projects' && verb === 'list') {
    return renderProjects(
      runLinear(
        [
          'projects',
          'list',
          '--limit',
          flags.limit ?? DEFAULT_LIMIT,
          flags.archived && '--archived',
        ].filter(Boolean),
      ),
    )
  }
  if (noun === 'statuses' && verb === 'list') {
    requireArg(flags.team, '--team', 'statuses list')
    return renderStatuses(runLinear(['statuses', 'list', '--team', flags.team]))
  }
  if (noun === 'search' && verb === 'issues') {
    requireArg(first, '<query>', 'search issues')
    return renderIssuesList(
      runLinear([
        'search',
        'issues',
        first,
        '--limit',
        flags.limit ?? DEFAULT_LIMIT,
      ]),
    )
  }
}

function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2))
  if (flags.version) return print('linear-axi 0.1.0\n')
  if (flags.help || flags.h) return printHelp()
  if (
    flags['description-file'] &&
    !existsSync(String(flags['description-file']))
  ) {
    die(
      `description file not found: ${flags['description-file']}`,
      'USAGE_ERROR',
      [],
      2,
    )
  }
  if (flags['body-file'] && !existsSync(String(flags['body-file']))) {
    die(`body file not found: ${flags['body-file']}`, 'USAGE_ERROR', [], 2)
  }
  try {
    dispatch(positional, flags)
  } catch (error) {
    die(
      error.message,
      error.code || 'ERROR',
      error.hints || [],
      error.code === 'USAGE_ERROR' ? 2 : 1,
    )
  }
}

main()

#!/usr/bin/env node

import { getChangedFiles } from './quality-files.mjs'
import {
  detectNotionSyncTargets,
  formatNotionSyncReport,
} from './notion-check.domain.mjs'

function parseArgs(argv) {
  const json = argv.includes('--json')
  const explicitFiles = argv.filter((arg) => arg !== '--json')
  return { explicitFiles, json }
}

const { explicitFiles, json } = parseArgs(process.argv.slice(2))
const files = explicitFiles.length > 0 ? explicitFiles : getChangedFiles()
const matches = detectNotionSyncTargets(files)

if (json) {
  console.log(JSON.stringify({ files, matches }, null, 2))
} else {
  console.log(formatNotionSyncReport(matches))
}

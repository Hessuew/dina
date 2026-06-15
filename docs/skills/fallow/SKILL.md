---
name: fallow
description: >
  Run Fallow codebase analysis to detect dead code, duplication, complexity,
  and architectural issues. Use when user says:
    - "fallow"
    - "run fallow"
    - "codebase analysis"
    - "find dead code"
    - "check for duplication"
    - "audit changes"
---

# Fallow Codebase Analysis

## Overview

This skill runs Fallow's static analysis engine to provide structured, deterministic evidence about codebase quality.

It analyzes:

- Dead code (unused files, exports, dependencies)
- Duplication (clone families and repeated patterns)
- Complexity (functions above complexity thresholds)
- Architecture (circular dependencies, boundary violations)
- Dependency hygiene (unused deps, unresolved imports)
- Changed-code risk (PR-focused audit)

Fallow produces machine-readable JSON output with actionable findings and auto-fixable actions.

---

## Usage

Run `fallow audit --format json` to analyze changed code against a base branch (default: main).

Optional flags:

- `--base <branch>` - Compare against specific branch (default: main)
- `--format json` - Output structured JSON for AI parsing
- `--quiet` - Suppress human-readable output

`audit` is **scoped to changed files**. For whole-repo cleanup, use the full-repo scans:

- `fallow dupes --format json` - widespread duplication across the entire repo.
- `fallow dead-code --format json --quiet` - full dead-code plus `circular_dependencies`.

---

## Analysis Categories

### Dead Code

- Unused dependencies (production and dev/optional)
- Unused files
- Unused exports and types
- Unused enum and class members
- Stale suppression comments

### Duplication

- Clone families touching changed files
- Repeated implementation patterns
- Four detection modes from exact to semantic clones

### Complexity

- Functions above complexity thresholds
- Changed functions that increased complexity
- Risk hotspots (complexity + churn + coupling)

### Architecture

- Circular dependencies
- Boundary violations across layers/modules
- Re-export chains
- Dependency graph issues

### Dependency Hygiene

- Unused dependencies
- Unresolved imports
- Duplicate exports
- Unlisted imports
- Type-only production deps
- Test-only production deps

---

## JSON Output Structure

Fallow's `--format json` output includes:

```json
{
  "verdict": "pass|warn|fail",
  "summary": {
    "changedFiles": number,
    "findings": {
      "deadCode": number,
      "duplication": number,
      "complexity": number,
      "architecture": number,
      "dependencyHygiene": number
    }
  },
  "findings": [
    {
      "type": "deadCode|duplication|complexity|architecture|dependencyHygiene",
      "severity": "error|warning|info",
      "file": string,
      "message": string,
      "evidence": string,
      "actions": [
        {
          "type": string,
          "description": string,
          "auto_fixable": boolean
        }
      ]
    }
  ]
}
```

### `fallow dupes --format json`

Full-repo duplication scan. Use this (not `audit`) to find widespread copy-paste:

```json
{
  "kind": "dupes",
  "clone_groups": [
    {
      "instances": [
        {
          "file": string,
          "start_line": number,
          "end_line": number,
          "start_col": number,
          "end_col": number,
          "fragment": string
        }
      ]
    }
  ],
  "clone_families": [ /* clone_groups grouped by shared origin */ ],
  "stats": {
    "files_with_clones": number,
    "clone_groups": number,
    "clone_groups_below_min_occurrences": number
  }
}
```

`clone_groups` only lists groups at/above `duplicates.minOccurrences` in
`.fallowrc.json` (currently **3** — pair-only clones are hidden). The count of hidden
groups is in `stats.clone_groups_below_min_occurrences`. Pass `--min-occurrences 2` (or
lower the config) to surface every duplicate pair. Each `clone_groups[].instances[]`
entry gives the `file` and `start_line`/`end_line` span to deduplicate.

---

## Execution Steps

1. **Run Fallow audit**

   ```bash
   bunx fallow audit --format json --base main
   ```

   `audit` only covers changed files. When the ask is "find all duplication" or "clean
   up circular dependencies" (not just changed-file risk), also run the full-repo scans:
   - **Find widespread duplication (full repo)**

     ```bash
     bunx fallow dupes --format json
     ```

     Inspect `clone_groups[].instances` for the `file` and `start_line`/`end_line` spans
     to deduplicate; check `stats.clone_groups_below_min_occurrences` to know how many
     pair-only clones are hidden by `minOccurrences` (add `--min-occurrences 2` to show
     them).

   - **Find circular dependencies (full repo)**

     ```bash
     bunx fallow dead-code --format json --quiet
     ```

     Inspect the top-level `circular_dependencies` array. `audit --base main` can report
     zero architecture findings while these still exist, because `audit` is scoped to
     changed files.

2. **Parse JSON output**
   - Extract verdict (pass/warn/fail)
   - Categorize findings by type
   - Identify auto-fixable actions

3. **Present structured results**
   - Group findings by category
   - Highlight severity levels
   - List auto-fixable actions with `auto_fixable: true`
   - Provide file references for each finding

4. **Suggest next steps**
   - Prioritize high-severity findings
   - Recommend safe manual fixes; only suggest `fallow fix` previews
   - Identify manual review requirements

---

## Output Format

### Summary

- Verdict (pass/warn/fail)
- Changed files count
- Findings breakdown by category

### Findings by Category

#### 🔴 Dead Code (X issues)

- Unused dependencies
- Unused exports
- Unused files
- [Auto-fixable: Y actions]

#### 🟠 Duplication (X issues)

- Clone families
- Repeated patterns
- [Auto-fixable: Y actions]

#### 🟡 Complexity (X issues)

- Functions above threshold
- Increased complexity
- [Auto-fixable: Y actions]

#### 🔵 Architecture (X issues)

- Circular dependencies
- Boundary violations
- [Auto-fixable: Y actions]

#### 🟢 Dependency Hygiene (X issues)

- Unused dependencies
- Unresolved imports
- [Auto-fixable: Y actions]

### Auto-Fixable Actions

List actions with `auto_fixable: true` that can be safely applied:

- Action type and description
- File and symbol affected
- Recommended command (e.g., `fallow fix --dry-run`)

---

## Integration Notes

- Fallow is deterministic and does not use AI for analysis
- All findings are traceable to specific files and symbols
- The `actions` array provides machine-actionable next steps
- Use `import type { CheckOutput } from "fallow/types"` for TypeScript parsing
- Run `fallow fix --dry-run --format json` to preview auto-fixes before applying

---

## Safety

- Always use `--dry-run` before applying fixes
- Do not run non-dry-run `fallow fix` for dead-code exports in this repo. Its export-stripping fix can leave unused local declarations (`noUnusedLocals` / TS6133) and break barrel re-exports.
- Review auto-fixable actions in context
- For unused exports, either delete the full dead declaration and any now-dead barrel re-export, or preserve the export with `.fallowrc.json` `ignoreExports` when it is part of a public/test-alias contract.
- Before acting on dead-code findings, inspect `tsconfig.json`, `vite.config.ts`, and Vitest configs for path aliases. Exact test aliases such as `@/db` and `@/env` can make exports live even when Fallow reports them unused.
- After deleting a thin wrapper, rerun Fallow and TypeScript. Wrapper removal can orphan its schema/service chain, so dead-code cleanup must converge through repeat scans.
- Some findings may require manual review (e.g., complex duplication)
- Fallow respects suppression comments for intentional exceptions

#!/usr/bin/env bash
# Shared skill self-improvement hook for Claude Code + Windsurf/Cascade.
#
# Reads the hook's JSON payload from stdin and delegates to skill-improve-log.py.
# When a skill or tool call reports an error, an [auto] "fix" proposal is appended
# to docs/improvements/IMPROVEMENTS_SKILLS.md. When a skill was invoked, a one-line reminder is
# printed so the agent logs any qualitative improvement ([model]) it noticed.
# Qualitative judgment is never auto-written — only proposed.
# See docs/improvements/IMPROVEMENTS_PROTOCOL.md.
#
# Wired from:
#   Claude Code  .claude/settings.json   -> PostToolUse matcher "Skill"
#   Windsurf     .windsurf/hooks.json     -> post_run_command / post_mcp_tool_use / post_cascade_response
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$DIR/.." && pwd)"

exec python3 "$DIR/skill-improve-log.py" "$REPO_ROOT/docs/improvements/IMPROVEMENTS_SKILLS.md"

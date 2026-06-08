#!/usr/bin/env python3
"""Skill self-improvement hook logic (shared by Claude Code + Windsurf/Cascade).

Reads a hook JSON payload on stdin. argv[1] is the path to IMPROVEMENTS.md.
When a skill/tool call reports an error, appends an [auto] "fix" proposal.
When a skill was invoked, prints a one-line reminder so the agent logs any
qualitative improvement ([model]) it noticed. Qualitative judgment is never
auto-written. See docs/skills/SELF_IMPROVEMENT.md.
"""
import sys
import json
import datetime


def has_err(x):
    if isinstance(x, dict):
        if x.get("error") or x.get("is_error") or x.get("isError"):
            return True
        return any(has_err(v) for v in x.values())
    if isinstance(x, list):
        return any(has_err(v) for v in x)
    if isinstance(x, str):
        return x.strip().lower().startswith("error")
    return False


def main():
    log = sys.argv[1]
    try:
        d = json.loads(sys.stdin.read())
    except Exception:
        return  # not JSON / empty payload -> nothing to do

    # Skill / tool / command name across Claude + Windsurf payload shapes (best-effort).
    ti = d.get("tool_input") or {}
    skill = (ti.get("skill") or ti.get("command") or ti.get("name")
             or d.get("command") or d.get("tool_name") or "")

    exit_code = d.get("exit_code")
    errored = (has_err(d.get("tool_response")) or has_err(d.get("output"))
               or (isinstance(exit_code, int) and exit_code != 0))

    if errored:
        name = skill or "unknown"
        date = datetime.date.today().isoformat()
        entry = (f"- [{date}] {name} · type: fix · observation: tool/skill reported "
                 f"an error during run · suggestion: review the skill's steps and tool "
                 f"usage · [auto]\n")
        with open(log, "a", encoding="utf-8") as f:
            f.write(entry)

    # Nudge only when a skill actually ran (keeps it from firing on every turn).
    if skill:
        print(f"[skill: {skill}] Per docs/skills/SELF_IMPROVEMENT.md, if you hit an error, "
              f"a better approach, or a missing feature/new skill, append a proposal to "
              f"docs/skills/IMPROVEMENTS.md (do not edit the skill in-session).")


if __name__ == "__main__":
    main()

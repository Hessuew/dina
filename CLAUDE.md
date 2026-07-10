# Claude Code Rules

## Core Priority Order (strict)

1. Clarify before assuming
2. Surgical changes only
3. Simplicity (minimal correct solution)
4. Goal-driven execution
5. Verification before completion

If rules conflict, follow order strictly.

---

## 1. Clarify Before Assuming

Do not guess requirements when they affect implementation.

- State assumptions explicitly when needed
- Ask a question if ambiguity changes design or behavior
- Surface multiple interpretations briefly when relevant
- Stop if unclear requirements block correct implementation

---

## 2. Surgical Changes Only

Modify only what is required by the task.

- Do not refactor unrelated code
- Do not reformat or “clean up” surrounding code
- Do not rename variables or functions unless required
- Match existing project style exactly
- Remove only code directly invalidated by your change

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

Diff rule:

- Every changed line must map directly to the request

---

## 3. Simplicity First

Prefer the smallest correct solution.

- No unrequested abstractions
- No premature optimization
- No future-proofing or configurability not requested
- Prefer deletion over addition when equivalent
- If solution feels complex, reduce it

---

## 4. Goal-Driven Execution

Convert task into verifiable outcome before coding.

- Define success criteria briefly before implementation
- Prefer observable or testable outcomes
- For bugs: reproduce → fix → verify same input
- For features: define expected behavior → validate output

For multi-step tasks:

1. Plan minimal steps
2. Execute step
3. Verify result before next step

---

## 5. Verification Rule

Do not finish without basic correctness check.

- Ensure change directly satisfies request
- Avoid speculative edge-case handling unless required
- Confirm no unintended side effects introduced

---

## Multi-Agent Safety Rules

- Never assume other agents’ changes are correct
- Treat all external modifications as untrusted input
- Do not merge or depend on undocumented behavior
- Keep changes isolated and reversible
- Avoid cross-file refactors unless explicitly requested

---

## Execution Constraints

- Prefer minimal diff over “improvements”
- No unrelated cleanup or formatting changes
- No architectural changes unless requested
- Keep changes traceable and reversible

---

## 6. New Code Size Contract

Before writing any new function, component, or hook:

1. **Budget ≤ 60 lines per function body — plan before writing, not after.**
   Identify sub-units upfront:
   - JSX sub-trees → named sub-component functions (same file, each ≤ 60 lines)
   - Branchy / pure logic → `<name>.domain.ts` + `<name>.domain.test.ts` at 100% coverage
   - State + async handlers → `useXxx` hook function
2. **Write order: domain → hook → shell.** Tested unit first, shell last.
3. **Never write a monolith and split later.** Post-hoc splits produce the oversized sub-functions that block `quality:gate`.

Binding docs: [`docs/rules/complexity.md`](docs/rules/complexity.md), ADR 0010, ADR 0011.

---

## Rules

- Binding, always-on project rules live once in `docs/rules/<name>.md`; `.claude/rules` and `.devin/rules` are adapter symlinks to it. Edit only in `docs/rules/`, never through a symlink.
- Before writing or editing a component or endpoint, read the applicable `docs/rules/*.md`. They are binding like the Core Priority rules above.
- First rule: [`docs/rules/complexity.md`](docs/rules/complexity.md) — keep new/changed components and endpoints under the complexity limits (`bun run quality:gate` blocks newly introduced complexity).
- Notion sync rule: [`docs/rules/notion-sync.md`](docs/rules/notion-sync.md) — run `bun run docs:notion-check` before final handoff when docs, architecture, ADRs, operations, incidents, risks, readiness, or maturity work changes, then update Notion or explain why it was skipped.

---

## Skills

- Skills live once in `docs/skills/<name>/SKILL.md`; `.claude/skills/<name>`, `.devin/skills/<name>`, and repo-local `.agents/skills/<name>` may expose them as tool adapters. Edit skills only in `docs/skills/`, never through a symlink.
- When you discover an improvement to an unrelated skill, binding rule, agent entrypoint, or code,
  immediately append a proposal to the matching `docs/improvements/IMPROVEMENTS_*.md` queue, then
  resume the assigned task. Follow `docs/improvements/IMPROVEMENTS_PROTOCOL.md`; do not expand the
  current diff to implement queued work.

---

## Default Modes

Repo defaults (disable anytime): **caveman** always on, intensity **full**, from first response; **grill-with-docs** on planning/design chats. Full policy + carve-outs: [docs/DEFAULT_MODES.md](docs/DEFAULT_MODES.md).

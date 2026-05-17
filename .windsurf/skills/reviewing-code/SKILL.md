---
name: reviewing-code
description: >
  Perform a high-signal code review focused on correctness, maintainability,
  performance, operational reliability, and TypeScript safety.
  Use when user says:
    - "code review"
    - "review this"
    - "review changes"
    - "stack review"
    - "review current stack"
---

# High-Signal Stack Code Review

## Overview

This skill performs a senior-engineer-grade review.

It is optimized for:
- high-signal feedback
- low-token usage
- production-relevant findings only

The goal is to identify issues in:
- correctness
- maintainability
- performance
- operational reliability
- TypeScript safety

Speculation, theory, and architectural redesign are out of scope.

---

## Review Rules

- Act as a senior engineer performing a production code review.
- Only report high-confidence, production-relevant issues.
- Prefer simple fixes over theoretical improvements.
- Avoid speculative, architectural, or abstraction-based suggestions.
- Avoid style comments unless they affect readability or correctness.
- Do not suggest increasing complexity unless required for a concrete issue.

### Signal Prioritization

- Prioritize correctness, reliability, and maintainability risks.
- Prefer fewer, high-confidence findings over broad coverage.
- Maximize signal-to-noise ratio.

### Output Discipline

- Be concise and actionable.
- Avoid repetition and filler explanation.
- Do not include praise or generic commentary.
- Focus on issues that would block or meaningfully delay a senior engineer review.

---

# Review Scope

Understand the change — read the files or diff to understand what the code is supposed to do. Identify the scope (new feature, bug fix, refactor).


---

# Review Areas

## 1. Correctness

Check for:
- broken logic
- incorrect assumptions
- missing edge case handling
- null/undefined unsafe access
- off-by-one errors
- accidental mutation
- silent failure paths
- improper async handling
- race conditions
- missing cancellation or timeout handling
- missing failure isolation for critical UI paths

Focus only on realistic production-impacting issues.

---

## 2. Maintainability

Check for:
- unnecessary complexity
- deeply nested logic
- duplication creating maintenance burden
- misleading naming
- unclear control flow
- oversized functions/components
- hidden side effects

Do NOT suggest abstractions unless:
- duplication already exists
- the current structure creates a concrete maintenance problem

---

## 3. Performance

Check for:
- accidental O(n²) behavior
- N+1 queries
- unnecessary rerenders
- expensive work inside loops/render paths
- missing pagination/virtualization on large datasets
- missing database indexes for frequent query paths
- unnecessary memoization complexity

Avoid speculative micro-optimizations.

---

## 4. TypeScript Safety

Check for:
- unsafe `any`
- dangerous type assertions
- non-exhaustive union handling
- missing return types on important public APIs
- unsafe nullable assumptions
- weakened type narrowing

Do NOT recommend excessive type-system complexity.

---

## 5. Operational Reliability

Check for:
- missing error handling
- swallowed exceptions
- unsafe retries
- fragile assumptions
- logging gaps that hurt debugging
- invalid state transitions
- missing cleanup/disposal behavior

---

## 6. Security

Check for:
- missing validation
- unsafe SQL construction
- auth/permission bypass risks
- secret/token leakage
- unsafe HTML rendering
- insecure trust of client input

Only report concrete, credible risks.

---

## 7. Testing

Check whether:
- critical paths are covered
- error cases are tested
- async flows are tested safely
- tests appear brittle or tightly coupled
- new logic lacks meaningful coverage
- hidden shared mutable test state

Do NOT require tests for trivial changes.

---

# Senior Engineer Filtering Rules

Only report an issue if ALL conditions are true:

- It represents a real risk in production (correctness, reliability, performance, security, or maintainability)
- It is concrete and directly observable in the diff
- It would reasonably be raised in a senior engineer code review
- It is not speculative, theoretical, or stylistic-only
- The proposed fix is simpler than or justified by the current implementation

If any condition is NOT met → do not report the issue.

---

# Severity Rules

Severity reflects production impact and urgency.

## 🔴 90–100 (Critical)
- Production-breaking correctness issue
- Security vulnerability
- Data loss or corruption risk
- Severe operational failure

## 🟠 75–89 (High)
- Should be fixed before merge
- Impacts correctness, reliability, performance, or maintainability in a meaningful way
- Could cause production bugs or significant tech debt

## 🟡 50–74 (Low)
- Nice-to-have improvement
- Does not block merge
- Minor maintainability or readability gain

## Below 50
- Do not report

---

## Reporting Threshold

Only include issues with severity ≥50 unless explicitly requested otherwise.

---

# Output Format

## Summary

- Brief assessment of overall code quality in the diff
- Mention only meaningful risks
- Keep concise and non-repetitive

---

## Findings

Each issue is a structured review card.

---

### 🔴 [95] Missing async cancellation in polling hook

**File**
[`apps/mobile/src/hooks/useDevicePolling.ts`](apps/mobile/src/hooks/useDevicePolling.ts)

**Evidence**
- async polling loop continues after component unmount

**Why it matters**
Can cause memory leaks or stale state updates due to unresolved async execution after lifecycle end.

**Fix**
Add cleanup guard (AbortController or mounted flag) to cancel or ignore in-flight async work on unmount.

---

## File Linking Rule

Always link file paths using markdown links when possible:

`[relative/path/to/file](relative/path/to/file)`

Do not include line numbers unless explicitly supported by tooling.

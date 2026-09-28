import { describe, expect, it } from 'vitest'

import {
  analyzeMigration,
  checkMigrationSafety,
} from './migration-safety.domain.mjs'

describe('analyzeMigration', () => {
  it('classifies additive migrations as expand work', () => {
    expect(
      analyzeMigration(
        'ALTER TABLE "courses" ADD COLUMN "summary" text;--> statement-breakpoint\nCREATE INDEX "courses_summary_idx" ON "courses" ("summary");',
      ),
    ).toMatchObject({ phases: ['expand'], statementCount: 2 })
  })

  it('does not treat trigger function bodies as backfills', () => {
    expect(
      analyzeMigration(
        'CREATE OR REPLACE FUNCTION public.guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.role IS DISTINCT FROM OLD.role THEN UPDATE profiles SET role = OLD.role; END IF; RETURN NEW; END; $$;',
      ).phases,
    ).toEqual(['expand'])
  })

  it('detects destructive SQL between two dollar-quoted bodies', () => {
    expect(
      analyzeMigration(
        'CREATE FUNCTION a() RETURNS void LANGUAGE plpgsql AS $$ BEGIN RAISE NOTICE 1; END; $$; DROP TABLE users; CREATE FUNCTION b() RETURNS void LANGUAGE plpgsql AS $$ BEGIN RAISE NOTICE 2; END; $$;',
      ).phases,
    ).toEqual(['expand', 'contract'])
  })

  it('ignores nested dollar-quoted tags inside function bodies', () => {
    expect(
      analyzeMigration(
        'CREATE OR REPLACE FUNCTION public.guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN EXECUTE $cmd$ SELECT 1 $cmd$; UPDATE profiles SET role = OLD.role; RETURN NEW; END; $$;',
      ).phases,
    ).toEqual(['expand'])
  })

  it('ignores phase keywords inside string literals', () => {
    expect(
      analyzeMigration(
        "INSERT INTO logs (message) VALUES ('DROP TABLE users');",
      ).phases,
    ).toEqual(['backfill'])
  })
})

describe('checkMigrationSafety', () => {
  it('rejects expand and backfill in one migration', () => {
    const result = checkMigrationSafety(
      'drizzle/0060_add_summary.sql',
      'ALTER TABLE courses ADD COLUMN summary text;--> statement-breakpoint\nUPDATE courses SET summary = title;',
    )
    expect(result.errors[0]).toContain('split expand, backfill, and contract')
  })

  it('rejects non-null column additions', () => {
    const result = checkMigrationSafety(
      'drizzle/0060_add_summary.sql',
      'ALTER TABLE courses ADD COLUMN summary text NOT NULL;',
    )
    expect(result.errors).toEqual([
      'drizzle/0060_add_summary.sql: add new columns nullable first; backfill and enforce NOT NULL in later migrations',
    ])
  })

  it('requires an explicit marker for contract work', () => {
    expect(
      checkMigrationSafety(
        'drizzle/0061_drop_summary.sql',
        'ALTER TABLE courses DROP COLUMN summary;',
      ).errors[0],
    ).toContain("'-- safe-delivery: contract'")
  })

  it('allows enforce-phase NOT NULL without the contract marker', () => {
    expect(
      checkMigrationSafety(
        'drizzle/0062_enforce_summary.sql',
        'ALTER TABLE courses ALTER COLUMN summary SET NOT NULL;',
      ).errors,
    ).toEqual([])
  })

  it('requires the contract marker for dropped functions', () => {
    expect(
      checkMigrationSafety(
        'drizzle/0063_drop_guard.sql',
        'DROP FUNCTION public.guard();',
      ).errors[0],
    ).toContain("'-- safe-delivery: contract'")
  })

  it('allows a separately marked contract migration', () => {
    expect(
      checkMigrationSafety(
        'drizzle/0061_drop_summary.sql',
        '-- safe-delivery: contract\nALTER TABLE courses DROP COLUMN summary;',
      ).errors,
    ).toEqual([])
  })
})

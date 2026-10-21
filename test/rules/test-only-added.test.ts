import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/test-only-added.js';
import { check, context } from './helpers.js';

describe('test-only-added', () => {
  it('detects example 1', async () => {
    expect(
      (await check(rule, '', 'it.only("works", () => {})')).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (await check(rule, '', 'fdescribe("api", () => {})')).length,
    ).toBeGreaterThan(0);
  });
  it('ignores example 1', async () => {
    expect((await check(rule, '', 'const only = true;')).length).toBe(0);
  });
  it('ignores example 2', async () => {
    expect(
      (await check(rule, '', 'describe("only admins", () => {})')).length,
    ).toBe(0);
  });
  it('localizes findings', async () => {
    const ctx = context('', 'it.only("works", () => {})');
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
  it('does not report unchanged context lines', async () => {
    const ctx = context('', 'it.only("works", () => {})');
    for (const hunk of ctx.file.hunks)
      for (const line of hunk.lines) line.type = 'ctx';
    expect(await rule.check(ctx)).toEqual([]);
  });
});

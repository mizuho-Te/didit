import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/test-skip-added.js';
import { check, context } from './helpers.js';

describe('test-skip-added', () => {
  it('detects example 1', async () => {
    expect(
      (await check(rule, '', 'it.skip("discount cap", () => {})')).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (await check(rule, '', 'xdescribe("cart", () => {})')).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 3', async () => {
    expect(
      (await check(rule, '', 'test.todo("refund")')).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 4', async () => {
    expect(
      (await check(rule, '', 'test.skipIf(condition)("slow", () => {})'))
        .length,
    ).toBeGreaterThan(0);
  });
  it('ignores example 1', async () => {
    expect(
      (await check(rule, '', 'it("skip button works", () => {})')).length,
    ).toBe(0);
  });
  it('ignores example 2', async () => {
    expect((await check(rule, '', 'foo.skip()')).length).toBe(0);
  });
  it('ignores example 3', async () => {
    expect(
      (await check(rule, '', 'it.skip("a")', { isTestFile: false })).length,
    ).toBe(0);
  });
  it('localizes findings', async () => {
    const ctx = context('', 'it.skip("discount cap", () => {})');
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
  it('does not report unchanged context lines', async () => {
    const ctx = context('', 'it.skip("discount cap", () => {})');
    for (const hunk of ctx.file.hunks)
      for (const line of hunk.lines) line.type = 'ctx';
    expect(await rule.check(ctx)).toEqual([]);
  });
});

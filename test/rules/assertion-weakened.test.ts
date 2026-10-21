import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/assertion-weakened.js';
import { check, context } from './helpers.js';

describe('assertion-weakened', () => {
  it('detects example 1', async () => {
    expect(
      (
        await check(
          rule,
          'expect(total).toBe(900)',
          'expect(total).toBeDefined()',
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (await check(rule, 'expect(fn).toThrow(Error)', 'expect(fn).toThrow()'))
        .length,
    ).toBeGreaterThan(0);
  });
  it('detects example 3', async () => {
    expect(
      (
        await check(
          rule,
          'expect(fn).toHaveBeenCalledWith(1)',
          'expect(fn).toHaveBeenCalled()',
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it('ignores example 1', async () => {
    expect(
      (await check(rule, 'expect(a).toBe(1)', 'expect(a).toBe(2)')).length,
    ).toBe(0);
  });
  it('ignores example 2', async () => {
    expect(
      (await check(rule, 'expect(a).toBeTruthy()', 'expect(a).toBe(1)')).length,
    ).toBe(0);
  });
  it('ignores example 3', async () => {
    expect(
      (await check(rule, 'expect(fn).toThrow()', 'expect(fn).toThrow()'))
        .length,
    ).toBe(0);
  });
  it('localizes findings', async () => {
    const ctx = context(
      'expect(total).toBe(900)',
      'expect(total).toBeDefined()',
    );
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
  it('does not report unchanged context lines', async () => {
    const ctx = context(
      'expect(total).toBe(900)',
      'expect(total).toBeDefined()',
    );
    for (const hunk of ctx.file.hunks)
      for (const line of hunk.lines) line.type = 'ctx';
    expect(await rule.check(ctx)).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/expected-value-changed.js';
import { check, context } from './helpers.js';

describe('expected-value-changed', () => {
  it('detects example 1', async () => {
    expect(
      (await check(rule, 'expect(a).toBe(1)', 'expect(a).toBe(2)')).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (
        await check(
          rule,
          'expect(fn).toHaveBeenCalledWith({a: fn(1)}, ")")',
          'expect(fn).toHaveBeenCalledWith({a: fn(2)}, ")")',
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it('ignores example 1', async () => {
    expect(
      (await check(rule, 'expect(a).toBe(1)', 'expect(b).toBe(2)')).length,
    ).toBe(0);
  });
  it('ignores example 2', async () => {
    expect(
      (await check(rule, 'expect(a).toBe(1)', 'expect(a).toEqual(1)')).length,
    ).toBe(0);
  });
  it('ignores example 3', async () => {
    expect(
      (await check(rule, 'expect(a).toBe(1)', 'expect(a).toBe(1)')).length,
    ).toBe(0);
  });
  it('localizes findings', async () => {
    const ctx = context('expect(a).toBe(1)', 'expect(a).toBe(2)');
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
  it('does not report unchanged context lines', async () => {
    const ctx = context('expect(a).toBe(1)', 'expect(a).toBe(2)');
    for (const hunk of ctx.file.hunks)
      for (const line of hunk.lines) line.type = 'ctx';
    expect(await rule.check(ctx)).toEqual([]);
  });
});

it('handles escaped quotes and rejects unclosed arguments', async () => {
  expect(
    await check(rule, 'expect(a).toBe("a\\"b")', 'expect(a).toBe("c\\"d")'),
  ).toHaveLength(1);
  expect(await check(rule, 'expect(a).toBe(', 'expect(a).toBe(2')).toEqual([]);
  expect(await check(rule, 'const value = 1', 'const value = 2')).toEqual([]);
});

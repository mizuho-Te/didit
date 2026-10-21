import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/test-file-deleted.js';
import { check, context } from './helpers.js';

describe('test-file-deleted', () => {
  it('detects example 1', async () => {
    expect(
      (await check(rule, 'it("a")', '', { status: 'deleted' })).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (
        await check(rule, 'test("b")', '', {
          status: 'deleted',
          language: 'js',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('ignores example 1', async () => {
    expect(
      (await check(rule, 'it("a")', 'it("a")', { status: 'renamed' })).length,
    ).toBe(0);
  });
  it('ignores example 2', async () => {
    expect(
      (
        await check(rule, 'const a = 1', '', {
          status: 'deleted',
          isTestFile: false,
        })
      ).length,
    ).toBe(0);
  });
  it('localizes findings', async () => {
    const ctx = context('it("a")', '', { status: 'deleted' });
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
});

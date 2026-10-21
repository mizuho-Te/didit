import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/test-case-removed.js';
import { check, context } from './helpers.js';

describe('test-case-removed', () => {
  it('detects example 1', async () => {
    expect(
      (await check(rule, 'it("a"); it("b")', 'it("a")')).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (await check(rule, 'test.concurrent("a"); test("b")', 'test("b")'))
        .length,
    ).toBeGreaterThan(0);
  });
  it('ignores example 1', async () => {
    expect((await check(rule, 'it("a")', 'it("renamed")')).length).toBe(0);
  });
  it('ignores example 2', async () => {
    expect(
      (await check(rule, 'it("a")', 'it.each([1, 2])("a %s")')).length,
    ).toBe(0);
  });
  it('ignores example 3', async () => {
    expect(
      (await check(rule, 'test.concurrent("a")', 'test.sequential("a")'))
        .length,
    ).toBe(0);
  });
  it('localizes findings', async () => {
    const ctx = context('it("a"); it("b")', 'it("a")');
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
});

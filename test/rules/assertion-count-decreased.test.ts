import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/assertion-count-decreased.js';
import { check, context } from './helpers.js';

describe('assertion-count-decreased', () => {
  it('detects example 1', async () => {
    expect(
      (
        await check(
          rule,
          'it("a"); expect(x).toBe(1); expect(y).toBe(2)',
          'it("a"); expect(x).toBe(1)',
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (
        await check(
          rule,
          'test("a"); assert.equal(x,1); assert(x)',
          'test("a"); assert(x)',
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it('ignores example 1', async () => {
    expect(
      (
        await check(
          rule,
          'it("a"); expect(x).toBe(1)',
          'it("a"); expect(x).toBe(2)',
        )
      ).length,
    ).toBe(0);
  });
  it('ignores example 2', async () => {
    expect((await check(rule, 'it("a"); expect(x).toBe(1)', '')).length).toBe(
      0,
    );
  });
  it('localizes findings', async () => {
    const ctx = context(
      'it("a"); expect(x).toBe(1); expect(y).toBe(2)',
      'it("a"); expect(x).toBe(1)',
    );
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
});

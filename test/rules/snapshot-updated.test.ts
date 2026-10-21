import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/snapshot-updated.js';
import { check, context } from './helpers.js';

describe('snapshot-updated', () => {
  it('detects example 1', async () => {
    expect(
      (await check(rule, 'old', 'new', { path: 'foo.snap' })).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (
        await check(rule, '', 'snapshot', {
          path: '__snapshots__/foo.txt',
          status: 'added',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('ignores example 1', async () => {
    expect(
      (await check(rule, 'old', 'new', { path: 'snapshot.ts' })).length,
    ).toBe(0);
  });
  it('ignores example 2', async () => {
    expect(
      (await check(rule, '', '', { path: 'foo.snap', status: 'renamed' }))
        .length,
    ).toBe(0);
  });
  it('localizes findings', async () => {
    const ctx = context('old', 'new', { path: 'foo.snap' });
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
});

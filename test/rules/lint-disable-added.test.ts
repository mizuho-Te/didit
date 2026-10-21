import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/lint-disable-added.js';
import { check, context } from './helpers.js';

describe('lint-disable-added', () => {
  it('detects example 1', async () => {
    expect(
      (await check(rule, '', '// eslint-disable-next-line no-console')).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (
        await check(
          rule,
          '',
          '// biome-ignore lint/suspicious/noExplicitAny: SDK',
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 3', async () => {
    expect((await check(rule, '', '// oxlint-disable')).length).toBeGreaterThan(
      0,
    );
  });
  it('ignores example 1', async () => {
    expect((await check(rule, '', '// eslint-enable')).length).toBe(0);
  });
  it('ignores example 2', async () => {
    expect((await check(rule, '', 'const disable = false;')).length).toBe(0);
  });
  it('localizes findings', async () => {
    const ctx = context('', '// eslint-disable-next-line no-console');
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
  it('does not report unchanged context lines', async () => {
    const ctx = context('', '// eslint-disable-next-line no-console');
    for (const hunk of ctx.file.hunks)
      for (const line of hunk.lines) line.type = 'ctx';
    expect(await rule.check(ctx)).toEqual([]);
  });
});

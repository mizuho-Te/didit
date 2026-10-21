import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/any-added.js';
import { check, context } from './helpers.js';

describe('any-added', () => {
  it('detects example 1', async () => {
    expect(
      (await check(rule, '', 'const value: any = 1;')).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (await check(rule, '', 'const value = other as any;')).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 3', async () => {
    expect(
      (await check(rule, '', 'const value = <any>other;')).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 4', async () => {
    expect(
      (await check(rule, '', 'const values: any[] = [];')).length,
    ).toBeGreaterThan(0);
  });
  it('ignores example 1', async () => {
    expect((await check(rule, '', 'const value: unknown = 1;')).length).toBe(0);
  });
  it('ignores example 2', async () => {
    expect((await check(rule, '', 'const anyValue = 1;')).length).toBe(0);
  });
  it('ignores example 3', async () => {
    expect(
      (await check(rule, '', 'const value: any = 1;', { language: 'js' }))
        .length,
    ).toBe(0);
  });
  it('localizes findings', async () => {
    const ctx = context('', 'const value: any = 1;');
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
  it('does not report unchanged context lines', async () => {
    const ctx = context('', 'const value: any = 1;');
    for (const hunk of ctx.file.hunks)
      for (const line of hunk.lines) line.type = 'ctx';
    expect(await rule.check(ctx)).toEqual([]);
  });
});

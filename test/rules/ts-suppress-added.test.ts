import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/ts-suppress-added.js';
import { check, context } from './helpers.js';

describe('ts-suppress-added', () => {
  it('detects example 1', async () => {
    expect((await check(rule, '', '// @ts-ignore')).length).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (await check(rule, '', '/* @ts-expect-error */')).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 3', async () => {
    expect(
      (await check(rule, '', '// @ts-expect-error: upstream SDK bug')).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 4', async () => {
    expect((await check(rule, '', '// @ts-nocheck')).length).toBeGreaterThan(0);
  });
  it('ignores example 1', async () => {
    expect((await check(rule, '', '// ordinary comment')).length).toBe(0);
  });
  it('ignores example 2', async () => {
    expect((await check(rule, '', '// @ts-expectation')).length).toBe(0);
  });
  it('ignores example 3', async () => {
    expect(
      (await check(rule, '', '# type: ignore', { language: 'py' })).length,
    ).toBe(0);
  });
  it('localizes findings', async () => {
    const ctx = context('', '// @ts-ignore');
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
  it('does not report unchanged context lines', async () => {
    const ctx = context('', '// @ts-ignore');
    for (const hunk of ctx.file.hunks)
      for (const line of hunk.lines) line.type = 'ctx';
    expect(await rule.check(ctx)).toEqual([]);
  });
});

it('assigns low severity only to explanations of at least three characters', async () => {
  expect(
    (await check(rule, '', '// @ts-expect-error: SDK issue'))[0]?.severity,
  ).toBe('low');
  expect(
    (await check(rule, '', '/* @ts-expect-error ab */'))[0]?.severity,
  ).toBeUndefined();
  expect(
    (await check(rule, '', '// @ts-expect-error'))[0]?.severity,
  ).toBeUndefined();
});

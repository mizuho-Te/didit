import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/py-suppress-added.js';
import { check, context } from './helpers.js';

describe('py-suppress-added', () => {
  it('detects example 1', async () => {
    expect(
      (
        await check(rule, '', 'value = api() # type: ignore', {
          path: 'test_api.py',
          language: 'py',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (
        await check(rule, '', '# pyright: ignore', {
          path: 'test_api.py',
          language: 'py',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 3', async () => {
    expect(
      (
        await check(rule, '', '# pylint: disable=missing-docstring', {
          path: 'test_api.py',
          language: 'py',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 4', async () => {
    expect(
      (
        await check(rule, '', 'import x # noqa', {
          path: 'test_api.py',
          language: 'py',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('ignores example 1', async () => {
    expect(
      (
        await check(rule, '', '# noquality issue', {
          path: 'test_api.py',
          language: 'py',
        })
      ).length,
    ).toBe(0);
  });
  it('ignores example 2', async () => {
    expect(
      (
        await check(rule, '', 'value = 1', {
          path: 'test_api.py',
          language: 'py',
        })
      ).length,
    ).toBe(0);
  });
  it('ignores example 3', async () => {
    expect(
      (
        await check(rule, '', '// @ts-ignore', {
          path: 'test_api.py',
          language: 'py',
        })
      ).length,
    ).toBe(0);
  });
  it('localizes findings', async () => {
    const ctx = context('', 'value = api() # type: ignore', {
      path: 'test_api.py',
      language: 'py',
    });
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
});

it('assigns noqa low severity but keeps stronger suppressions at their default', async () => {
  expect(
    (await check(rule, '', 'import x # noqa', { language: 'py' }))[0]?.severity,
  ).toBe('low');
  expect(
    (
      await check(rule, '', 'value # type: ignore # noqa', { language: 'py' })
    )[0]?.severity,
  ).toBeUndefined();
});

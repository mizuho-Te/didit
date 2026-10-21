import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/coverage-threshold-lowered.js';
import { check, context } from './helpers.js';

describe('coverage-threshold-lowered', () => {
  it('detects example 1', async () => {
    expect(
      (
        await check(rule, 'lines: 90', 'lines: 80', {
          path: 'vitest.config.ts',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (
        await check(rule, '"statements": 95', '"statements": 75', {
          path: 'package.json',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 3', async () => {
    expect(
      (
        await check(
          rule,
          'addopts = "--cov-fail-under=90"',
          'addopts = "--cov-fail-under=50"',
          { path: 'pyproject.toml' },
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 4', async () => {
    expect(
      (
        await check(rule, 'target: "90.5%"', 'target: "80%"', {
          path: 'codecov.yml',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('ignores example 1', async () => {
    expect(
      (await check(rule, 'lines: 80', 'lines: 90', { path: 'jest.config.js' }))
        .length,
    ).toBe(0);
  });
  it('ignores example 2', async () => {
    expect(
      (
        await check(rule, 'lines: 90', 'branches: 80', {
          path: 'jest.config.js',
        })
      ).length,
    ).toBe(0);
  });
  it('ignores example 3', async () => {
    expect(
      (await check(rule, 'lines: 90', 'lines: 80', { path: 'ordinary.ts' }))
        .length,
    ).toBe(0);
  });
  it('localizes findings', async () => {
    const ctx = context('lines: 90', 'lines: 80', { path: 'vitest.config.ts' });
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
});

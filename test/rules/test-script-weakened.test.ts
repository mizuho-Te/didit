import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/test-script-weakened.js';
import { check, context } from './helpers.js';

describe('test-script-weakened', () => {
  it('detects example 1', async () => {
    expect(
      (
        await check(
          rule,
          '{"scripts":{"test":"vitest"}}',
          '{"scripts":{"test":"vitest --passWithNoTests"}}',
          { path: 'package.json' },
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (
        await check(
          rule,
          '{"scripts":{"test:unit":"vitest"}}',
          '{"scripts":{}}',
          { path: 'package.json' },
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 3', async () => {
    expect(
      (await check(rule, '', 'addopts = "-k fast"', { path: 'pyproject.toml' }))
        .length,
    ).toBeGreaterThan(0);
  });
  it('detects example 4', async () => {
    expect(
      (
        await check(rule, '{}', '{"scripts":{"test":"echo done"}}', {
          path: 'package.json',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('ignores example 1', async () => {
    expect(
      (
        await check(
          rule,
          '{"scripts":{"test":"vitest"}}',
          '{"scripts":{"test":"vitest --coverage"}}',
          { path: 'package.json' },
        )
      ).length,
    ).toBe(0);
  });
  it('ignores example 2', async () => {
    expect(
      (
        await check(
          rule,
          '{"scripts":{"build":"tsc"}}',
          '{"scripts":{"build":"echo done"}}',
          { path: 'package.json' },
        )
      ).length,
    ).toBe(0);
  });
  it('ignores example 3', async () => {
    expect(
      (
        await check(rule, '', 'addopts = "--strict-markers"', {
          path: 'pytest.ini',
        })
      ).length,
    ).toBe(0);
  });
  it('ignores example 4', async () => {
    expect(
      (
        await check(
          rule,
          '{"scripts":{"test":"vitest || true"}}',
          '{"scripts":{"test":"vitest || true"}}',
          { path: 'package.json' },
        )
      ).length,
    ).toBe(0);
  });
  it('localizes findings', async () => {
    const ctx = context(
      '{"scripts":{"test":"vitest"}}',
      '{"scripts":{"test":"vitest --passWithNoTests"}}',
      { path: 'package.json' },
    );
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
});

import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/test-env-branch-added.js';
import { check, context } from './helpers.js';

describe('test-env-branch-added', () => {
  it('detects example 1', async () => {
    expect(
      (
        await check(
          rule,
          '',
          'if (process.env.NODE_ENV === "test") return 0;',
          { path: 'src/api.ts', isTestFile: false },
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (
        await check(rule, '', 'if (import.meta.env.VITEST) return fake;', {
          path: 'src/api.js',
          language: 'js',
          isTestFile: false,
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 3', async () => {
    expect(
      (
        await check(rule, '', 'if "pytest" in sys.modules:', {
          path: 'app.py',
          language: 'py',
          isTestFile: false,
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('ignores example 1', async () => {
    expect(
      (
        await check(
          rule,
          '',
          'if (process.env.NODE_ENV === "production") return 0;',
          { isTestFile: false },
        )
      ).length,
    ).toBe(0);
  });
  it('ignores example 2', async () => {
    expect(
      (
        await check(rule, '', 'if (process.env.VITEST) run();', {
          path: 'vitest.config.ts',
          isTestFile: false,
        })
      ).length,
    ).toBe(0);
  });
  it('ignores example 3', async () => {
    expect(
      (
        await check(rule, '', 'if (process.env.VITEST) run();', {
          isTestFile: true,
        })
      ).length,
    ).toBe(0);
  });
  it('ignores example 4', async () => {
    expect(
      (
        await check(rule, '', 'PYTEST_CURRENT_TEST', {
          path: 'conftest.py',
          language: 'py',
          isTestFile: false,
        })
      ).length,
    ).toBe(0);
  });
  it('localizes findings', async () => {
    const ctx = context('', 'if (process.env.NODE_ENV === "test") return 0;', {
      path: 'src/api.ts',
      isTestFile: false,
    });
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
});

import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/py-test-skip-added.js';
import { check, context } from './helpers.js';

describe('py-test-skip-added', () => {
  it('detects example 1', async () => {
    expect(
      (
        await check(rule, '', '@pytest.mark.skip(reason="flaky")', {
          path: 'test_api.py',
          language: 'py',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (
        await check(rule, '', '@pytest.mark.xfail', {
          path: 'test_api.py',
          language: 'py',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 3', async () => {
    expect(
      (
        await check(rule, '', '@unittest.expectedFailure', {
          path: 'test_api.py',
          language: 'py',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 4', async () => {
    expect(
      (
        await check(rule, '', 'self.skipTest("flaky")', {
          path: 'test_api.py',
          language: 'py',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('ignores example 1', async () => {
    expect(
      (
        await check(rule, '', 'def test_skip_button():', {
          path: 'test_api.py',
          language: 'py',
        })
      ).length,
    ).toBe(0);
  });
  it('ignores example 2', async () => {
    expect(
      (
        await check(rule, '', '# @pytest.mark.skip', {
          path: 'test_api.py',
          language: 'py',
        })
      ).length,
    ).toBe(0);
  });
  it('ignores example 3', async () => {
    expect(
      (
        await check(rule, '', '@pytest.mark.skip', {
          language: 'py',
          isTestFile: false,
        })
      ).length,
    ).toBe(0);
  });
  it('localizes findings', async () => {
    const ctx = context('', '@pytest.mark.skip(reason="flaky")', {
      path: 'test_api.py',
      language: 'py',
    });
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
});

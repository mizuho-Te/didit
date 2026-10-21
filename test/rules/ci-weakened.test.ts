import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/ci-weakened.js';
import { check, context } from './helpers.js';

describe('ci-weakened', () => {
  it('detects example 1', async () => {
    expect(
      (
        await check(rule, '', 'continue-on-error: true', {
          path: '.github/workflows/ci.yml',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (
        await check(rule, 'run: npm test', '', {
          path: '.github/workflows/ci.yaml',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 3', async () => {
    expect(
      (
        await check(rule, '', 'if: ${{ false }}', {
          path: '.github/workflows/ci.yml',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 4', async () => {
    expect(
      (
        await check(rule, 'name: CI', '', {
          path: '.github/workflows/ci.yml',
          status: 'deleted',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 5', async () => {
    expect(
      (
        await check(rule, '', 'run: npm test || true', {
          path: '.github/workflows/ci.yml',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('ignores example 1', async () => {
    expect(
      (
        await check(rule, 'run: npm test', 'run: npm test', {
          path: '.github/workflows/ci.yml',
        })
      ).length,
    ).toBe(0);
  });
  it('ignores example 2', async () => {
    expect(
      (
        await check(rule, '', 'continue-on-error: false', {
          path: '.github/workflows/ci.yml',
        })
      ).length,
    ).toBe(0);
  });
  it('ignores example 3', async () => {
    expect(
      (
        await check(rule, 'run: npm build', '', {
          path: '.github/workflows/ci.yml',
        })
      ).length,
    ).toBe(0);
  });
  it('ignores example 4', async () => {
    expect(
      (await check(rule, '', 'if: false', { path: 'some.yaml' })).length,
    ).toBe(0);
  });
  it('localizes findings', async () => {
    const ctx = context('', 'continue-on-error: true', {
      path: '.github/workflows/ci.yml',
    });
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
});

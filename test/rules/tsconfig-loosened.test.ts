import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/tsconfig-loosened.js';
import { check, context } from './helpers.js';

describe('tsconfig-loosened', () => {
  it('detects example 1', async () => {
    expect(
      (
        await check(
          rule,
          '{"compilerOptions":{"strict":true}}',
          '{"compilerOptions":{"strict":false}}',
          { path: 'tsconfig.json' },
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (
        await check(rule, '{"compilerOptions":{"noImplicitAny":true}}', '{}', {
          path: 'nested/tsconfig.build.json',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 3', async () => {
    expect(
      (
        await check(rule, '{}', '{"compilerOptions":{"skipLibCheck":true}}', {
          path: 'tsconfig.json',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('ignores example 1', async () => {
    expect(
      (
        await check(
          rule,
          '{"compilerOptions":{"strict":false}}',
          '{"compilerOptions":{"strict":true}}',
          { path: 'tsconfig.json' },
        )
      ).length,
    ).toBe(0);
  });
  it('ignores example 2', async () => {
    expect(
      (
        await check(
          rule,
          '{"compilerOptions":{"strict":true}}',
          '{"compilerOptions":{"strict":true}}',
          { path: 'tsconfig.json' },
        )
      ).length,
    ).toBe(0);
  });
  it('ignores example 3', async () => {
    expect(
      (
        await check(rule, '{"compilerOptions":{"checkJs":true}}', '{}', {
          path: 'tsconfig.json',
        })
      ).length,
    ).toBe(0);
  });
  it('localizes findings', async () => {
    const ctx = context(
      '{"compilerOptions":{"strict":true}}',
      '{"compilerOptions":{"strict":false}}',
      { path: 'tsconfig.json' },
    );
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
});

it('reads JSONC and keeps skipLibCheck at low severity', async () => {
  const findings = await check(
    rule,
    '{/* comment */"compilerOptions":{"checkJs":true,},}',
    '{"compilerOptions":{"checkJs":false,"skipLibCheck":true}}',
    { path: 'tsconfig.json' },
  );
  expect(
    findings.find((item) => item.message.endsWith('checkJs')),
  ).toBeDefined();
  expect(
    findings.find((item) => item.message.endsWith('skipLibCheck'))?.severity,
  ).toBe('low');
});
it('reports malformed JSON to the central error boundary rather than silently skipping', async () => {
  await expect(
    check(rule, '{}', '{"compilerOptions":', { path: 'tsconfig.json' }),
  ).rejects.toThrow(SyntaxError);
  await expect(
    check(rule, '{}', '{"compilerOptions":[]}', { path: 'tsconfig.json' }),
  ).rejects.toThrow();
});

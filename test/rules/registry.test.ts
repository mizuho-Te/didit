import { describe, expect, it, vi } from 'vitest';
import { rules, runRules } from '../../src/rules/index.js';
import { context } from './helpers.js';

describe('registry', () => {
  it('contains distinct documented rules', () => {
    expect(new Set(rules.map((rule) => rule.id)).size).toBe(20);
    for (const rule of rules) {
      expect(rule.meta.docsAnchor).toContain(rule.id);
      expect(rule.meta.description.en).not.toBe('');
      expect(rule.meta.description.ja).not.toBe('');
    }
  });
  it('combines defaults, per-item severity, and explicit overrides', async () => {
    const ctx = context('', '// @ts-expect-error: SDK compatibility');
    expect(
      (await runRules(ctx)).find((item) => item.ruleId === 'ts-suppress-added')
        ?.severity,
    ).toBe('low');
    expect(
      (await runRules(ctx, { 'ts-suppress-added': 'high' })).find(
        (item) => item.ruleId === 'ts-suppress-added',
      )?.severity,
    ).toBe('high');
    expect(await runRules(ctx, { 'ts-suppress-added': 'off' })).toEqual([]);
    expect((await runRules(context('', 'it.skip("a")')))[0]?.severity).toBe(
      'high',
    );
  });
  it('ignores binary files', async () => {
    expect(
      await runRules(context('', 'it.skip("a")', { isBinary: true })),
    ).toEqual([]);
  });
  it('continues after rule failures when a reporter is provided', async () => {
    const ctx = context('', '// @ts-ignore');
    const error = new Error('Cannot read base');
    ctx.getBaseContent = () => Promise.reject(error);
    const report = vi.fn();
    expect(
      (await runRules(ctx, {}, report)).some(
        (item) => item.ruleId === 'ts-suppress-added',
      ),
    ).toBe(true);
    expect(report).toHaveBeenCalledWith('test-case-removed', error);
    expect(report).toHaveBeenCalledWith('assertion-count-decreased', error);
  });
  it('does not silently consume errors without a reporter', async () => {
    const ctx = context('', '');
    ctx.getBaseContent = () => Promise.reject(new Error('Cannot read base'));
    await expect(runRules(ctx)).rejects.toThrow('Cannot read base');
  });
});

it('cannot turn off the mandatory didit configuration finding', async () => {
  const findings = await runRules(
    context('{}', '{"rules":{"didit-config-changed":"off"}}', {
      path: '.didit.json',
      language: 'json',
      isTestFile: false,
    }),
    { 'didit-config-changed': 'off' },
  );
  expect(findings.some((item) => item.ruleId === 'didit-config-changed')).toBe(
    true,
  );
});

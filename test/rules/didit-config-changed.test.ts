import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/didit-config-changed.js';
import { check, context } from './helpers.js';

describe('didit-config-changed', () => {
  it('detects example 1', async () => {
    expect(
      (
        await check(rule, '{}', '{"rules":{"any-added":"off"}}', {
          path: '.didit.json',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (
        await check(
          rule,
          '{}',
          '{"failOn":"none","ignore":[{"rule":"any-added","path":"**","reason":"legacy"}]}',
          { path: '.didit.json', status: 'added' },
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 3', async () => {
    expect(
      (
        await check(rule, '{"failOn":"high"}', '{}', {
          path: '.didit.json',
          status: 'deleted',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('ignores example 1', async () => {
    expect(
      (await check(rule, '{}', '{}', { path: 'package.json' })).length,
    ).toBe(0);
  });
  it('ignores example 2', async () => {
    expect(
      (await check(rule, '{}', '{}', { path: 'nested/.didit.json' })).length,
    ).toBe(0);
  });
  it('localizes findings', async () => {
    const ctx = context('{}', '{"rules":{"any-added":"off"}}', {
      path: '.didit.json',
    });
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
});

it('always flags invalid configuration even when detail parsing fails', async () => {
  expect(
    (await check(rule, '{}', '{broken', { path: '.didit.json' }))[0]?.message,
  ).toContain('could not be parsed');
  expect(
    (await check(rule, '{}', '[]', { path: '.didit.json' }))[0]?.ruleId,
  ).toBe('didit-config-changed');
});
it('reports an untracked config and its newly weakened settings', async () => {
  const ctx = context(
    '',
    '{"rules":{"test-skip-added":"off"},"failOn":"none","ignore":[{"rule":"any-added","path":"**","reason":"legacy"}]}',
    { path: '.didit.json', status: 'added' },
  );
  ctx.getBaseContent = () => Promise.resolve(null);
  const result = await rule.check(ctx);
  expect(result[0]?.message).toContain('rules.test-skip-added: off');
  expect(result[0]?.message).toContain('failOn: high → none');
  expect(result[0]?.message).toContain('legacy');
});
it('does not describe existing disabled rules or ignores as new', async () => {
  const data =
    '{"rules":{"any-added":"off"},"failOn":"low","ignore":[{"reason":"legacy"}]}';
  const result = await check(rule, data, data, { path: '.didit.json' });
  expect(result[0]?.message).toBe('didit configuration changed: modified');
});
it('detects configuration renamed away from its protected path', async () => {
  expect(
    await check(rule, '{}', '{}', {
      path: 'hidden.json',
      oldPath: '.didit.json',
      status: 'renamed',
    }),
  ).toHaveLength(1);
});
it('flags metadata-only configuration without requesting skipped contents', async () => {
  const ctx = context('', '', {
    path: '.didit.json',
    contentOmitted: true,
    hunks: [],
  });
  ctx.getBaseContent = () => Promise.resolve(null);
  ctx.getCurrentContent = () => Promise.resolve(null);
  expect((await rule.check(ctx))[0]?.ruleId).toBe('didit-config-changed');
});

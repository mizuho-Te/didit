import { expect, it } from 'vitest';
import { collectRunFindings } from '../../src/run/findings.js';
import type { RunResult } from '../../src/rules/types.js';
function result(
  side: 'base' | 'current',
  total: number,
  skipped: number,
  exitCode: number | null = 0,
): RunResult {
  return {
    side,
    command: 'test',
    sha: 'abc',
    dirty: false,
    startedAt: new Date().toISOString(),
    durationMs: 1,
    exitCode,
    timedOut: false,
    parser: 'vitest',
    counts: { total, skipped, failed: 0, passed: total - skipped },
    logTail: '',
  };
}
it('reports all three regressions with localized messages', () => {
  const runs = {
    base: result('base', 10, 0),
    current: result('current', 8, 2, 1),
  };
  expect(collectRunFindings(runs, 'en').map((item) => item.ruleId)).toEqual([
    'run-tests-failing',
    'run-test-count-decreased',
    'run-skipped-increased',
  ]);
  expect(collectRunFindings(runs, 'ja')[0]?.message).toContain('失敗');
});
it('reports timeout and unknown failure codes', () => {
  const current = result('current', 1, 0);
  current.timedOut = true;
  expect(collectRunFindings({ current }, 'en')).toHaveLength(1);
  expect(
    collectRunFindings({ current: result('current', 1, 0, null) }, 'en'),
  ).toHaveLength(1);
});
it('does not invent comparisons for unknown counts or absent base', () => {
  const current = result('current', 10, 0);
  delete current.counts;
  expect(
    collectRunFindings({ current, base: result('base', 10, 0) }, 'en'),
  ).toEqual([]);
  expect(
    collectRunFindings({ current: result('current', 10, 0) }, 'en'),
  ).toEqual([]);
});
it('does not flag equal or improved counts and honors severity settings', () => {
  expect(
    collectRunFindings(
      { current: result('current', 11, 0), base: result('base', 10, 1) },
      'en',
    ),
  ).toEqual([]);
  expect(
    collectRunFindings(
      { current: result('current', 10, 1), base: result('base', 10, 1) },
      'en',
    ),
  ).toEqual([]);
  const runs = { current: result('current', 10, 0, 1) };
  expect(
    collectRunFindings(runs, 'en', { 'run-tests-failing': 'off' }),
  ).toEqual([]);
  expect(
    collectRunFindings(runs, 'en', { 'run-tests-failing': 'medium' })[0]
      ?.severity,
  ).toBe('medium');
});

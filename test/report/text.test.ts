import { describe, expect, it } from 'vitest';
import { renderText } from '../../src/report/text.js';
import type { Report } from '../../src/rules/types.js';

function report(): Report {
  return {
    schemaVersion: 1,
    tool: { name: 'didit', version: '0.1.0' },
    generatedAt: '2026-10-21T00:00:00.000Z',
    lang: 'en',
    range: {
      mode: 'worktree',
      base: { ref: 'HEAD', sha: 'abc' },
      current: { ref: 'working-tree', sha: 'abc', dirty: true },
    },
    summary: {
      filesChanged: 1,
      filesSkipped: 0,
      high: 1,
      medium: 0,
      low: 0,
      suppressed: 0,
      failOn: 'high',
      failed: true,
    },
    findings: [
      {
        ruleId: 'test-skip-added',
        severity: 'high',
        category: 'test-disabled',
        file: 'cart.test.ts',
        line: 1,
        side: 'added',
        message: 'Test was skipped',
        before: 'it("synthetic", testBody);',
        after: 'it.skip("synthetic", testBody);',
      },
    ],
    suppressionsAdded: [],
  };
}
describe('text report', () => {
  it('renders a stable colorless human report', () => {
    expect(renderText(report())).toMatchInlineSnapshot(`
      "didit — HEAD...working-tree (changed files: 1)

      high cart.test.ts:1 Test was skipped [test-skip-added]
        - it("synthetic", testBody);
        + it.skip("synthetic", testBody);

      Tests were not run.

      Result: high 1 / medium 0 / low 0 (suppressed 0; files skipped 0)
      Review every finding. If intentional, explain it with // didit-ok: reason.
      "
    `);
  });
  it('shows suppression reasons and added suppression inventory', () => {
    const value = report();
    const finding = value.findings[0];
    if (!finding) throw new Error('Missing fixture finding');
    finding.suppressed = {
      reason: 'Synthetic detector input',
      source: 'comment',
    };
    value.suppressionsAdded = [
      {
        file: 'cart.test.ts',
        line: 1,
        ruleId: 'test-skip-added',
        reason: 'Synthetic detector input',
      },
    ];
    expect(renderText(value)).toContain('Suppressions added in this change');
    expect(renderText(value)).toContain(
      '(suppressed: Synthetic detector input)',
    );
  });
  it('uses color only when explicitly requested', () => {
    expect(renderText(report(), false, true)).toContain(
      '\u001b[31mhigh\u001b[0m',
    );
    expect(renderText(report())).not.toContain('\u001b');
  });
  it('shows known and unknown test counts without inventing them', () => {
    const value = report();
    const run = {
      side: 'current' as const,
      command: 'synthetic',
      sha: 'abc',
      dirty: true,
      startedAt: '2026-10-21T00:00:00.000Z',
      durationMs: 1,
      exitCode: 0,
      timedOut: false,
      parser: 'none' as const,
      logTail: '',
    };
    value.runs = { current: run };
    expect(renderText(value)).toContain('current (abc+dirty) exit 0');
    value.runs.current = {
      ...run,
      parser: 'vitest',
      counts: { passed: 2, failed: 0, skipped: 1, total: 3 },
    };
    expect(renderText(value)).toContain('2 passed / 0 failed / 1 skipped');
  });
});

it('strips untrusted ANSI and OSC sequences before adding trusted severity colors', () => {
  const value = report();
  const finding = value.findings[0];
  if (!finding) throw new Error('Missing fixture finding');
  value.range.base.ref = '\u001b[2JHEAD';
  value.range.current.ref = '\u001b]0;malicious title\u0007working-tree';
  finding.file =
    '\u001b]8;;https://untrusted.invalid\u001b\\cart.test.ts\u001b]8;;\u001b\\';
  finding.message = '\u001b[32mTest was skipped\u001b[0m';
  finding.ruleId = 'test-skip-added\u001b[2J';
  finding.before = '\u001b]52;c;Y2xpcGJvYXJk\u0007before();';
  finding.after = '\u001b[1Aafter();\r\b\u007f\u001b';
  finding.suppressed = { reason: '\u001b[2Jreviewed', source: 'comment' };
  value.suppressionsAdded = [
    {
      file: '\u001b[2Jcart.test.ts',
      line: 1,
      ruleId: '\u001b[32mtest-skip-added',
      reason: '\u001b]0;injected\u0007reviewed',
    },
  ];
  const output = renderText(value, false, true);
  expect(output).toContain(
    '\u001b[31mhigh\u001b[0m cart.test.ts:1 Test was skipped [test-skip-added] (suppressed: reviewed)',
  );
  expect(output).toContain('  - before();\n  + after();');
  expect(output).toContain('  cart.test.ts:1 test-skip-added: reviewed');
  const withoutTrustedColors = output.replace(
    '\u001b[31mhigh\u001b[0m',
    'high',
  );
  expect(withoutTrustedColors).not.toContain('\u001b');
  expect(withoutTrustedColors).not.toContain('\u0007');
  expect(withoutTrustedColors).not.toContain('\r');
  expect(withoutTrustedColors).not.toContain('\b');
  expect(withoutTrustedColors).not.toContain('\u007f');
  expect(withoutTrustedColors).not.toContain('untrusted.invalid');
  expect(withoutTrustedColors).not.toContain('Y2xpcGJvYXJk');
  expect(renderText(value, false, false)).toBe(withoutTrustedColors);
});

it('sanitizes run commands and commit labels in color-enabled reports', () => {
  const value = report();
  value.runs = {
    current: {
      side: 'current',
      command: '\u001b]0;injected\u0007npm test',
      sha: '\u009b2Jabc',
      dirty: true,
      startedAt: '2026-10-21T00:00:00.000Z',
      durationMs: 1,
      exitCode: 0,
      timedOut: false,
      parser: 'none',
      logTail: '',
    },
  };
  const output = renderText(value, false, true);
  expect(output).toContain('Test execution: npm test');
  expect(output).toContain('current (abc+dirty) exit 0');
  expect(output.replace('\u001b[31mhigh\u001b[0m', 'high')).not.toContain(
    '\u001b',
  );
  expect(output).not.toContain('\u009b');
});

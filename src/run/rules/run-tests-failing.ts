import type { Report, Language, Finding } from '../../rules/types.js';
import { runMessages } from '../../i18n/run-messages.js';
export function testsFailing(
  runs: NonNullable<Report['runs']>,
  lang: Language,
): Finding[] {
  return runs.current.exitCode !== 0 || runs.current.timedOut
    ? [
        {
          ruleId: 'run-tests-failing',
          severity: 'high',
          category: 'run',
          side: 'run',
          message: runMessages(lang).failing(runs.current.exitCode),
        },
      ]
    : [];
}

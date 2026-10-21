import type { Report, Language, Finding } from '../../rules/types.js';
import { runMessages } from '../../i18n/run-messages.js';
export function testCountDecreased(
  runs: NonNullable<Report['runs']>,
  lang: Language,
): Finding[] {
  const before = runs.base?.counts;
  const after = runs.current.counts;
  return before && after && after.total < before.total
    ? [
        {
          ruleId: 'run-test-count-decreased',
          severity: 'high',
          category: 'run',
          side: 'run',
          message: runMessages(lang).decreased(before.total, after.total),
        },
      ]
    : [];
}

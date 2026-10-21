import type { Report, Language, Finding } from '../../rules/types.js';
import { runMessages } from '../../i18n/run-messages.js';
export function skippedIncreased(
  runs: NonNullable<Report['runs']>,
  lang: Language,
): Finding[] {
  const before = runs.base?.counts;
  const after = runs.current.counts;
  return before && after && after.skipped > before.skipped
    ? [
        {
          ruleId: 'run-skipped-increased',
          severity: 'high',
          category: 'run',
          side: 'run',
          message: runMessages(lang).skipped(before.skipped, after.skipped),
        },
      ]
    : [];
}

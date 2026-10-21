import type { Config } from '../config.js';
import type { Report, Language, Finding } from '../rules/types.js';
import { testsFailing } from './rules/run-tests-failing.js';
import { testCountDecreased } from './rules/run-test-count-decreased.js';
import { skippedIncreased } from './rules/run-skipped-increased.js';
export function collectRunFindings(
  runs: NonNullable<Report['runs']>,
  lang: Language,
  rules: Config['rules'] = {},
): Finding[] {
  return [testsFailing, testCountDecreased, skippedIncreased]
    .flatMap((check) => check(runs, lang))
    .flatMap((finding) => {
      const setting = Object.entries(rules).find(
        ([id]) => id === finding.ruleId,
      )?.[1];
      return setting === 'off'
        ? []
        : [{ ...finding, severity: setting ?? finding.severity }];
    });
}

export { runRuleMetadata } from '../i18n/run-messages.js';

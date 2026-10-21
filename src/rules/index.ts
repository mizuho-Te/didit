import rule12 from './py-test-skip-added.js';
import rule13 from './py-suppress-added.js';
import rule14 from './tsconfig-loosened.js';
import rule15 from './test-script-weakened.js';
import rule16 from './coverage-threshold-lowered.js';
import rule17 from './ci-weakened.js';
import rule18 from './test-env-branch-added.js';
import rule19 from './didit-config-changed.js';
import rule0 from './test-skip-added.js';
import rule1 from './test-only-added.js';
import rule2 from './test-file-deleted.js';
import rule3 from './test-case-removed.js';
import rule4 from './assertion-count-decreased.js';
import rule5 from './assertion-weakened.js';
import rule6 from './expected-value-changed.js';
import rule7 from './snapshot-updated.js';
import rule8 from './ts-suppress-added.js';
import rule9 from './any-added.js';
import rule10 from './lint-disable-added.js';
import rule11 from './empty-catch-added.js';
import type { Finding, Rule, RuleContext, Severity } from './types.js';
export const rules: readonly Rule[] = [
  rule0,
  rule1,
  rule2,
  rule3,
  rule4,
  rule5,
  rule6,
  rule7,
  rule8,
  rule9,
  rule10,
  rule11,
  rule12,
  rule13,
  rule14,
  rule15,
  rule16,
  rule17,
  rule18,
  rule19,
];
export async function runRules(
  ctx: RuleContext,
  overrides: Record<string, Severity | 'off'> = {},
  onError?: (ruleId: string, error: unknown) => void,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  if (ctx.file.isBinary) return findings;
  for (const rule of rules) {
    const configured = overrides[rule.id];
    const override =
      rule.id === 'didit-config-changed' && configured === 'off'
        ? undefined
        : configured;
    if (override === 'off' || !rule.appliesTo(ctx.file)) continue;
    try {
      for (const item of await rule.check(ctx))
        findings.push({
          ...item,
          severity: override ?? item.severity ?? rule.defaultSeverity,
        });
    } catch (error: unknown) {
      if (!onError) throw error;
      onError(rule.id, error);
    }
  }
  return findings;
}

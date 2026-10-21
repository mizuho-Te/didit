import { ruleMessages as en } from '../../i18n/en.js';
import { ruleMessages as ja } from '../../i18n/ja.js';
import type {
  Category,
  DiffLine,
  FileDiff,
  Rule,
  RuleContext,
  RuleFinding,
  Severity,
} from '../types.js';
export type RuleId = keyof typeof en;
const ruleNumbers: Record<RuleId, number> = {
  'py-test-skip-added': 3,
  'py-suppress-added': 13,
  'tsconfig-loosened': 14,
  'test-script-weakened': 15,
  'coverage-threshold-lowered': 16,
  'ci-weakened': 17,
  'test-env-branch-added': 19,
  'didit-config-changed': 20,

  'test-skip-added': 1,
  'test-only-added': 2,
  'test-file-deleted': 4,
  'test-case-removed': 5,
  'assertion-count-decreased': 6,
  'assertion-weakened': 7,
  'expected-value-changed': 8,
  'snapshot-updated': 9,
  'ts-suppress-added': 10,
  'any-added': 11,
  'lint-disable-added': 12,
  'empty-catch-added': 18,
};
export function message(
  id: RuleId,
  ctx: RuleContext,
  params: Record<string, string | number> = {},
): string {
  return (ctx.lang === 'ja' ? ja : en)[id].replace(
    /\{(\w+)\}/g,
    (token: string, key: string) => String(params[key] ?? token),
  );
}
export function finding(
  id: RuleId,
  category: Category,
  ctx: RuleContext,
  line?: DiffLine,
  params?: Record<string, string | number>,
): RuleFinding {
  return {
    ruleId: id,
    category,
    file: ctx.file.path,
    side: line ? (line.type === 'del' ? 'removed' : 'added') : 'file',
    message: message(id, ctx, params),
    ...(line?.newLine !== undefined
      ? { line: line.newLine }
      : line?.oldLine !== undefined
        ? { line: line.oldLine }
        : {}),
    ...(line
      ? line.type === 'del'
        ? { before: line.content }
        : { after: line.content }
      : {}),
  };
}
export function createRule(
  id: RuleId,
  defaultSeverity: Severity,
  category: Category,
  appliesTo: (file: FileDiff) => boolean,
  check: (ctx: RuleContext) => RuleFinding[] | Promise<RuleFinding[]>,
): Rule {
  return {
    id,
    defaultSeverity,
    category,
    appliesTo,
    check: (ctx) => Promise.resolve(check(ctx)),
    meta: {
      description: { en: en[id], ja: ja[id] },
      docsAnchor: `${String(ruleNumbers[id])}-${id}`,
    },
  };
}

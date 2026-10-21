import type {
  DiffLine,
  FileDiff,
  Rule,
  RuleContext,
} from '../../src/rules/types.js';
export function context(
  before: string,
  after: string,
  options: Partial<FileDiff> = {},
): RuleContext {
  const lines: DiffLine[] = [
    ...before
      .split('\n')
      .filter(Boolean)
      .map((content, index): DiffLine => ({
        type: 'del',
        content,
        oldLine: index + 1,
      })),
    ...after
      .split('\n')
      .filter(Boolean)
      .map((content, index): DiffLine => ({
        type: 'add',
        content,
        newLine: index + 1,
      })),
  ];
  return {
    file: {
      path: 'example.test.ts',
      status: 'modified',
      isBinary: false,
      language: 'ts',
      isTestFile: true,
      hunks: [{ oldStart: 1, newStart: 1, lines }],
      ...options,
    },
    getBaseContent: () => Promise.resolve(before),
    getCurrentContent: () => Promise.resolve(after),
    lang: 'en',
  };
}
export async function check(
  rule: Rule,
  before: string,
  after: string,
  options: Partial<FileDiff> = {},
) {
  const ctx = context(before, after, options);
  return rule.appliesTo(ctx.file) ? rule.check(ctx) : [];
}

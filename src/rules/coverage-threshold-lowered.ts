import { createRule, finding } from './lib/create.js';
import { pairLines } from './lib/pairing.js';
const keys = new Set([
  'lines',
  'branches',
  'functions',
  'statements',
  'fail_under',
  '--cov-fail-under',
  'target',
]);
function thresholds(line: string): Map<string, number> {
  const entries = [
    ...line.matchAll(
      /(['"]?)(--cov-fail-under|\w[\w-]*)\1\s*[:=]\s*['"]?(\d+(?:\.\d+)?)%?/g,
    ),
  ];
  return new Map(
    entries.flatMap((match) =>
      match[2] && match[3] && keys.has(match[2])
        ? [[match[2], Number(match[3])] as const]
        : [],
    ),
  );
}
export default createRule(
  'coverage-threshold-lowered',
  'medium',
  'config-weakened',
  (file) =>
    /(?:^|\/)(?:(?:vitest|jest)\.config\.[^/]+|package\.json|pyproject\.toml|\.coveragerc|setup\.cfg|codecov\.yml)$/.test(
      file.path,
    ),
  (ctx) =>
    pairLines(ctx.file, (before, after) =>
      [...thresholds(before)].some(
        ([key, value]) => (thresholds(after).get(key) ?? Infinity) < value,
      ),
    ).flatMap(({ before, after }) =>
      [...thresholds(before.content)].flatMap(([key, value]) => {
        const next = thresholds(after.content).get(key);
        return next !== undefined && next < value
          ? [
              {
                ...finding(
                  'coverage-threshold-lowered',
                  'config-weakened',
                  ctx,
                  after,
                  { key, before: value, after: next },
                ),
                before: before.content,
              },
            ]
          : [];
      }),
    ),
);

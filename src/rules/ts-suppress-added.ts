import { createRule, finding } from './lib/create.js';
import { addedLines, isJs } from './lib/patterns.js';
export default createRule(
  'ts-suppress-added',
  'medium',
  'suppression',
  isJs,
  (ctx) =>
    addedLines(ctx.file)
      .filter((line) =>
        /@ts-(?:ignore|nocheck|expect-error)\b/.test(line.content),
      )
      .map((line) => {
        const result = finding('ts-suppress-added', 'suppression', ctx, line);
        const explanation = /@ts-expect-error\b(.*)/
          .exec(line.content)?.[1]
          ?.replace(/\*\/\s*$/, '')
          .replace(/^\s*:\s*/, '')
          .trim();
        return explanation &&
          explanation.length >= 3 &&
          !/@ts-(?:ignore|nocheck)\b/.test(line.content)
          ? { ...result, severity: 'low' as const }
          : result;
      }),
);

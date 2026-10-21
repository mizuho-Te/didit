import { createRule, finding } from './lib/create.js';
import { addedLines } from './lib/patterns.js';
export default createRule(
  'py-suppress-added',
  'medium',
  'suppression',
  (file) => file.language === 'py',
  (ctx) =>
    addedLines(ctx.file)
      .filter((line) =>
        /#\s*(?:type:\s*ignore|pyright:\s*ignore|pylint:\s*disable|noqa\b)/.test(
          line.content,
        ),
      )
      .map((line) => ({
        ...finding('py-suppress-added', 'suppression', ctx, line),
        ...(/#\s*noqa\b/.test(line.content) &&
        !/#\s*(?:type:\s*ignore|pyright:\s*ignore|pylint:\s*disable)/.test(
          line.content,
        )
          ? { severity: 'low' as const }
          : {}),
      })),
);

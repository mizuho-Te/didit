import { createRule, finding } from './lib/create.js';
import { addedLines, isJs } from './lib/patterns.js';
export default createRule(
  'lint-disable-added',
  'medium',
  'suppression',
  isJs,
  (ctx) =>
    addedLines(ctx.file)
      .filter((line) =>
        /eslint-disable|biome-ignore|oxlint-disable/.test(line.content),
      )
      .map((line) => finding('lint-disable-added', 'suppression', ctx, line)),
);

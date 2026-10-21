import { createRule, finding } from './lib/create.js';
import { addedLines } from './lib/patterns.js';
export default createRule(
  'any-added',
  'low',
  'suppression',
  (file) => file.language === 'ts',
  (ctx) =>
    addedLines(ctx.file)
      .filter((line) =>
        /:\s*any\b|\bas\s+any\b|<any>|\bany\[\]/.test(line.content),
      )
      .map((line) => finding('any-added', 'suppression', ctx, line)),
);

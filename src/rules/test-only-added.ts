import { createRule, finding } from './lib/create.js';
import { addedLines, isJsTest } from './lib/patterns.js';
export default createRule(
  'test-only-added',
  'high',
  'test-disabled',
  isJsTest,
  (ctx) =>
    addedLines(ctx.file)
      .filter((line) =>
        /\b(?:it|test|describe|suite|context)\.only\b|\b(?:fit|fdescribe)\s*\(/.test(
          line.content,
        ),
      )
      .map((line) => finding('test-only-added', 'test-disabled', ctx, line)),
);

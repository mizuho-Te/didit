import { createRule, finding } from './lib/create.js';
import { addedLines, isJsTest } from './lib/patterns.js';
export default createRule(
  'test-skip-added',
  'high',
  'test-disabled',
  isJsTest,
  (ctx) =>
    addedLines(ctx.file)
      .filter((line) =>
        /\b(?:it|test|describe|suite|context)\.(?:skip|todo)\b|\b(?:it|test|describe)\.skipIf\s*\(|\b(?:xit|xtest|xdescribe)\s*\(/.test(
          line.content,
        ),
      )
      .map((line) => finding('test-skip-added', 'test-disabled', ctx, line)),
);

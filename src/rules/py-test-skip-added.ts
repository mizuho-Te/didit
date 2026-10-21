import { createRule, finding } from './lib/create.js';
import { addedLines } from './lib/patterns.js';
export default createRule(
  'py-test-skip-added',
  'high',
  'test-disabled',
  (file) => file.language === 'py' && file.isTestFile,
  (ctx) =>
    addedLines(ctx.file)
      .filter(
        (line) =>
          !/^\s*#/.test(line.content) &&
          /@pytest\.mark\.(?:skip|skipif|xfail)\b|\bpytest\.skip\s*\(|@unittest\.(?:skip|skipIf|skipUnless|expectedFailure)\b|\bself\.skipTest\s*\(/.test(
            line.content,
          ),
      )
      .map((line) => finding('py-test-skip-added', 'test-disabled', ctx, line)),
);

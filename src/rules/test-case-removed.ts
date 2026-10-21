import { createRule, finding } from './lib/create.js';
import { countTests } from './lib/count.js';
import { isCodeTest } from './lib/patterns.js';
export default createRule(
  'test-case-removed',
  'high',
  'test-removed',
  isCodeTest,
  async (ctx) => {
    const before = countTests(
      (await ctx.getBaseContent()) ?? '',
      ctx.file.language,
    );
    const after = countTests(
      (await ctx.getCurrentContent()) ?? '',
      ctx.file.language,
    );
    return after < before
      ? [
          finding('test-case-removed', 'test-removed', ctx, undefined, {
            before,
            after,
          }),
        ]
      : [];
  },
);

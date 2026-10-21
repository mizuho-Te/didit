import { createRule, finding } from './lib/create.js';
import { countAssertions, countTests } from './lib/count.js';
import { isCodeTest } from './lib/patterns.js';
export default createRule(
  'assertion-count-decreased',
  'high',
  'test-removed',
  isCodeTest,
  async (ctx) => {
    const base = (await ctx.getBaseContent()) ?? '';
    const current = (await ctx.getCurrentContent()) ?? '';
    if (
      countTests(current, ctx.file.language) <
      countTests(base, ctx.file.language)
    )
      return [];
    const before = countAssertions(base, ctx.file.language),
      after = countAssertions(current, ctx.file.language);
    return after < before
      ? [
          finding('assertion-count-decreased', 'test-removed', ctx, undefined, {
            before,
            after,
          }),
        ]
      : [];
  },
);

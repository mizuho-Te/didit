import { createRule, finding } from './lib/create.js';
import { jsonObject, objectValue } from './lib/json.js';
const strictOptions = [
  'strict',
  'noImplicitAny',
  'strictNullChecks',
  'noUncheckedIndexedAccess',
  'exactOptionalPropertyTypes',
  'noImplicitReturns',
];
export default createRule(
  'tsconfig-loosened',
  'medium',
  'config-weakened',
  (file) => /(?:^|\/)tsconfig[^/]*\.json$/.test(file.path),
  async (ctx) => {
    const before = objectValue(
      jsonObject(await ctx.getBaseContent()).compilerOptions,
    );
    const after = objectValue(
      jsonObject(await ctx.getCurrentContent()).compilerOptions,
    );
    const options = strictOptions.filter(
      (key) =>
        before[key] === true &&
        (after[key] === false || after[key] === undefined),
    );
    if (before.checkJs === true && after.checkJs === false)
      options.push('checkJs');
    if (
      (before.skipLibCheck === false || before.skipLibCheck === undefined) &&
      after.skipLibCheck === true
    )
      options.push('skipLibCheck');
    return options.map((option) => ({
      ...finding('tsconfig-loosened', 'config-weakened', ctx, undefined, {
        option,
      }),
      ...(option === 'skipLibCheck' ? { severity: 'low' as const } : {}),
    }));
  },
);
